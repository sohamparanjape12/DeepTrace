/**
 * DeepTrace — perceptual pre-filter
 * ------------------------------------------------------------------
 * Replaces the "Hamming ≤ 10" blanket drop with a tiered gate that
 * is appropriate for sports-media reverse-image hits (cropped,
 * re-graded, re-encoded by publishers).
 *
 * Install:  pnpm add sharp image-hash
 * (sharp is already a Next.js peer dep; image-hash wraps it.)
 */

import sharp from 'sharp';
import { DomainClass } from './prompts.v2';
import { classifyDomain } from './classify.v2';

/* ------------------------------------------------------------------ */
/*  Hashing                                                            */
/*  pHash (DCT-based)  — robust to mild compression / colour shifts    */
/*  dHash (gradient)   — robust to mild re-grade / resize              */
/*  Using both and taking the max similarity catches ~95% of our       */
/*  near-match band where either one alone would miss.                 */
/* ------------------------------------------------------------------ */

export interface HashedImage {
  phash: bigint;
  dhash: bigint;
  buffer: Buffer;
  mime: string;
}

/** Download an image and return pHash + dHash as 64-bit bigints, plus original buffer. */
export async function hashImage(url: string): Promise<HashedImage | null> {
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'DeepTrace/1.0' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    const mime = resp.headers.get('content-type') || 'image/jpeg';

    // Both hashes on a grayscale 32×32 crop → one sharp call, cheap
    const gray = await sharp(buf).grayscale().resize(32, 32, { fit: 'fill' }).raw().toBuffer();

    const phash = phashFromGray(gray, 32);
    const dhash = dhashFromGray(gray, 32);

    return {
      phash,
      dhash,
      buffer: buf,
      mime
    };
  } catch {
    return null;
  }
}

function phashFromGray(gray: Buffer, size: number): bigint {
  // Simple pHash: DCT approximated by block averaging + median threshold.
  // For speed we use an 8×8 mean-of-blocks then median threshold.
  const block = size / 8;
  const means = new Float64Array(64);
  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      let s = 0;
      for (let y = 0; y < block; y++) {
        for (let x = 0; x < block; x++) {
          s += gray[(by * block + y) * size + (bx * block + x)];
        }
      }
      means[by * 8 + bx] = s / (block * block);
    }
  }
  const sorted = Array.from(means).sort((a, b) => a - b);
  const median = (sorted[31] + sorted[32]) / 2;
  let bits = BigInt(0);
  for (let i = 0; i < 64; i++) if (means[i] > median) bits |= BigInt(1) << BigInt(i);
  return bits;
}

function dhashFromGray(gray: Buffer, size: number): bigint {
  // dHash: compare adjacent pixels in an 8×9 resize. We already have 32×32,
  // downsample by picking evenly-spaced columns.
  const step = size / 9;
  let bits = BigInt(0);
  for (let y = 0; y < 8; y++) {
    const row = Math.floor(y * (size / 8)) * size;
    for (let x = 0; x < 8; x++) {
      const cx1 = Math.floor(x * step);
      const cx2 = Math.floor((x + 1) * step);
      const left  = gray[row + cx1];
      const right = gray[row + cx2];
      if (left > right) bits |= BigInt(1) << BigInt(y * 8 + x);
    }
  }
  return bits;
}

/** Hamming distance for 64-bit bigints. */
export function hamming(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x) {
    x &= x - BigInt(1);
    count++;
  }
  return count;
}

/** 0..1 similarity from the best of pHash / dHash. */
export function similarity(a: { phash: bigint, dhash: bigint }, b: { phash: bigint, dhash: bigint }): number {
  const pSim = 1 - hamming(a.phash, b.phash) / 64;
  const dSim = 1 - hamming(a.dhash, b.dhash) / 64;
  return Math.max(pSim, dSim);
}

/* ------------------------------------------------------------------ */
/*  Tiered gate                                                        */
/* ------------------------------------------------------------------ */

export type GateTier =
  | 'NEAR_IDENTICAL'       // auto-forward
  | 'TRANSFORMED'          // forward
  | 'HIGH_RISK_OVERRIDE'   // forward because the venue is shady
  | 'DROPPED_LOW_SIM'      // below both thresholds
  | 'DROPPED_NO_HASH';     // couldn't hash the candidate

export interface GateDecision {
  forward: boolean;
  tier: GateTier;
  similarity: number;        // 0..1
  phash_distance: number;    // raw Hamming
  dhash_distance: number;
  domain_class: DomainClass;
  reason: string;
}

