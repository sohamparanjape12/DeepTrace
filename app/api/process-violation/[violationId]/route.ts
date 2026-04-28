import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { processViolationStage, updateAssetAggregation } from '@/lib/pipeline-executor';
import { isTerminalViolation } from '@/lib/firestore-schema';
import { getBaseUrl } from '@/lib/utils/url';

export const maxDuration = 30;

export async function POST(req: NextRequest, { params }: { params: Promise<{ violationId: string }> }) {
  const { violationId } = await params;
  const hops = parseInt(req.headers.get('x-pipeline-hops') || '0');

  try {
    const vRef = db.collection('violations').doc(violationId);
    let vSnap = await vRef.get();
    if (!vSnap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let vData = vSnap.data();

    // 1. Advance one stage
    await processViolationStage(violationId);

    // 2. Fetch updated state
    vSnap = await vRef.get();
    vData = vSnap.data();

    // 3. Recursively continue ONLY if we just advanced to a fresh non-terminal stage
    // and are not in a failed state (which requires a delay).
    const isTerminal = ['gate_dropped', 'classified', 'failed_permanent'].includes(vData?.stage || '');
    const isFailed = vData?.stage?.startsWith('failed_');

    if (!isTerminal && !isFailed) {
      if (hops < 5) {
        console.log(`[ProcessViolation] Hopping for ${violationId} (hop ${hops + 1}) - currently ${vData?.stage}`);
        const baseUrl = getBaseUrl();
        
        // Add small delay in local dev to avoid rate limits
        if (!process.env.UPSTASH_QSTASH_TOKEN) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        fetch(`${baseUrl}/api/process-violation/${violationId}`, {
          method: 'POST',
          headers: { 'x-pipeline-hops': (hops + 1).toString() }
        }).catch(() => null);
      } else {
        console.log(`[ProcessViolation] Max hops reached for ${violationId}`);
      }
    } else if (isFailed) {
      console.log(`[ProcessViolation] Stopping for ${violationId} due to failure state: ${vData?.stage}`);
    }

    return NextResponse.json({ success: true, stage: vData?.stage });

  } catch (error: any) {
    console.error(`[ProcessViolation] Error for ${violationId}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
