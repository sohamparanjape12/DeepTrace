import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebase-admin';
import { AssetStage, ViolationStage } from './types/pipeline';

export function violationIdempotencyKey(assetId: string, matchUrl: string): string {
  return crypto.createHash('sha256').update(`${assetId}|${matchUrl}`).digest('hex').slice(0, 32);
}

export async function setAssetStage(assetId: string, stage: AssetStage, extra: Record<string, unknown> = {}) {
  await db.collection('assets').doc(assetId).set({
    stage,
    stage_updated_at: FieldValue.serverTimestamp(),
    ...extra,
  }, { merge: true });
}

export async function setViolationStage(
  violationId: string,
  stage: ViolationStage,
  extra: Record<string, unknown> = {},
) {
  await db.collection('violations').doc(violationId).set({
    stage,
    stage_updated_at: FieldValue.serverTimestamp(),
    ...extra,
  }, { merge: true });
}

/** Faster retries for smoother dev experience: 5s, 15s, 60s, 5m, 15m. */
export function nextRetryDelayMs(attempt: number): number | null {
  const ladder = [5_000, 15_000, 60_000, 300_000, 900_000];
  return ladder[attempt] ?? null;
}
