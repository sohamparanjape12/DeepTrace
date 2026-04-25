import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { processViolationStage, updateAssetAggregation } from '@/lib/pipeline-executor';

/**
 * Worker endpoint to process an asset.
 * Refactored to be idempotent and stage-aware.
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { assetId } = payload;

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

    // 2. Fetch all non-terminal violations
    const violationsSnap = await db.collection('violations')
      .where('asset_id', '==', assetId)
      .get();

    const violations = violationsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const nonTerminal = violations.filter(v => {
      const stage = (v as any).stage;
      return !['gate_dropped', 'classified', 'failed_permanent'].includes(stage);
    });

    if (nonTerminal.length === 0) {
      await updateAssetAggregation(assetId);
      return NextResponse.json({ success: true, message: 'All violations terminal' });
    }

    // 3. Process each violation (one stage at a time)
    // In a real high-throughput system, this would be a fan-out to QStash.
    // For now, we process them in the worker to maintain compatibility.
    for (const v of nonTerminal) {
      try {
        await processViolationStage(v.id);
      } catch (e) {
        console.error(`[Worker] Error processing violation ${v.id}:`, e);
      }
    }

    // 4. Update asset totals
    await updateAssetAggregation(assetId);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[Worker] Fatal error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
