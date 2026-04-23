Aarush — Focused Development Workflow (Only Your Scope)

This plan keeps you strictly within your responsibilities:

AI classification
severity logic
violation detail experience
decision layer improvements

No overlap with:

Soham (scan pipeline, infra)
Mitansh (dashboard, asset UI)
Patil (Firebase, auth, alerts)
Phase 0 — Understand Inputs & Contracts (No Coding)
Goal

Know exactly what data your system receives and returns.

Inputs (from existing pipeline)

You will receive:

{
  violationId,
  matchUrl,
  pageTitle,
  pageDescription,
  matchType,
  rightsTier,
  ownerOrg,
  tags
}
Output (you define)
{
  classification,
  confidence,
  reasoning,
  commercialSignal,
  watermarkLikelyRemoved,
  severity,
  similarityScore   // (your addition)
}
Phase 1 — Gemini Classification Module (Core)
What you build

/lib/classify.ts

Steps
Setup Gemini SDK
Write base function:
classifyViolation(params)
Send structured prompt
Parse JSON safely
Validate output fields
Add:
try/catch fallback
default values if parsing fails
AntiGravity Prompt (Phase 1)
Build a TypeScript module `/lib/classify.ts` for a Next.js 14 app.

Requirements:
- Export async function `classifyViolation(params)`
- Use @google/generative-ai (Gemini 1.5 Flash)
- Input params:
  { matchUrl, pageTitle, pageDescription, matchType, rightsTier, ownerOrg, tags }

- Call Gemini with a structured prompt (JSON output only)
- Parse response safely (try/catch, JSON validation)
- Return:
  {
    classification: 'AUTHORIZED' | 'UNAUTHORIZED' | 'EDITORIAL_FAIR_USE' | 'NEEDS_REVIEW',
    confidence: number (0–1),
    reasoning: string,
    commercialSignal: boolean,
    watermarkLikelyRemoved: boolean
  }

Constraints:
- No Firestore calls
- No API routes
- Pure function only
- Fully typed (no any)
Phase 2 — Severity + Similarity Logic (Your Key Differentiator)
What you build

Extend /lib/classify.ts

Add:
1. Severity function
function computeSeverity(classification, confidence, signals)
2. Similarity score (your enhancement)
similarityScore = confidence * 100

(Optional later: include hash score if available)

AntiGravity Prompt (Phase 2)
Extend the classifyViolation function.

Add:
1. Severity calculation:
   - CRITICAL: UNAUTHORIZED and confidence >= 0.85
   - HIGH: UNAUTHORIZED (0.7–0.84) OR NEEDS_REVIEW (>=0.85)
   - MEDIUM: NEEDS_REVIEW OR EDITORIAL_FAIR_USE with commercialSignal = true
   - LOW: AUTHORIZED or EDITORIAL_FAIR_USE

2. Add field:
   similarityScore = confidence * 100

3. Return final object:
{
  classification,
  confidence,
  reasoning,
  commercialSignal,
  watermarkLikelyRemoved,
  severity,
  similarityScore
}

Constraints:
- Keep pure logic
- No external dependencies beyond Gemini
Phase 3 — Prompt Engineering Layer
What you build

/lib/prompts.ts

Tasks
Move prompt into a separate file
Refine for:
consistency
strict JSON output
short reasoning
AntiGravity Prompt (Phase 3)
Create `/lib/prompts.ts`.

Export a constant `CLASSIFICATION_PROMPT_TEMPLATE`.

Requirements:
- System + user prompt structure
- Forces JSON-only output
- Includes:
  rights tier
  page context
  match type
- Clear definitions for:
  AUTHORIZED
  UNAUTHORIZED
  EDITORIAL_FAIR_USE
  NEEDS_REVIEW

Ensure:
- No markdown in output
- Deterministic structure
- Short reasoning (1–2 sentences)
Phase 4 — Test Harness (Critical for Accuracy)
What you build

/lib/classify.test.ts

Tasks
Write 5 manual test cases:
piracy
news article
official reuse
meme edit
ambiguous blog
Log:
classification
confidence
reasoning
AntiGravity Prompt (Phase 4)
Create `/lib/classify.test.ts`.

Requirements:
- Import classifyViolation
- Create 5 test scenarios:
  1. Unauthorized commercial reuse
  2. Editorial news usage
  3. Official repost
  4. Meme/transformed image
  5. Ambiguous blog

- For each:
  - Call function
  - console.log result

Purpose:
- Manual prompt tuning
- No testing framework needed
Phase 5 — Violation Detail Page (Frontend)
What you build

/app/violations/[id]/page.tsx

Responsibilities

Display AI output clearly:

Must show:
URL
classification badge
severity chip
confidence %
similarity score
reasoning
Add:
signal chips:
commercial
watermark removed
AntiGravity Prompt (Phase 5)
Build `/app/violations/[id]/page.tsx` in Next.js 14.

Requirements:
- Server component
- Fetch violation from Firestore (assume data exists)

Display:
- Match URL (clickable)
- Severity chip
- Classification badge
- Confidence bar (0–100%)
- Similarity score
- Gemini reasoning

Add UI sections:
- "AI Analysis"
- "Signals" (commercial, watermark removed)

Constraints:
- No dashboard logic
- No scanning logic
- Only detail page
- Use Tailwind + shadcn/ui
Phase 6 — Status Update API
What you build

/api/violations/[id]/status

Tasks
Update status:
resolved
disputed
false_positive
Write audit log entry
AntiGravity Prompt (Phase 6)
Create `/api/violations/[id]/status/route.ts`.

Requirements:
- POST endpoint
- Input:
  { status: 'resolved' | 'disputed' | 'false_positive', reviewedBy: string }

- Update Firestore violation document
- Insert audit log entry:
  timestamp, action, actor, prev_state, new_state

Constraints:
- Use Firebase Admin SDK
- Proper error handling
- No UI logic
Phase 7 — (Optional High-Impact) Hybrid Scoring Hook

Only if time allows.

What you add

Support optional input:

hashSimilarity?: number
Combine:
finalScore =
  0.6 * confidence +
  0.4 * hashSimilarity
AntiGravity Prompt (Phase 7)
Extend classifyViolation to accept optional `hashSimilarity`.

If provided:
- Compute:
  finalScore = 0.6 * confidence + 0.4 * hashSimilarity

- Override similarityScore = finalScore * 100

Keep backward compatibility if hashSimilarity is missing.
Final Execution Order
Phase 1 → Gemini integration
Phase 2 → severity + similarity
Phase 3 → prompt separation
Phase 4 → testing
Phase 5 → UI
Phase 6 → status API
Phase 7 → hybrid scoring (optional)
Your Scope Boundary (Important)

You should NOT touch:

/api/scan
Firebase setup
Auth
Asset upload
Dashboard analytics
Cloud Vision integration
One-Line Summary

You are building:

The decision engine that determines whether detected media usage is a violation, how serious it is, and clearly explains it to the user.