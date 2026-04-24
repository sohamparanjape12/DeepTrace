import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getPHash, hammingDistance } from '@/lib/phash';
import { geminiRateLimit } from '@/lib/ratelimit';
import { classifyViolation } from '@/lib/classify.v2';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { assetId, uploadedUrl, rightsTier, ownerOrg, selectedTags, assetDescription } = payload;

    if (!assetId) {
      return NextResponse.json({ error: 'Missing assetId' }, { status: 400 });
    }

    console.log(`[Worker] Processing asset: ${assetId}`);

    // 1. Fetch asset
    const assetRef = db.collection('assets').doc(assetId);
    const assetSnap = await assetRef.get();
    if (!assetSnap.exists) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    const assetData = assetSnap.data();
    if (assetData?.scan_status === 'clean' || assetData?.scan_status === 'violations_found') {
      console.log(`[Worker] Asset ${assetId} already processed.`);
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    await assetRef.update({ scan_status: 'scanning' });

    // Fetch open violations for this asset
    const violationsSnap = await db.collection('violations')
      .where('asset_id', '==', assetId)
      .where('status', '==', 'open')
      .where('gemini_class', '==', 'NEEDS_REVIEW')
      .get();

    if (violationsSnap.empty) {
      await assetRef.update({ scan_status: 'clean', last_scan_at: FieldValue.serverTimestamp() });
      return NextResponse.json({ success: true });
    }

    // 2. Generate hash for original asset
    let originalHash = assetData?.hash;
    if (!originalHash) {
      try {
        originalHash = await getPHash(uploadedUrl);
        await assetRef.update({ hash: originalHash });
      } catch (e) {
        console.error('Failed to hash original asset', e);
        throw new Error('Failed to hash original asset');
      }
    }

    let hasViolations = false;
    const clusters: Record<string, { representativeId: string, results: any }> = {};

    for (const doc of violationsSnap.docs) {
      const vData = doc.data();
      const vId = doc.id;
      const vUrl = vData.assetThumbnailUrl || vData.match_url;

      try {
        // 3a. Generate hash for violation
        const vHash = await getPHash(vUrl);
        await doc.ref.update({ hash: vHash });

        // 3b. Compare and drop if needed
        const distance = hammingDistance(originalHash, vHash);
        if (distance > 10) {
          console.log(`[Worker] Dropping match ${vId} (dist: ${distance})`);
          await doc.ref.update({ 
            status: 'dropped', 
            gemini_class: 'NOT_A_MATCH',
            reasoning: `Dropped due to high perceptual hash distance (${distance} > 10)`
          });
          continue;
        }

        // 4. Assign cluster
        let isRepresentative = false;
        const clusterId = vHash;

        if (!clusters[clusterId]) {
          // Create new cluster
          clusters[clusterId] = { representativeId: vId, results: null };
          isRepresentative = true;
          await doc.ref.update({ clusterId, isRepresentative: true });
        } else {
          // Assign to existing cluster
          await doc.ref.update({ clusterId, isRepresentative: false });
        }

        // 5. If not representative, skip Gemini
        if (!isRepresentative) {
          console.log(`[Worker] Skipping Gemini for ${vId} (Duplicate in cluster ${clusterId})`);
          continue;
        }

        // 6. Rate limit check
        if (process.env.NODE_ENV !== 'development') {
          const { success } = await geminiRateLimit.limit("gemini_pipeline");
          if (!success) {
            throw new Error('Rate limit exceeded');
          }
        }

        console.log(`[Worker] Calling Gemini for representative ${vId}`);

        // 7. Call Gemini
        const result = await classifyViolation({
          violationId: vId,
          matchUrl: vData.match_url,
          pageTitle: vData.page_context || '',
          pageDescription: '',
          matchType: 'visually_similar',
          rightsTier: rightsTier || 'editorial',
          ownerOrg: ownerOrg || '',
          tags: selectedTags || [],
          originalAssetUrl: uploadedUrl,
          violationImageUrl: vUrl,
          assetDescription: assetDescription || '',
        });

        if (result.classification === 'UNAUTHORIZED') {
          hasViolations = true;
        }

        // 8. Store result
        const updatePayload = {
          classification_schema_version: 2,
          classification: result.classification,
          severity: result.severity,
          confidence: result.confidence,
          relevancy: result.relevancy,
          reliability_score: result.reliability_score,
          reliability_tier: result.reliability_tier,
          abstain: result.abstained,
          contradiction_flag: result.contradiction_flag,
          explainability_bullets: result.explainability_bullets,
          scores: result.scores,
          signals: result.signals,
          evidence_quality: result.evidence_quality,
          reasoning_steps: result.reasoning_steps,
          recommended_action: result.recommended_action,
          domain_class: result.domain_class,
          applied_weights: result.applied_weights,

          gemini_class: result.classification,
          gemini_reasoning: result.reasoning,
          visual_match_score: result.visual_match_score,
          contextual_match_score: result.contextual_match_score,
          commercial_signal: result.commercial_signal,
          watermark_likely_removed: result.watermark_likely_removed,
          is_derivative_work: result.is_derivative_work,
          
          updated_at: FieldValue.serverTimestamp(),
        };

        await doc.ref.update(updatePayload);
        clusters[clusterId].results = updatePayload;

        // Write audit log
        await db.collection('audit_log').add({
          timestamp: FieldValue.serverTimestamp(),
          action_type: 'classification_v2',
          actor: 'system',
          violation_id: vId,
          next_state: result.classification,
          reliability_score: result.reliability_score,
        });

        // 9. Archive URL (fire and forget)
        fetch(`https://web.archive.org/save/${vData.match_url}`).catch(e => console.error('Archive failed:', e));

      } catch (e: any) {
        console.error(`[Worker] Error processing violation ${vId}:`, e);
        if (e.message === 'Rate limit exceeded') {
          throw e; // Fail loudly for QStash to retry the job
        }
      }
    }

    // 10. Propagate results
    for (const clusterId of Object.keys(clusters)) {
      const clusterData = clusters[clusterId];
      if (clusterData.results) {
        const membersSnap = await db.collection('violations')
          .where('asset_id', '==', assetId)
          .where('clusterId', '==', clusterId)
          .where('isRepresentative', '==', false)
          .get();
        
        if (!membersSnap.empty) {
          console.log(`[Worker] Propagating results to ${membersSnap.size} members in cluster ${clusterId}`);
          const batch = db.batch();
          membersSnap.docs.forEach(memberDoc => {
            batch.update(memberDoc.ref, clusterData.results);
          });
          await batch.commit();
        }
      }
    }

    // 11. Mark complete
    await assetRef.update({
      scan_status: hasViolations ? 'violations_found' : 'clean',
      last_scan_at: FieldValue.serverTimestamp()
    });

    console.log(`[Worker] Asset ${assetId} processing complete.`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Worker] Fatal error:', error);
    // Fail loudly so QStash knows to retry
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