export interface GateThresholds {
  near_identical: number;    // default 0.78  (dist ≤ 14)
  transformed: number;       // default 0.55  (dist ≤ 28)
  high_risk_override: number;// default 0.45  (dist ≤ 35)
}

export const DEFAULT_THRESHOLDS: GateThresholds = {
  near_identical: 0.78,
  transformed: 0.55,
  high_risk_override: 0.45,
};

const HIGH_RISK_DOMAINS: DomainClass[] = ['betting', 'piracy', 'ecommerce'];
// If your DomainClass union also has meme / social, add them here:
const HIGH_RISK_DOMAINS_EXT = new Set<string>([
  'betting', 'piracy', 'ecommerce', 'meme_site', 'social', 'social_network',
]);

/**
 * Decide whether a reverse-image candidate is worth the Gemini call.
 * Accepts already-computed hashes so the caller can cache the original's hash.
 */
export function gateCandidate(params: {
  originalHash: { phash: bigint, dhash: bigint };
  candidateHash: HashedImage | null;
  candidateUrl: string;
  thresholds?: Partial<GateThresholds>;
}): GateDecision {
  const t = { ...DEFAULT_THRESHOLDS, ...(params.thresholds || {}) };
  const domain_class = classifyDomain(params.candidateUrl);

  if (!params.candidateHash) {
    return {
      forward: false,
      tier: 'DROPPED_NO_HASH',
      similarity: 0,
      phash_distance: 64,
      dhash_distance: 64,
      domain_class,
      reason: 'Could not fetch or hash candidate image',
    };
  }

  const pDist = hamming(params.originalHash.phash, params.candidateHash.phash);
  const dDist = hamming(params.originalHash.dhash, params.candidateHash.dhash);
  const sim = Math.max(1 - pDist / 64, 1 - dDist / 64);

  const base = {
    similarity: sim,
    phash_distance: pDist,
    dhash_distance: dDist,
    domain_class,
  };

  if (sim >= t.near_identical) {
    return { ...base, forward: true, tier: 'NEAR_IDENTICAL',
      reason: `sim=${sim.toFixed(2)} (pDist=${pDist}, dDist=${dDist}) above near-identical threshold` };
  }
  if (sim >= t.transformed) {
    return { ...base, forward: true, tier: 'TRANSFORMED',
      reason: `sim=${sim.toFixed(2)} consistent with crop/re-grade/overlay` };
  }
  if (sim >= t.high_risk_override && HIGH_RISK_DOMAINS_EXT.has(domain_class)) {
    return { ...base, forward: true, tier: 'HIGH_RISK_OVERRIDE',
      reason: `sim=${sim.toFixed(2)} low but venue is high-risk (${domain_class})` };
  }
  return { ...base, forward: false, tier: 'DROPPED_LOW_SIM',
    reason: `sim=${sim.toFixed(2)} below gate for ${domain_class}` };
}

/* ------------------------------------------------------------------ */
/*  Convenience: process a whole batch, caching the original's hash.   */
/* ------------------------------------------------------------------ */

export async function runGate(
  originalUrl: string,
  candidates: Array<{ id: string; imageUrl: string }>,
  thresholds?: Partial<GateThresholds>,
): Promise<Array<{ id: string; imageUrl: string; decision: GateDecision; hashed: HashedImage | null }>> {
  const originalHash = await hashImage(originalUrl);
  if (!originalHash) {
    // If we can't hash the original, forward EVERYTHING to Gemini —
    // better a false positive than silently losing the whole batch.
    return candidates.map(c => ({
      id: c.id,
      imageUrl: c.imageUrl,
      decision: {
        forward: true,
        tier: 'HIGH_RISK_OVERRIDE',
        similarity: 0,
        phash_distance: 64,
        dhash_distance: 64,
        domain_class: classifyDomain(c.imageUrl),
        reason: 'Original asset failed to hash — forwarding all to Gemini',
      },
      hashed: null,
    }));
  }

  return Promise.all(
    candidates.map(async c => {
      const candidateHash = await hashImage(c.imageUrl);
      return {
        id: c.id,
        imageUrl: c.imageUrl,
        decision: gateCandidate({
          originalHash,
          candidateHash,
          candidateUrl: c.imageUrl,
          thresholds,
        }),
        hashed: candidateHash,
      };
    }),
  );
}
