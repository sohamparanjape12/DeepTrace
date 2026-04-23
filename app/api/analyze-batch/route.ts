import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { classifyViolation } from '@/lib/classify';
import { v4 as uuidv4 } from 'uuid';

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
          
          // Save placeholder
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

          // Call classify
          const classifyParams = {
            matchUrl: match.link,
            pageTitle: match.title || '',
            pageDescription: match.source || '',
            matchType: 'visually_similar' as const,
            rightsTier: rightsTier || 'editorial',
            ownerOrg: ownerOrg || '',
            tags: selectedTags || [],
            originalAssetUrl: uploadedUrl,
            violationImageUrl: match.original || match.thumbnail,
            assetDescription: assetDescription || '',
          };

          const result = await classifyViolation(classifyParams);
          
          if (result.classification === 'UNAUTHORIZED') {
            hasViolations = true;
          }

          // Update Violation
          await db.collection('violations').doc(violationId).update({
            gemini_class: result.classification,
            gemini_reasoning: result.reasoning,
            severity: result.severity,
            confidence: result.confidence,
            commercial_signal: result.commercial_signal,
            watermark_likely_removed: result.watermark_likely_removed,
            visual_match_score: result.visual_match_score ?? null,
            contextual_match_score: result.contextual_match_score ?? null,
            reasoning_steps: result.reasoning_steps || [],
            is_derivative_work: result.is_derivative_work || false,
          });

          // Write audit log
          await db.collection('audit_log').add({
            timestamp: FieldValue.serverTimestamp(),
            action_type: 'classification',
            actor: 'system',
            violation_id: violationId,
            next_state: result.classification,
          });

        } catch (e) {
          console.error(`Error processing match ${match.link}:`, e);
        }
      }

      // Update asset scan_status
      await db.collection('assets').doc(assetId).update({
        scan_status: hasViolations ? 'violations_found' : 'clean'
      });
    });

    return NextResponse.json({ success: true, message: 'Analysis started in background' });
  } catch (error: any) {
    console.error('Batch analysis error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
