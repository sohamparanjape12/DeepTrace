import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { classifyViolation } from '@/lib/classify';

/**
 * Perform AI classification of a suspected violation using the Forensic Content Auditor.
 * Updates the violation document with analysis, severity, and forensic scores.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { violationId, matchUrl, pageTitle, pageDescription, assetRightsTier, ownerOrg, matchType, tags, originalAssetUrl, violationImageUrl, assetDescription } = body;

    if (!violationId) {
      return NextResponse.json({ error: 'Missing violationId' }, { status: 400 });
    }

    const classifyParams = {
      matchUrl,
      pageTitle: pageTitle || '',
      pageDescription: pageDescription || '',
      matchType,
      rightsTier: assetRightsTier,
      ownerOrg: ownerOrg,
      tags: tags || [],
      originalAssetUrl: originalAssetUrl || undefined,
      violationImageUrl: violationImageUrl || undefined,
      assetDescription: assetDescription || undefined,
    };

    const result = await classifyViolation(classifyParams);

    // Update Violation in Firestore with forensic results
    const violationRef = db.collection('violations').doc(violationId);

    await violationRef.update({
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

    // Write audit log entry for classification event
    await db.collection('audit_log').add({
      timestamp: FieldValue.serverTimestamp(),
      action_type: 'classification',
      actor: 'system',
      violation_id: violationId,
      next_state: result.classification,
    });

    return NextResponse.json({
      success: true,
      classification: result.classification,
      severity: result.severity,
      confidence: result.confidence,
      visual_match_score: result.visual_match_score,
      contextual_match_score: result.contextual_match_score,
      reasoning_steps: result.reasoning_steps,
      reasoning: result.reasoning,
      is_derivative_work: result.is_derivative_work,
      commercial_signal: result.commercial_signal,
    });
  } catch (error: any) {
    console.error('Classification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
