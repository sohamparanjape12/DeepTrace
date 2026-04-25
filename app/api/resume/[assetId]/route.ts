import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { updateAssetAggregation } from '@/lib/pipeline-executor';

export async function POST(req: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  console.log('[Resume API] Request for assetId:', assetId);
  
  try {
    const assetRef = db.collection('assets').doc(assetId);
    console.log('[Resume API] Using path:', assetRef.path);
    
    // 1. Transactional Lock
    const body = await req.json().catch(() => ({}));
    const force = !!body.force;

    const result = await db.runTransaction(async (transaction) => {
      const assetSnap = await transaction.get(assetRef);
      if (!assetSnap.exists) return { error: 'Asset not found', status: 404 };

      const assetData = assetSnap.data();
      const now = Date.now();
      
      // Check lock (ignore if force=true)
      if (!force && assetData.resume_lock && assetData.resume_lock.until > now) {
        return { success: false, reason: 'lock_held', status: 200 };
      }

      if (assetData.stage === 'complete') {
        return { success: false, reason: 'already_complete', status: 200 };
      }

      // Acquire lock
      transaction.update(assetRef, {
        resume_lock: {
          holder: 'resume_api',
          until: now + 10000 // 10s lock
        }
      });

      return { success: true, assetData };
    });

    if (!(result as any).success) {
      if ((result as any).error) return NextResponse.json({ error: (result as any).error }, { status: (result as any).status });
      return NextResponse.json({ resumed: false, reason: (result as any).reason });
    }

    const { assetData } = result as any;

    // 2. Query only non-terminal violations to resume (reduces reads)
    const violationsSnap = await db.collection('violations')
      .where('asset_id', '==', assetId)
      .where('stage', 'in', ['gated_pending', 'gate_passed', 'scraped', 'failed_retryable'])
      .get();

    // 3. Trigger reverse search ONLY if no violations exist
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    if (!assetData.idempotency?.reverse_search_done && violationsSnap.empty) {
      await fetch(`${baseUrl}/api/reverse-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: assetData.storageUrl || assetData.url,
          assetId,
          userId: assetData.owner_id
        })
      });
    } else if (!assetData.idempotency?.reverse_search_done && !violationsSnap.empty) {
      await assetRef.update({ 'idempotency.reverse_search_done': true });
    }

    // 4. Filter work queue
    const toProcess = violationsSnap.docs.filter(doc => {
      const v = doc.data();
      if (!v.stage) return true;

      const isPermanent = v.stage === 'failed_permanent' || ['gate_dropped', 'classified'].includes(v.stage);
      if (isPermanent) return force && v.stage === 'failed_permanent';
      
      if (!force && v.next_retry_at && v.next_retry_at > Date.now()) return false;

      // Stale check
      const fiveMinsAgo = Date.now() - (5 * 60 * 1000);
      const updatedAt = v.stage_updated_at?.toDate?.()?.getTime?.() || 0;
      if (updatedAt > 0 && updatedAt < fiveMinsAgo) return true;
      
      return true;
    });

    console.log(`[Resume] Found ${toProcess.length} violations to process for asset ${assetId}`);

    const concurrency = 4; // Strict concurrency for free tier
    const slice = toProcess.slice(0, concurrency);

    // 5. Fire batch
    if (slice.length > 0) {
      console.log(`[Resume] Firing batch of ${slice.length} for asset ${assetId}`);
      await Promise.all(slice.map(doc => {
        return fetch(`${baseUrl}/api/process-violation/${doc.id}`, {
          method: 'POST',
          headers: { 'x-pipeline-hops': '0' }
        }).catch(err => console.error(`[Resume] Trigger failed for ${doc.id}:`, err));
      }));
    }

    // 6. Recursive scheduling
    if (toProcess.length > concurrency) {
      console.log(`[Resume] ${toProcess.length - concurrency} items remaining. Scheduling next batch in 12s...`);
      setTimeout(() => {
        fetch(`${baseUrl}/api/resume/${assetId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force })
        }).catch(() => null);
      }, 12000); // 12 seconds gap for ultra-safety
    }

    await updateAssetAggregation(assetId);

    return NextResponse.json({ 
      resumed: true, 
      count: slice.length,
      remaining: Math.max(0, toProcess.length - slice.length)
    });

  } catch (error: any) {
    console.error(`[Resume] Error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
