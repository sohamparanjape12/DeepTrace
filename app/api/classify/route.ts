import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { classifyViolation } from '@/lib/classify.v2';
import { emitNotification } from '@/lib/notifications/emit';
import { severityToEventType } from '@/lib/notifications/taxonomy';

/**
 * Perform AI classification of a suspected violation using the v2 Forensic Pipeline.
 * Updates the violation document with adaptive multi-factor analysis and three-axis scoring.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      violationId,
      matchUrl,
      pageTitle,
      pageDescription,
      pagePublishedAt,
      assetRightsTier,
      ownerOrg,
      matchType,
      tags,
      originalAssetUrl,
      violationImageUrl,
      assetDescription,
      assetCaptureDate,
      assetFirstPublishUrl,
    } = body;

    if (!violationId) {
      return NextResponse.json({ error: 'Missing violationId' }, { status: 400 });
    }

    const result = await classifyViolation({
      violationId,
      matchUrl,
      pageTitle: pageTitle || '',
      pageDescription: pageDescription || '',
      pagePublishedAt,
      matchType,
      rightsTier: assetRightsTier,
      ownerOrg,
      tags: tags || [],
      originalAssetUrl,
      violationImageUrl,
      assetDescription,
      assetCaptureDate,
      assetFirstPublishUrl,
    });

    // Update Violation in Firestore — write BOTH legacy and v2 fields
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

      // legacy aliases (keep for existing UI/scripts)
      gemini_class:            result.classification,
      gemini_reasoning:        result.reasoning,
      visual_match_score:      result.visual_match_score,
      contextual_match_score:  result.contextual_match_score,
      commercial_signal:       result.commercial_signal,
      watermark_likely_removed: result.watermark_likely_removed,
      is_derivative_work:      result.is_derivative_work,
      
      updated_at: FieldValue.serverTimestamp(),
    });

    // Write audit log entry for v2 classification event
    await db.collection('audit_log').add({
      timestamp: FieldValue.serverTimestamp(),
      action_type: 'classification_v2',
      actor: 'system',
      violation_id: violationId,
      next_state: result.classification,
      reliability_score: result.reliability_score,
      abstain: result.abstained,
      contradiction_flag: result.contradiction_flag,
    });

    // Emit notification — fire-and-forget, must not block or throw
    const violationDoc = await db.collection('violations').doc(violationId).get();
    const violationData = violationDoc.data();
    void emitNotification({
      user_id: violationData?.owner_id,
      event_type: severityToEventType(result.severity),
      payload: {
        violation_id: violationId,
        asset_id: violationData?.asset_id,
        host_domain: new URL(body.matchUrl || 'https://unknown').hostname,
        reliability_score: result.reliability_score,
      },
      source_event_id: `violation:${violationId}`,
    });

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error('Classification v2 error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
