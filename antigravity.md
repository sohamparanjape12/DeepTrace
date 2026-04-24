# antigravity.md — DeepTrace v2 Migration Plan

> **Audience:** Google Antigravity / Cursor / Claude Code running inside the DeepTrace Next.js repo.
> **Mission:** Replace the v1 classification pipeline with the v2 forensic pipeline (adaptive weights, three-axis scoring, abstention, contradiction detection, reliability 0–100, explainability bullets) **without breaking the existing UI or Firestore data**.
>
> **Non-negotiables**
> - Do NOT rename Firestore fields that clients read from; write NEW fields alongside them.
> - Preserve every legacy field in the `ClassificationResult` (`visual_match_score`, `contextual_match_score`, `commercial_signal`, `watermark_likely_removed`, `is_derivative_work`). They are kept for the existing upload UI.
> - Do NOT delete v1 files in the same PR as adding v2. Ship v2 in parallel; flip the callers in a second pass.
> - Every new file must be strict TypeScript — no `any` leaks into exported signatures.
> - Never expose `GEMINI_API_KEY` to the client. All Gemini calls stay server-side.

---

## 0. Prerequisites

Before touching code, confirm the following exist in the repo. If any are missing, stop and ask me:

- [ ] `lib/prompts.ts`      (v1 prompt — will be renamed)
- [ ] `lib/classify.ts`     (v1 classifier — will be renamed)
- [ ] `app/api/classify/route.ts`
- [ ] `app/api/scan/[assetId]/route.ts`
- [ ] `app/api/reverse-search/route.ts`
- [ ] `app/assets/upload/page.tsx`
- [ ] `lib/firebase-admin.ts`
- [ ] `types/` folder with `Asset`, `Violation`, `MatchType`
- [ ] `.env.local` containing `GEMINI_API_KEY`, `GEMINI_MODEL`, `SERPAPI_KEY`, `INTERNAL_CRON_KEY`

Create a new branch first:

```bash
git checkout -b feat/deeptrace-v2-forensic
```

---

## 1. File map — what to add, rename, and touch

| Action | Path | Source |
|---|---|---|
| **ADD**    | `lib/prompts.v2.ts`                        | from `prompts.v2.ts` in workspace |
| **ADD**    | `lib/classify.v2.ts`                       | from `classify.v2.ts` in workspace |
| **ADD**    | `lib/domain-classifier.ts`                 | re-export `classifyDomain` + `DOMAIN_CLASS_PRIORS` from `lib/prompts.v2.ts` / `lib/classify.v2.ts` so other code can import without pulling the whole classifier |
| **ADD**    | `lib/types/forensic.ts`                    | re-export `ClassifyParams`, `ClassificationResult`, `Classification`, `Severity`, `DomainClass` |
| **RENAME** | `lib/prompts.ts` → `lib/prompts.v1.legacy.ts` | keep for reference for one release cycle |
| **RENAME** | `lib/classify.ts` → `lib/classify.v1.legacy.ts` | keep for reference for one release cycle |
| **CREATE** | `lib/classify.ts` (thin shim)              | re-exports from `classify.v2.ts` so old imports keep working |
| **EDIT**   | `app/api/classify/route.ts`                | write v2 fields to Firestore, keep legacy fields |
| **EDIT**   | `app/api/scan/[assetId]/route.ts`          | pass richer context (assetCaptureDate, violationImageUrl) into classify call |
| **EDIT**   | `app/assets/upload/page.tsx`               | read the new fields (`reliability_score`, `reliability_tier`, `abstain`, `contradiction_flag`, `explainability_bullets`) and render them |
| **ADD**    | `components/shared/ReliabilityRing.tsx`    | 0–100 radial gauge, tier-coloured |
| **ADD**    | `components/shared/ExplainabilityList.tsx` | renders ✔/⚠/✖/ℹ/→ bullets with icon colour |
| **ADD**    | `components/shared/ContradictionBanner.tsx`| yellow strip shown when `contradiction_flag` is true |
| **EDIT**   | `app/violations/[id]/page.tsx` (if exists) | show the same three components |
| **EDIT**   | `firestore.rules`                          | no schema change, but re-verify the owner_id guard |
| **ADD**    | `scripts/backfill-v2-fields.ts`            | one-shot script to mark legacy violations so UI knows which are pre-v2 |

