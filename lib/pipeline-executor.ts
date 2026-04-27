import { db } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { runGate } from './perceptual-filter';
import { scrapePage } from './jina';
import { classifyViolation } from './classify.v2';
import { setViolationStage, nextRetryDelayMs } from './stage';
import { Asset, Violation } from '@/types';
import { isTerminalViolation } from './firestore-schema';
import { RetryableError, PermanentError } from './error-classes';
import { emitNotification } from './notifications/emit';
import { severityToEventType } from './notifications/taxonomy';


export async function processViolationStage(violationId: string) {
  const vRef = db.collection('violations').doc(violationId);
  const vSnap = await vRef.get();
  if (!vSnap.exists) return;
  const vData = vSnap.data() as Violation;

  if (isTerminalViolation(vData)) return;

  // Handle failed_retryable: Move it back to the stage it failed in so the blocks below pick it up
  if (vData.stage === 'failed_retryable' && vData.last_error?.stage) {
    console.log(`[Pipeline] Resuming ${violationId} from failure at stage: ${vData.last_error.stage}`);
    vData.stage = vData.last_error.stage;
  }

  const assetRef = db.collection('assets').doc(vData.asset_id);
  const assetSnap = await assetRef.get();
  if (!assetSnap.exists) return;
  const assetData = assetSnap.data() as Asset;

  // 1. GATE
  if (vData.stage === 'gated_pending') {
    console.log(`[Pipeline] Gating violation ${violationId}`);
    const candidate = {
      id: violationId,
      imageUrl: vData.assetThumbnailUrl || vData.match_url,
      matchUrl: vData.match_url,
      pageTitle: vData.page_context || '',
      matchType: 'visually_similar'
    };
    
    // Fetch custom thresholds if available
    let customThresholds = undefined;
    if (assetData.owner_org) {
      const orgSnap = await db.collection('organizations').doc(assetData.owner_org).get();
      if (orgSnap.exists) customThresholds = orgSnap.data()?.gate_thresholds;
    }

    const [gateResult] = await runGate(assetData.storageUrl || assetData.url, [candidate], customThresholds);
    const d = gateResult.decision;

    if (d.forward) {
      await setViolationStage(violationId, 'gate_passed', {
        gate_tier: d.tier,
        gate_similarity: d.similarity,
        gate_phash_distance: d.phash_distance,
        gate_dhash_distance: d.dhash_distance,
        gate_domain_class: d.domain_class,
        gate_reason: d.reason,
        gate_forwarded: true,
      });
    } else {
      await setViolationStage(violationId, 'gate_dropped', {
        gate_tier: d.tier,
        gate_similarity: d.similarity,
        gate_reason: d.reason,
        gate_forwarded: false,
        status: 'dropped',
        gemini_class: 'NOT_A_MATCH',
      });
    }
    await updateAssetAggregation(vData.asset_id);
    return;
  }

  // 2. SCRAPE
  if (vData.stage === 'gate_passed') {
    if (vData.scraped_cache) {
      await setViolationStage(violationId, 'scraped');
    } else {
      console.log(`[Pipeline] Scraping violation ${violationId}`);
      try {
        const scrape = await scrapePage(vData.match_url);
        await setViolationStage(violationId, 'scraped', {
          scraped_cache: { ...scrape, at: FieldValue.serverTimestamp() }
        });
      } catch (e: any) {
        console.error(`[Pipeline] Scrape failed for ${violationId}:`, e);
        const isPermanent = e instanceof PermanentError;
        const attempt = (vData.attempts?.scrape || 0) + 1;
        const delay = isPermanent ? null : nextRetryDelayMs(attempt);

        if (delay) {
          await setViolationStage(violationId, 'failed_retryable', {
            'attempts.scrape': attempt,
            next_retry_at: Date.now() + delay,
            last_error: { stage: 'gate_passed', message: e.message, at: FieldValue.serverTimestamp() }
          });
        } else {
          await setViolationStage(violationId, 'failed_permanent', {
            'attempts.scrape': attempt,
            last_error: { stage: 'gate_passed', message: isPermanent ? e.message : 'Max scrape attempts reached', at: FieldValue.serverTimestamp() }
          });
        }
      }
    }
    await updateAssetAggregation(vData.asset_id);
    return;
  }

  // 3. CLASSIFY
  if (vData.stage === 'scraped') {
    if (vData.classification_schema_version === 2) {
      await setViolationStage(violationId, 'classified');
    } else {
      console.log(`[Pipeline] Classifying violation ${violationId}`);
      try {
        const result = await classifyViolation({
          violationId,
          rightsTier: assetData.rights_tier || 'editorial',
          ownerOrg: assetData.owner_org || '',
          tags: assetData.tags || [],
          matchUrl: vData.match_url,
          pageTitle: vData.scraped_cache?.title || vData.page_context,
          pageDescription: vData.scraped_cache?.description || '',
          matchType: 'visually_similar',
          originalAssetUrl: assetData.storageUrl || assetData.url,
          violationImageUrl: vData.assetThumbnailUrl || vData.match_url,
          gateSimilarity: vData.gate_similarity,
          gateTier: vData.gate_tier,
          assetDescription: assetData.name || '',
        });

        await db.collection('violations').doc(violationId).set({
          ...result,
          gemini_class: result.classification,
          gemini_reasoning: result.reasoning,
          classification_schema_version: 2,
          stage: 'classified',
          stage_updated_at: FieldValue.serverTimestamp(),
          updated_at: FieldValue.serverTimestamp(),
        }, { merge: true });

        // Phase 4 Sidecar: Evidence Bundle (fire-and-forget, non-blocking)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${baseUrl}/api/generate-evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ violationId }),
        }).catch(err => console.error('[Pipeline] Evidence bundle trigger failed:', err));
        
        // Emit notification — fire-and-forget
        const recipientId = assetData.owner_id || vData.owner_id;
        if (recipientId) {
          void emitNotification({
            user_id: recipientId,
            event_type: severityToEventType(result.severity),
            payload: {
              violation_id: violationId,
              asset_id: vData.asset_id,
              asset_title: assetData.name || 'your asset',
              host_domain: new URL(vData.match_url || 'https://unknown').hostname,
              reliability_score: result.reliability_score,
            },
            source_event_id: `violation:${violationId}`,
          });
        } else {
          console.warn(`[Pipeline] No owner_id found for violation ${violationId} — skipping notification`);
        }

      } catch (e: any) {
        console.error(`[Pipeline] Classification failed for ${violationId}:`, e);
        const isPermanent = e instanceof PermanentError;
        const attempt = (vData.attempts?.classify || 0) + 1;
        const delay = isPermanent ? null : nextRetryDelayMs(attempt);

        if (delay) {
          await setViolationStage(violationId, 'failed_retryable', {
            'attempts.classify': attempt,
            next_retry_at: Date.now() + delay,
            last_error: { stage: 'scraped', message: e.message, at: FieldValue.serverTimestamp() }
          });
        } else {
          await setViolationStage(violationId, 'failed_permanent', {
            'attempts.classify': attempt,
            last_error: { stage: 'scraped', message: isPermanent ? e.message : 'Max classify attempts reached', at: FieldValue.serverTimestamp() }
          });
        }
      }
    }
    await updateAssetAggregation(vData.asset_id);
    return;
  }
}

