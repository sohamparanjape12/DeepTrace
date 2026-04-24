import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { classifyViolation } from '@/lib/classify.v2';
import { v4 as uuidv4 } from 'uuid';

/**
 * Trigger background batch forensic analysis.
 * Uses the v2 pipeline with adaptive weighting and reliability scoring.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      assetId, 
      userId,
      uploadedUrl, 
      rightsTier, 
      ownerOrg, 
      selectedTags, 
      assetDescription, 
      matchesToAnalyze 
    } = body;

    if (!assetId || !matchesToAnalyze || !Array.isArray(matchesToAnalyze)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    after(async () => {
      let hasViolations = false;
      
      for (const match of matchesToAnalyze) {
        try {
          const violationId = uuidv4();
          
          // Save initial placeholder
          await db.collection('violations').doc(violationId).set({
            violation_id: violationId,
            owner_id: userId,
            asset_id: assetId,
            detected_at: new Date().toISOString(),
            match_url: match.link,
            match_type: 'visually_similar',
            status: 'open',
            severity: 'LOW',
            gemini_class: 'NEEDS_REVIEW',
            page_context: match.title || '',
            assetThumbnailUrl: match.original || match.thumbnail || '',
          });

          // Perform v2 Classification
          const result = await classifyViolation({
            violationId,
            matchUrl: match.link,
            pageTitle: match.title || '',
            pageDescription: match.source || '',
            matchType: 'visually_similar',
            rightsTier: rightsTier || 'editorial',
            ownerOrg: ownerOrg || '',
            tags: selectedTags || [],
            originalAssetUrl: uploadedUrl,
            violationImageUrl: match.original || match.thumbnail,
            assetDescription: assetDescription || '',
          });
          
          if (result.classification === 'UNAUTHORIZED') {
            hasViolations = true;
          }

          // Update Violation with v2 results + legacy fields
          await db.collection('violations').doc(violationId).update({
            // v2 Fields
            classification_schema_version: 2,
            classification:         result.classification,
            severity:               result.severity,
            confidence:             result.confidence,
            relevancy:              result.relevancy,
            reliability_score:      result.reliability_score,
            reliability_tier:       result.reliability_tier,
            abstain:                result.abstained,
            contradiction_flag:     result.contradiction_flag,
            explainability_bullets: result.explainability_bullets,
            scores:                 result.scores,
            signals:                result.signals,
            evidence_quality:       result.evidence_quality,
            reasoning_steps:        result.reasoning_steps,
            recommended_action:     result.recommended_action,
            domain_class:           result.domain_class,
            applied_weights:        result.applied_weights,

            // legacy aliases (keep for existing UI)
            gemini_class:            result.classification,
            gemini_reasoning:        result.reasoning,
            visual_match_score:      result.visual_match_score,
            contextual_match_score:  result.contextual_match_score,
            commercial_signal:       result.commercial_signal,
            watermark_likely_removed: result.watermark_likely_removed,
            is_derivative_work:      result.is_derivative_work,
            
            updated_at: FieldValue.serverTimestamp(),
          });

          // Write v2 audit log
          await db.collection('audit_log').add({
            timestamp: FieldValue.serverTimestamp(),
            action_type: 'classification_v2',
            actor: 'system',
            violation_id: violationId,
            next_state: result.classification,
            reliability_score: result.reliability_score,
          });

        } catch (e) {
          console.error(`Error processing match ${match.link}:`, e);
        }
      }

      // Update asset scan_status based on findings
      await db.collection('assets').doc(assetId).update({
        scan_status: hasViolations ? 'violations_found' : 'clean',
        last_scan_at: FieldValue.serverTimestamp()
      });
    });

    return NextResponse.json({ success: true, message: 'Batch analysis started in background' });
  } catch (error: any) {
    console.error('Batch analysis error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