---

## 2. Step-by-step execution order

Run these in order. Each step should be a separate commit so review is easy.

### Step 1 — Drop in the v2 library
```bash
mkdir -p lib
cp ../workspace/prompts.v2.ts  lib/prompts.v2.ts
cp ../workspace/classify.v2.ts lib/classify.v2.ts
```

Fix imports at the top of `lib/classify.v2.ts`:
```ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildMasterPrompt,
  DOMAIN_CLASS_PRIORS,
  MasterPromptParams,
  DomainClass,
} from './prompts.v2';
```
Run `pnpm typecheck` (or `tsc --noEmit`). Fix any ambient-type mismatches (`AbortSignal.timeout` requires `lib: ["ES2022"]` or later in `tsconfig.json` → add if missing).

### Step 2 — Re-export types + domain helpers
Create `lib/types/forensic.ts`:
```ts
export type {
  ClassifyParams,
  ClassificationResult,
  Classification,
  Severity,
} from '../classify.v2';
export type { DomainClass } from '../prompts.v2';
```
Create `lib/domain-classifier.ts`:
```ts
export { classifyDomain } from './classify.v2';
export { DOMAIN_CLASS_PRIORS } from './prompts.v2';
```

### Step 3 — Keep the v1 import paths alive (backwards compat shim)
Rename the originals, then replace `lib/classify.ts` with a shim:
```bash
git mv lib/classify.ts   lib/classify.v1.legacy.ts
git mv lib/prompts.ts    lib/prompts.v1.legacy.ts
```
```ts
// lib/classify.ts — v2 shim so existing imports keep working
export * from './classify.v2';
export type { ClassifyParams, ClassificationResult } from './classify.v2';
```
`pnpm typecheck` again — everything that imported `@/lib/classify` should still compile.

### Step 4 — Update the classify API route
Open `app/api/classify/route.ts` and replace the body with the v2-aware version below. Write BOTH legacy and new fields so existing readers don't break.

```ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { classifyViolation } from '@/lib/classify.v2';

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

    // Firestore update — v2 fields + legacy aliases for the existing UI
    await db.collection('violations').doc(violationId).update({
      // v2
      classification_schema_version: 2,
      classification:         result.classification,
      severity:               result.severity,
      confidence:             result.confidence,
      relevancy:              result.relevancy,
      reliability_score:      result.reliability_score,
      reliability_tier:       result.reliability_tier,
      abstain:                result.abstain,
      contradiction_flag:     result.contradiction_flag,
      explainability_bullets: result.explainability_bullets,
      scores:                 result.scores,
      signals:                result.signals,
      evidence_quality:       result.evidence_quality,
      reasoning_steps:        result.reasoning_steps,
      recommended_action:     result.recommended_action,
      domain_class:           result.domain_class,
      applied_weights:        result.applied_weights,
      // legacy aliases (keep for existing UI)
      gemini_class:            result.classification,
      gemini_reasoning:        result.reasoning,
      visual_match_score:      result.visual_match_score,
      contextual_match_score:  result.contextual_match_score,
      commercial_signal:       result.commercial_signal,
      watermark_likely_removed: result.watermark_likely_removed,
      is_derivative_work:      result.is_derivative_work,
      updated_at: FieldValue.serverTimestamp(),
    });

    await db.collection('audit_log').add({
      timestamp: FieldValue.serverTimestamp(),
      action_type: 'classification_v2',
      actor: 'system',
      violation_id: violationId,
      next_state: result.classification,
      reliability_score: result.reliability_score,
      abstain: result.abstain,
      contradiction_flag: result.contradiction_flag,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Classification v2 error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 5 — Pass richer context from the scan route
In `app/api/scan/[assetId]/route.ts`, extend the classification fetch body:

```ts
body: JSON.stringify({
  violationId: violation.violation_id,
  matchUrl: violation.match_url,
  pageTitle: violation.page_context,
  pageDescription: page?.pageTitle ?? '',
  pagePublishedAt: page?.fullMatchingImages?.[0]?.score ? undefined : undefined, // populate if you have it
  assetRightsTier: asset.rights_tier,
  ownerOrg: asset.owner_org,
  matchType: violation.match_type,
  tags: asset.tags || [],
  originalAssetUrl: asset.storageUrl,
  violationImageUrl: violation.match_url,  // CRITICAL: without this, visual scoring is dead
  assetDescription: (asset as any).asset_description,
  assetCaptureDate: (asset as any).captured_at || (asset as any).uploaded_at,
  assetFirstPublishUrl: (asset as any).first_publish_url,
}),
```

### Step 6 — Upload page: render the new signals
In `app/assets/upload/page.tsx`, extend `AnalysisResult` and the Firestore listener:

```ts
interface AnalysisResult {
  // existing
  matchLink: string;
  matchThumbnail: string;
  matchTitle: string;
  classification: string;
  confidence: number;
  severity: string;
  visual_match_score: number;
  contextual_match_score: number;
  reasoning_steps: string[];
  is_derivative_work: boolean;
  commercial_signal: boolean;
  reasoning: string;
  // NEW
  relevancy: number;
  reliability_score: number;
  reliability_tier: 'HIGH' | 'MEDIUM' | 'LOW';
  abstain: boolean;
  contradiction_flag: boolean;
  explainability_bullets: string[];
  domain_class: string;
  recommended_action: string;
}
```

Inside the `onSnapshot` callback, map the new fields:
```ts
results.push({
  // existing fields unchanged …
  relevancy:              data.relevancy ?? 0,
  reliability_score:      data.reliability_score ?? 0,
  reliability_tier:       data.reliability_tier ?? 'LOW',
  abstain:                data.abstain ?? false,
  contradiction_flag:     data.contradiction_flag ?? false,
  explainability_bullets: data.explainability_bullets ?? [],
  domain_class:           data.domain_class ?? 'unknown',
  recommended_action:     data.recommended_action ?? 'monitor',
});
```

Fix the "pendingCount" check — schema v2 uses `classification_schema_version`:
```ts
if (!data.classification_schema_version) pendingCount++;
```

### Step 7 — Add the new UI components

`components/shared/ReliabilityRing.tsx`:
```tsx
export function ReliabilityRing({ score, tier }: { score: number; tier: 'HIGH'|'MEDIUM'|'LOW' }) {
  const color = tier === 'HIGH' ? '#22C55E' : tier === 'MEDIUM' ? '#F59E0B' : '#E11D48';
  const r = 28, c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
        <circle cx="36" cy="36" r={r} strokeWidth="6" stroke="#F4F4F5" fill="none" />
        <circle cx="36" cy="36" r={r} strokeWidth="6" stroke={color} fill="none"
                strokeDasharray={`${dash} ${c}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-lg font-black leading-none text-brand-text">{score}</div>
          <div className="text-[8px] font-black uppercase tracking-widest text-brand-muted">{tier}</div>
        </div>
      </div>
    </div>
  );
}
```

`components/shared/ExplainabilityList.tsx`:
```tsx
export function ExplainabilityList({ bullets }: { bullets: string[] }) {
  const iconOf = (s: string) => s[0];
  const rest   = (s: string) => s.slice(1).trim();
  const cls = (icon: string) =>
    icon === '✔' ? 'text-green-600' :
    icon === '⚠' ? 'text-amber-600' :
    icon === '✖' ? 'text-red-600'   :
    icon === 'ℹ' ? 'text-blue-600'  :
    icon === '→' ? 'text-brand-text font-bold' :
    'text-brand-muted';
  return (
    <ul className="space-y-1.5">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
          <span className={`${cls(iconOf(b))} text-sm leading-none mt-0.5`}>{iconOf(b)}</span>
          <span className="text-brand-text">{rest(b)}</span>
        </li>
      ))}
    </ul>
  );
}
```

`components/shared/ContradictionBanner.tsx`:
```tsx
import { AlertTriangle } from 'lucide-react';
export function ContradictionBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      <p className="text-[11px] font-bold text-amber-900">
        Signals disagree — verdict softened. Reviewer attention recommended.
      </p>
    </div>
  );
}
```

### Step 8 — Wire the components into the violation card
Inside the Step-4 result loop in `app/assets/upload/page.tsx`, replace the header row with:

```tsx
<div className="p-6 flex items-start gap-4 border-b border-brand-border">
  {/* existing thumbnail block … */}
  <div className="flex-1 space-y-2">
    {/* existing title + link */}
    <ContradictionBanner show={result.contradiction_flag || result.abstain} />
  </div>
  <ReliabilityRing score={result.reliability_score} tier={result.reliability_tier} />
</div>
```

In the right-hand panel, replace the old "Reasoning Steps" block with the explainability list:
```tsx
<ExplainabilityList bullets={result.explainability_bullets} />
```

Keep the existing score bars — they still work because `visual_match_score` and `contextual_match_score` are still produced.

### Step 9 — Asset schema fields to capture at upload
In the upload flow (Step 3), extend the Firestore write to capture the extra context the v2 classifier uses:

```ts
await setDoc(doc(db, 'assets', assetId), {
  // existing fields …
  asset_description: assetDescription,
  captured_at: capturedAt || null,       // NEW — add a date picker in Step 3 (optional)
  first_publish_url: firstPublishUrl || null, // NEW — optional input
  tags: selectedTags,
}, { merge: true });
```
If you don't want to add UI fields right now, omit them — classifier falls back gracefully.

### Step 10 — Firestore rules: no schema change, re-verify isolation
Open `firestore.rules` and ensure every read/write of `violations` still checks
```
request.auth != null && resource.data.owner_id == request.auth.uid
```
Also ensure `audit_log` stays server-write only. Run `firebase emulators:start --only firestore` locally and run your existing test script to catch regressions.

### Step 11 — Backfill script (optional, safe)
`scripts/backfill-v2-fields.ts`:
```ts
// One-shot: mark pre-v2 violations so the UI can show a "legacy" badge.
import { db } from '../lib/firebase-admin';

async function main() {
  const snap = await db.collection('violations').get();
  const batch = db.batch();
  let n = 0;
  snap.forEach(doc => {
    if (!doc.data().classification_schema_version) {
      batch.update(doc.ref, {
        classification_schema_version: 1,
        reliability_score: doc.data().confidence ? Math.round((doc.data().confidence as number) * 100) : 0,
        reliability_tier: 'LOW',
      });
      n++;
      if (n % 400 === 0) batch.commit();
    }
  });
  await batch.commit();
  console.log(`Backfilled ${n} docs`);
}
main().catch(console.error);
```
Run with `pnpm tsx scripts/backfill-v2-fields.ts`. Safe to run multiple times.

### Step 12 — Smoke tests you MUST run before shipping

Create `lib/classify.v2.test.ts` (manual; runs locally):

```ts
import { classifyViolation } from './classify.v2';

const cases = [
  { // 1. Wire-service false-positive killer
    name: 'Reuters syndicated photo',
    params: {
      rightsTier: 'editorial',
      ownerOrg: 'UEFA Media',
      tags: ['football', 'champions league'],
      matchUrl: 'https://www.reuters.com/sports/soccer/2024-final',
      pageTitle: 'UEFA Champions League final photo gallery',
      matchType: 'full_match' as const,
      originalAssetUrl: 'https://…/original.jpg',
      violationImageUrl: 'https://…/reuters-same.jpg',
    },
    expect: { classification: 'AUTHORIZED', severityNot: 'CRITICAL' },
  },
  { // 2. Betting-site critical
    name: 'bet365 match photo',
    params: {
      rightsTier: 'commercial',
      ownerOrg: 'UEFA Media',
      tags: ['football'],
      matchUrl: 'https://www.bet365.com/promo/champions-league',
      pageTitle: 'Bet on tonight\'s final',
      matchType: 'full_match' as const,
      originalAssetUrl: 'https://…/original.jpg',
      violationImageUrl: 'https://…/bet365-crop.jpg',
    },
    expect: { classification: 'UNAUTHORIZED', severity: 'CRITICAL' },
  },
  { // 3. Temporal impossibility
    name: 'Page predates asset',
    params: {
      rightsTier: 'commercial',
      ownerOrg: 'UEFA Media',
      tags: ['football'],
      matchUrl: 'https://oldblog.com/2018/report',
      pageTitle: '2018 match report',
      pagePublishedAt: '2018-05-20',
      assetCaptureDate: '2024-06-01',
      matchType: 'visually_similar' as const,
    },
    expect: { classification: 'AUTHORIZED' /* via temporal override */ },
  },
  { // 4. Missing image → abstention
    name: 'Suspect image unreachable',
    params: {
      rightsTier: 'commercial',
      ownerOrg: 'UEFA Media',
      tags: ['football'],
      matchUrl: 'https://some.site/page',
      pageTitle: 'blog post',
      matchType: 'partial_match' as const,
      originalAssetUrl: 'https://…/original.jpg',
      // violationImageUrl intentionally omitted
    },
    expect: { abstain: true, classification: 'INSUFFICIENT_EVIDENCE' },
  },
  { // 5. Attribution + news = editorial fair use, contradiction flag expected
    name: 'Guardian with byline',
    params: {
      rightsTier: 'editorial',
      ownerOrg: 'UEFA Media',
      tags: ['football'],
      matchUrl: 'https://www.theguardian.com/football/2024/jun/02/final',
      pageTitle: 'Photo essay: a historic night in Wembley',
      matchType: 'full_match' as const,
      originalAssetUrl: 'https://…/original.jpg',
      violationImageUrl: 'https://…/guardian-same.jpg',
    },
    expect: { classification: 'EDITORIAL_FAIR_USE' },
  },
];

for (const c of cases) {
  const r = await classifyViolation(c.params as any);
  console.log(`\n— ${c.name} —`);
  console.log({
    classification: r.classification,
    severity: r.severity,
    reliability: r.reliability_score,
    tier: r.reliability_tier,
    relevancy: r.relevancy,
    abstain: r.abstain,
    contradiction: r.contradiction_flag,
    action: r.recommended_action,
    domain: r.domain_class,
  });
}
```

Run:
```bash
pnpm tsx lib/classify.v2.test.ts
```
All five cases should match the expectations. If case 1 returns UNAUTHORIZED, your domain regex isn't hitting — extend `DOMAIN_RULES` in `classify.v2.ts`.

### Step 13 — Per-tenant licensed-partner allowlist (2-minute upgrade)
In `classify.v2.ts`, `classifyDomain(url, ownerOrg, licensedDomains)` already accepts a per-tenant list. Add a Firestore lookup in the classify API route:

```ts
const orgDoc = await db.collection('organizations').doc(ownerOrg).get();
const licensedDomains: string[] = orgDoc.data()?.licensed_domains ?? [];
// pass to classifyViolation via a new optional `licensedDomains` param — threading this through
// requires extending ClassifyParams with a `licensedDomains?: string[]` and using it inside
// `classifyDomain(params.matchUrl, params.ownerOrg, params.licensedDomains)`.
```

Ship this only after Step 12 tests pass.

### Step 14 — Deploy
```bash
pnpm build
pnpm test  # if you have any
git push origin feat/deeptrace-v2-forensic
```
Open a PR. After merge, Vercel auto-deploys. Monitor Firestore `audit_log` for `action_type: 'classification_v2'` entries — those are v2-classified violations.

---

## 3. Verification checklist

Tick every box before closing the PR:

- [ ] `pnpm typecheck` passes with zero errors.
- [ ] `pnpm build` succeeds.
- [ ] The 5 smoke-test cases in `classify.v2.test.ts` match expectations.
- [ ] Upload flow end-to-end still works — upload, reverse search, select, analyse, see results.
- [ ] Violation cards show a reliability ring with a tier-coloured score.
- [ ] Explainability bullets render with ✔/⚠/✖/ℹ/→ icons.
- [ ] When you unplug the internet mid-analysis, violations return INSUFFICIENT_EVIDENCE with a "system abstained" banner instead of fake scores.
- [ ] Firestore docs now contain `classification_schema_version: 2` and the new nested `scores`, `signals`, `evidence_quality` maps.
- [ ] Legacy fields (`gemini_class`, `visual_match_score`, etc.) are still populated.
- [ ] Audit log has `action_type: 'classification_v2'` entries.
- [ ] Running a known-good wire-service photo returns AUTHORIZED and not UNAUTHORIZED.

---

## 4. Known gotchas for Antigravity / Cursor

- **`AbortSignal.timeout`** needs `"lib": ["ES2022", "DOM"]` in `tsconfig.json`. If the build fails on that line, replace with a manual `AbortController` + `setTimeout`.
- **Gemini `responseMimeType: 'application/json'`** requires `@google/generative-ai` ≥ 0.17. If you're pinned older, upgrade or drop that flag (output will still be JSON-shaped but fragile).
- **Cloudinary URLs served cross-origin** sometimes fail `fetch()` in Node without a user-agent. If `fetchToGenerativePart` is returning `ok: false`, add `headers: { 'User-Agent': 'DeepTrace/1.0' }`.
- **Vercel serverless function timeout.** Gemini + image fetching + JSON parse can exceed 10 s on Hobby plan. Bump the route's `export const maxDuration = 30;` (Vercel Pro required for >10 s).
- **Firestore array field depth.** `scores` and `signals` are nested objects — `onSnapshot` triggers whenever ANY sub-field changes. If your UI re-renders too aggressively, memoise by `(relevancy, reliability_score, classification)` tuple.
- **Fire-and-forget `fetch` from Next.js API routes dies when the response returns.** This is a v1 bug we're not fixing here, but you WILL see violations stuck in `gemini_class: 'NEEDS_REVIEW'` during production. The post-hackathon fix is Upstash QStash — see `PIPELINE-REVIEW.md` §6.1.

---

## 5. Rollback plan

If anything goes wrong in production:

1. Revert `lib/classify.ts` to point at v1:
   ```ts
   // emergency: switch back to v1
   export * from './classify.v1.legacy';
   ```
2. Redeploy. The UI will still work because we kept legacy fields.
3. File a bug with a copy of the offending Firestore `violations` document and the `audit_log` entry for the classification.

---

## 6. Out-of-scope for this migration

These are called out in `PIPELINE-REVIEW.md` and deliberately NOT part of this PR:
- pHash pre-filter before Gemini
- Near-duplicate clustering
- archive.org evidence snapshots
- Queue-based scan pipeline (Upstash QStash)
- DMCA takedown generator
- Bing Visual Search / Google Vision as parallel detectors

Do these in follow-up PRs, one per file, each behind a feature flag.

---

## 7. What to tell the team after merge

> v2 forensic pipeline is live. Classifications now return a `reliability_score` (0–100), an explicit `abstain` state, a `contradiction_flag`, and pre-rendered `explainability_bullets`. Legacy fields are preserved so nothing breaks. See `PIPELINE-REVIEW.md` for the full rationale and the sports-media-company roadmap.