export async function updateAssetAggregation(assetId: string) {
  console.log(`[Aggregation] Updating totals for asset: ${assetId}`);
  const assetRef = db.collection('assets').doc(assetId);
  
  try {
    // Perform query OUTSIDE transaction for better reliability with large sets
    const violationsSnap = await db.collection('violations').where('asset_id', '==', assetId).get();
    
    // Filter out ignored violations (those not selected in the wizard)
    const activeDocs = violationsSnap.docs.filter(doc => doc.data().stage !== 'ignored');
    
    const totals = {
      reverse_hits: activeDocs.length,
      gated_pending: 0,
      gate_dropped: 0,
      gate_passed: 0,
      scraped: 0,
      classified: 0,
      failed_retryable: 0,
      failed_permanent: 0,
    };

    let allTerminal = true;
    activeDocs.forEach(doc => {
      const v = doc.data() as any;
      if (v.stage) {
        if (v.stage === 'gated_pending') totals.gated_pending++;
        else if (v.stage === 'gate_dropped') totals.gate_dropped++;
        else if (v.stage === 'gate_passed') totals.gate_passed++;
        else if (v.stage === 'scraped') totals.scraped++;
        else if (v.stage === 'classified') totals.classified++;
        else if (v.stage === 'failed_retryable') totals.failed_retryable++;
        else if (v.stage === 'failed_permanent') totals.failed_permanent++;
        
        if (!['gate_dropped', 'classified', 'failed_permanent'].includes(v.stage)) {
          allTerminal = false;
        }
      } else {
        allTerminal = false;
      }
    });

    const newStage = (allTerminal && totals.reverse_hits > 0) ? 'complete' : 'analyzing';
    
    console.log(`[Aggregation] Results for ${assetId}:`, totals, `Stage: ${newStage}`);

    await assetRef.set({
      totals,
      stage: newStage,
      stage_updated_at: FieldValue.serverTimestamp(),
      scan_status: totals.classified > 0 ? 'violations_found' : ((allTerminal && totals.reverse_hits > 0) ? 'clean' : 'scanning')
    }, { merge: true });

    if (newStage === 'complete') {
      const aSnap = await assetRef.get();
      const aData = aSnap.data();
      const recipientId = aData?.owner_id || aData?.userId; // Check multiple possible fields

      if (recipientId) {
        void emitNotification({
          user_id: recipientId,
          event_type: 'pipeline.completed',
          payload: {
            asset_id: assetId,
            asset_title: aData?.name || assetId,
          },
          source_event_id: `pipeline.completed:${assetId}`, // Stable ID for idempotency
        });
      }
    }
  } catch (e) {
    console.error(`[Aggregation] Failed for ${assetId}:`, e);
  }
}
