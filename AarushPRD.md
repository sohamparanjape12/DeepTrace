PRD — SportShield: Digital Sports Media
Protection Platform

MY WORK IS FOR AARUSH, IN THIS PROJECT I AM AARUSH AND I HAVE TO DO THE WORK OF AARUSH

Your role remains the intelligence + decision-making layer, even though this version focuses more on hashing instead of Gemini-first detection. You are responsible for how the system decides, scores, explains, and acts on detected matches.

1. Multi-Hash Detection Logic (Core Responsibility)
What you build

The similarity engine that combines:

pHash
dHash
bHash
Your task
Design a weighted scoring function
Normalize hash distances → similarity %
Output a final confidence score (0–100%)
Example responsibility
Input: hash distances from pHash, dHash, bHash  
Output: final similarity score (e.g., 92%)
You decide:
How much weight each hash gets
How to handle edge cases (cropping, filters)
2. Similarity Threshold & Classification System

You define what counts as a match.

Implement:

90% → High confidence (definite reuse)

75–90% → Likely match
<75% → Ignore
Extend this into:
FLAGGED vs SAFE classification
Possibly:
STRONG_MATCH
WEAK_MATCH
NO_MATCH
3. Video Detection Logic
What you handle:
Frame-level comparison
Tasks:
Decide:
how many frames to sample (every 1–2 sec)
how to aggregate scores
Example:
Take top K matching frames → average similarity
Output:
Final video similarity score
4. Detection Decision Engine

You are responsible for:

Turning raw similarity into decisions:
Should this trigger an alert?
How confident is the system?
You define:
Alert threshold
False positive handling
5. Detection Event Structuring
You define what gets stored:
{
  "similarity": 0.92,
  "status": "FLAGGED",
  "confidence_level": "HIGH"
}
Ensure:
Consistent format
Clear meaning for frontend
6. Real-Time Alert Logic
Your role:
Decide when alerts fire
Implement:
Trigger only if:
similarity > threshold
Attach:
similarity score
platform
timestamp
7. Content Comparison Logic (Support UI)

You don’t build UI fully, but you define:

What data is shown:
similarity %
match type
Possibly:
highlight strongest matching frames (for video)
8. Takedown Decision Support

You help power:

Legal workflow by providing:
similarity score
confidence level
This feeds:
DMCA notice generation
9. Testing & Accuracy Optimization (Critical for judging)

You must:

Test against:
cropped images
resized images
filtered images
compressed videos
Optimize:
weights of hashes
thresholds

Goal:

Achieve >85% detection accuracy

10. (Optional Advanced) Hybrid AI Layer

If you extend the project (strong for winning):

You can add:

AI-based verification on top of hashes

Example:

Hash match → AI verifies context → final decision
Your Role in One Line

You are responsible for:

Designing the detection brain — how similarity is calculated, interpreted, and turned into alerts and actions.

How Your Role Differs from Others
Backend person → builds pipeline
Frontend person → shows results
You → decide if the result is correct and meaningful
What Judges Will Notice About Your Work

Focus on:

1. Smart similarity scoring (not just raw hashes)
2. Low false positives
3. Clear thresholds and logic
4. Handling edited media well
5. Consistent detection results

If needed, next step can be:

designing your exact weighted hash formula
or 
giving production-ready similarity + threshold code
in the 16 page doc i sent u, the tech stack is fixed, the prd i gave u rn was just a brainstorm about it, but the stuff in the 16 page document is absolute and cant be changed, i just want to know what sort of features overlap and i can implement while keeping the stack same

Understood. Treat the 16-page PRD (SportShield) as fixed, and use the MediaGuard brainstorm only to extract ideas that fit without changing the stack (Next.js + Firebase + Cloud Vision + Gemini + FAISS).

Below is a clean mapping of what overlaps and what you (Aarush) can implement directly.

1. Core Overlap: Detection → Classification → Action

Both docs share the same pipeline:

MediaGuard Idea	SportShield Equivalent	You Can Implement
Multi-hash detection	Cloud Vision + embeddings	Add hash scoring as extra signal
Similarity %	Gemini confidence + severity	Add explicit similarity score field
Detection decision	Gemini classification	Combine both → hybrid decision
Alerts	Firestore alerts	Same, but smarter trigger logic
Takedown workflow	Violation + review	Add legal notice generator (UI feature)
2. Features You Can Add WITHOUT Changing Tech Stack
2.1 Hybrid Detection (Biggest Upgrade)
Already in PRD:
Cloud Vision → finds matches
Gemini → classifies
Add from brainstorm:
pHash + dHash scoring
Your role:

Combine both:

Final Score = 
  (Vision match strength) +
  (Hash similarity) +
  (Gemini confidence)
Result:
Much stronger detection credibility
Judges see “layered intelligence”
2.2 Explicit Similarity Score (Missing in PRD)

PRD gives:

classification
confidence

Add:

similarity_score: 0–100%
How:
Normalize:
hash similarity
Gemini confidence
Why:
Makes system more interpretable
Matches hackathon judging metric (>85%)
2.3 Weighted Multi-Signal Scoring (Your Core Contribution)

Extend severity logic into:

score =
  w1 * hash_similarity +
  w2 * gemini_confidence +
  w3 * match_type_weight +
  w4 * commercial_signal

You already control:

severity scoring → just upgrade it
2.4 Content Comparison Viewer (UI + Logic Overlap)
PRD already has:
asset + violation detail
Add:
side-by-side comparison:
original image
detected image (URL)
You provide:
similarity %
match type
reasoning
2.5 Improved Alert Logic

Current PRD:

alert if severity ≥ HIGH

Upgrade using brainstorm:

Trigger alert if:

(similarity > threshold AND UNAUTHORIZED)
OR
(CRITICAL severity)

This reduces:

false positives
noisy alerts
2.6 Video Frame Logic (Partial Adaptation)

PRD does not explicitly include video analysis.

But you can simulate/adapt lightly:

Without changing stack:
Treat multiple matches (from Vision API) like “frames”
Aggregate:
Top K matches → average confidence

This mimics:

MediaGuard frame aggregation
without FFmpeg
2.7 Detection Confidence Bands (Better UX)

Add labels:

90%+ → Strong Match
75–90% → Likely Match
<75% → Weak Match

Map them to:

severity
UI badges
2.8 Takedown Workflow (Easy Win Feature)

PRD has:

violation tracking

You can add:

“Generate Notice” button

Auto-fill:

asset owner
violation URL
reasoning
severity

This is pure frontend + template logic
(no stack change)

2.9 False Positive Reduction Layer

Use brainstorm idea:

Before marking UNAUTHORIZED:

check:
editorial context
news keywords

You already do this via Gemini → just refine prompt.

2.10 Analytics Upgrade

Add from brainstorm:

similarity distribution graph
detection confidence trends

You already have:

dashboard → just extend metrics
3. What You SHOULD NOT Implement (Stack Conflict)

Avoid these from brainstorm:

❌ OpenCV pipeline
❌ FFmpeg video processing
❌ FastAPI backend
❌ SQLite
❌ Real scraping

Because PRD fixes:

Firebase + Next.js + Google APIs
4. Your Final Responsibility (Refined)

After merging both docs, your role becomes:

You own a Hybrid Intelligence Layer

You decide:

How similarity is calculated (hash + AI)
How confident the system is
When something becomes a violation
How severe it is
How it is explained to the user
5. High-Impact Features You Should Definitely Do

If time is limited, prioritize:

Hybrid scoring (hash + Gemini)
Similarity % output
Improved severity logic
Clean violation detail page with reasoning
Takedown notice generator
6. One-Line Summary

You are not replacing the PRD — you are:

strengthening it by adding a similarity scoring layer and better decision logic on top of the existing AI pipeline.

Hackathon: Build with AI: Solution Challenge 2026 (Hack2Skill × GDG) Problem
Domain: Digital Asset Protection — Protecting the Integrity of Digital Sports Media
Submission Deadline: April 27, 2026 Team: Soham (Full Stack), Mitansh, Aarush, Patil
1. Problem Statement
Sports organizations generate massive volumes of high-value digital media — match
photos, highlight clips, player portraits, broadcast stills — that scatter across social
platforms, news sites, and third-party apps within minutes of publication. Current tools
provide no systematic way to track whether that content is being used without
authorization, watermark-stripped, or repurposed commercially without license.
The gap: No scalable, near-real-time pipeline exists that can (a) fingerprint official
media at upload, (b) continuously scan the internet for unauthorized usage, and (c)
intelligently classify violations vs. legitimate editorial use.
2. Solution Overview — SportShield
SportShield is a Next.js web platform that lets sports organizations upload and register
their official digital assets, then automatically monitors the internet for unauthorized use
using a layered AI pipeline powered by Google Cloud.
Core Value Loop
Upload Asset → Register Fingerprint → Automated Internet Scan →
AI Violation Classification → Real-Time Alert → Dashboard Review
3. Tech Stack
Layer
Technology
Justification
Frontend Next.js 14 (App Router) Full-stack, SSR, API routes
Styling Tailwind CSS + shadcn/ui Rapid, professional UI
Auth Firebase Auth Google-native, fast setup
Database Firebase Firestore Real-time sync, no schema friction
File Storage Firebase Storage Direct asset upload
Internet
Scan
Google Cloud Vision API
(Web Detection)
1,000 free units/month — more than
enough for a hackathon
AI
Embedding
Gemini Embedding API
(text-embedding-004)
Free tier via Google AI Studio, replaces
Vertex AI Embeddings
Vector
Search
FAISS (in-memory, Node.js
via faiss-node)
Free, no infra, runs inside Cloud Run —
drop Vertex AI Vector Search
Violation
Classifier Gemini 1.5 Flash Free tier (15 RPM / 1M TPM) — Flash over
Pro keeps costs at zero
Background
Jobs Cloud Functions (2nd gen) 2M free invocations/month
Hosting Vercel (free hobby tier) Easier Next.js deploy than Cloud Run;
zero config, zero cost
Monitoring Firestore audit log Cloud Logging has costs at scale —
Firestore is free within limits
4. User Roles
Role Description
Org Admin Uploads assets, views violations, manages alerts
Reviewer Triages flagged violations, marks resolved/disputed
System (Automated) Runs scans, classifies, fires alerts
5. Feature Specification
5.1 Asset Registration
Org uploads image via drag-and-drop
System generates:
pHash + dHash fingerprint (stored in Firestore)
Vertex AI multimodal embedding (stored in Vector Search index)
Metadata: owner, timestamp, tags, rights tier (editorial / commercial / all-rights)
Asset stored in Firebase Storage with access control
Upload confirmation + unique Asset ID returned
Fields per asset:
asset_id        string   auto-generated UUID
owner_org       string   organization name
uploaded_at     timestamp
rights_tier     enum     [editorial, commercial, all_rights, no_reuse]
tags            string[] sport, event, player, date
phash           string   perceptual hash
embedding_id    string   Vertex AI index reference
scan_status     enum     [pending, scanning, clean, violations_found]
5.2 Internet Scan Pipeline
Triggered in two ways:
1. On upload — immediate first scan
2. Scheduled — Cloud Function cron every 24h per asset (configurable)
Pipeline steps:
Step 1 — Cloud Vision Web Detection
  Input:  Asset image (GCS URI)
  Output: fullMatchingImages[], partialMatchingImages[], pagesWithMatchingImages[]
  Time:   ~200ms
Step 2 — Gemini 1.5 Pro Vision Classification
  Input:  Each match URL + original asset + rights_tier
  Prompt: "Given this official sports image (rights: {rights_tier}),
           analyze the matched URL page context.
           Classify: [AUTHORIZED | UNAUTHORIZED | EDITORIAL_FAIR_USE | NEEDS_REVIEW]
           Reason briefly. Return JSON."
  Output: classification, confidence, reasoning
  Time:   ~1–3s per match (batched)
Step 3 — Severity Scoring
  final_score = match_type_weight + (1 - confidence_in_authorization) + commercial_signal
  Severity:  CRITICAL (>0.85) | HIGH (0.7–0.85) | MEDIUM (0.5–0.7) | LOW (<0.5)
Step 4 — Write to Firestore violations collection
Step 5 — Fire alert if severity >= HIGH
5.3 Violation Record Schema
violation_id      string
asset_id          string   (ref)
detected_at       timestamp
match_url         string   URL where image was found
match_type        enum     [full_match, partial_match, visually_similar]
page_context      string   title/description of the page
gemini_class      enum     [AUTHORIZED, UNAUTHORIZED, EDITORIAL_FAIR_USE, NEEDS_REVIEW]
gemini_reasoning  string
severity          enum     [CRITICAL, HIGH, MEDIUM, LOW]
status            enum     [open, resolved, disputed, false_positive]
reviewed_by       string   (user_id, nullable)
5.4 Dashboard
Asset Library View
Grid of registered assets with scan status badges
Filter by sport, rights tier, scan status
Click asset → detail view with all violations
Violations Feed
Chronological feed of all open violations
Filter by severity, asset, date range
Each card shows: thumbnail, matched URL, Gemini classification, severity badge
Actions: Mark Resolved / Dispute / Flag False Positive
Analytics Panel
Total assets registered
Total violations found (by severity)
Top infringing domains
Violation trend chart (7d / 30d)
Geographic heatmap of violation sources (from URL TLD analysis)
Alert Settings
Email alert threshold (severity level)
Slack webhook (optional, bonus)
Daily digest toggle
5.5 Real-Time Alerts
Firestore onWrite Cloud Function triggers on new CRITICAL or HIGH violation
Sends email via Firebase Extensions (Trigger Email) or SendGrid
Dashboard shows live notification badge via Firestore real-time listener
5.6 Audit Log
Every scan, classification decision, and status change is written to an immutable
audit_log collection with:
Timestamp
Action type
Actor (user ID or “system”)
Asset ID + violation ID
Previous state → new state
This is the “transparency and disputes” requirement from the problem statement.
6. Page Map (Next.js Routes)
/                         Landing / login
/dashboard                Overview analytics
/assets                   Asset library grid
/assets/upload            Upload + register new asset
/assets/[id]              Asset detail + violation list
/violations               Global violations feed
/violations/[id]          Single violation detail + Gemini reasoning
/settings                 Org profile, alert thresholds, API keys
/api/scan/[assetId]       Internal API route → triggers scan pipeline
/api/classify             Internal API route → calls Gemini
/api/webhooks/alert       Outbound alert dispatcher
7. MVP Scope vs. Stretch Goals
MVP (Must ship by April 27)
Asset upload + fingerprint registration
Cloud Vision Web Detection scan (on-upload)
Gemini Vision classification of matches
Violations feed with severity
Dashboard with basic analytics
Firebase Auth (Google Sign-In)
Email alert on CRITICAL violation
Stretch Goals (Add if time allows)
Scheduled re-scan (Cloud Function cron)
Geographic heatmap of violations
Slack webhook integration
Watermark embed + detection (Cloud Vision SafeSearch + custom model)
Bulk asset upload (CSV manifest)
“Find where my image is used” reverse search API (public-facing)
Export violation report as PDF
8. 9-Day Build Plan
Day 1–2 — Infrastructure + Auth (Soham + Patil)
Firebase project setup (Auth, Firestore, Storage, Functions)
Cloud Vision API enabled + service account configured
Vertex AI project + multimodal embedding model enabled
Next.js project scaffold with Tailwind + shadcn/ui
Firebase Auth (Google Sign-In) working
Basic layout shell: sidebar nav, header
Day 3–4 — Asset Upload + Scan Pipeline (Soham + Mitansh)
Asset upload UI (drag-and-drop → Firebase Storage)
Fingerprint generation on upload (pHash via Sharp + custom hash)
Cloud Vision Web Detection API call on upload
Raw results written to Firestore
Vertex AI embedding call + store embedding ID
Day 5–6 — Gemini Classification + Violations (Aarush + Patil)
Gemini 1.5 Pro Vision API integration
Classification prompt engineering + JSON response parsing
Severity scoring logic
Violations collection populated
Violations feed UI (list + filter)
Violation detail page with Gemini reasoning displayed
Day 7 — Dashboard + Alerts (Mitansh + Aarush)
Analytics panel (asset count, violation counts, trend chart)
Top infringing domains list
Email alert Cloud Function (Trigger Email extension)
Real-time notification badge via Firestore listener
Day 8 — Polish + Integration QA (Full Team)
End-to-end test with real sports images
Edge case handling (no matches found, Gemini API timeout)
Loading states, error states, empty states
Mobile responsiveness check
Firestore security rules tightened
Day 9 — Demo Video + Submission (Soham + full team review)
Record 2-minute demo (script below)
Write submission description
Deploy to Cloud Run
Final QA on deployed URL
9. Team Task Division
Soham — Full Stack + UI/UX + Design
Focus: Next.js App Router structure, API routes, Cloud Vision integration, UI/UX design,
Vercel deployment
Scaffolds the Next.js project, folder structure, and Tailwind/shadcn/ui design system
Owns /api/* routes and the scan pipeline orchestration
Handles UI/UX design — layout, component design language, spacing, visual
consistency
Deploys to Vercel, manages GCP project service accounts
Records demo video
Agentic AI Prompt — use this in Cursor / Claude to build your part:
You are building "SportShield", a Next.js 14 App Router web app for sports media IP protection.
Your job: scaffold the full project and build the scan pipeline API.
Tech stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Firebase Admin SDK,
Google Cloud Vision API (Web Detection), Gemini 1.5 Flash API (Google AI Studio).
Tasks:
1. Create the project structure:
   - /app layout with sidebar nav (Assets, Violations, Dashboard, Settings)
   - Shared components: StatusBadge, SeverityChip, AssetCard, PageHeader
   - Design tokens in tailwind.config.ts (dark navy + electric blue + red accent palette)
2. Build /api/scan/[assetId]/route.ts:
   - Fetch asset from Firestore by assetId (get storage URL)
   - Call Google Cloud Vision API imageAnnotator.webDetection({ image: { source: { imageUri } } })
   - Parse fullMatchingImages, partialMatchingImages, pagesWithMatchingImages from response
   - For each match, write a raw violation document to Firestore /violations collection
   - Trigger /api/classify for each match (fire-and-forget via fetch)
   - Return { matchesFound: number, scanId: string }
3. Build /api/classify/route.ts:
   - Accept POST body: { violationId, matchUrl, pageTitle, assetRightsTier, ownerOrg, matchType }
   - Call Gemini 1.5 Flash with the classification prompt defined in Section 10 of the PRD
   - Parse JSON response, update the Firestore violation document with gemini_class, gemini_reasoning, severity, confidence
   - Severity scoring: CRITICAL if confidence > 0.85 and UNAUTHORIZED, HIGH if 0.7–0.85, else MEDIUM/LOW
4. All Firestore writes use Firebase Admin SDK server-side (never client SDK in API routes).
5. Use environment variables from .env.local (see PRD Section 13).
Return clean, typed TypeScript. Use async/await throughout. Add JSDoc comments on each function.
Mitansh — Frontend + Dashboard + Data Visualisation
Focus: Asset library UI, upload flow, dashboard analytics charts, real-time violation
feed
Builds asset library grid, upload drag-and-drop (Firebase Storage direct upload)
Dashboard charts: violation trend (Recharts LineChart), severity breakdown
(PieChart), top infringing domains (BarChart)
Real-time violation feed via Firestore onSnapshot listener
Email alert settings UI in /settings page
Agentic AI Prompt — use this in Cursor / Claude to build your part:
You are building the frontend for "SportShield", a Next.js 14 App Router app.
Soham has already set up the project scaffold, Tailwind, shadcn/ui, and Firebase client config.
Your job: build the asset library, upload flow, and dashboard analytics UI.
Tech stack: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Firebase client SDK (Firestore + Storage), Recharts.
Tasks:
1. /app/assets/page.tsx — Asset Library
   - Fetch all assets from Firestore /assets where owner_org == current user's org
   - Display as a responsive grid of AssetCards (thumbnail, rights_tier badge, scan_status badge, last_scanned_at)
   - Filter bar: by sport tag, rights_tier, scan_status
   - "Upload New Asset" button links to /assets/upload
2. /app/assets/upload/page.tsx — Upload Flow
   - Drag-and-drop zone (use react-dropzone)
   - Form fields: tags (multi-select: sport, event, player), rights_tier (select: editorial / commercial / all_rights / no_reuse)
   - On submit: upload file to Firebase Storage at /assets/{uuid}/{filename}
   - Write asset document to Firestore /assets collection (see PRD schema)
   - After Firestore write, call POST /api/scan/{assetId} to trigger the first scan
   - Show progress states: uploading → registering → scanning → done
3. /app/dashboard/page.tsx — Analytics
   - Summary cards: Total Assets, Open Violations, Critical Violations, Scans Today
   - Recharts LineChart: violations over last 7 days (pull from Firestore, group by day)
   - Recharts PieChart: violation breakdown by severity (CRITICAL / HIGH / MEDIUM / LOW)
   - Recharts BarChart: top 5 infringing domains (parse domain from violation match_url)
4. /app/violations/page.tsx — Violations Feed
   - Use Firestore onSnapshot for real-time updates
   - Each card: asset thumbnail (small), match_url (truncated), gemini_class badge, severity chip, detected_at relative time
   - Filter: by severity, by status (open/resolved), by asset
   - Click card → /violations/[id]
Use 'use client' only where necessary (data fetching components). Keep server components where possible.
Style consistently with the design tokens Soham set up. No hardcoded colors — use Tailwind classes only.
Aarush — Gemini Integration + Violation Detail + Severity Logic
Focus: Gemini 1.5 Flash classification module, violation detail pages, severity scoring,
prompt iteration
Owns the classification API route end-to-end (in coordination with Soham’s scaffold)
Builds the violation detail page showing Gemini’s full reasoning
Iterates on the classification prompt until accuracy is strong on test images
Writes severity scoring function
Agentic AI Prompt — use this in Cursor / Claude to build your part:
You are building the AI classification layer for "SportShield", a Next.js 14 app for sports media IP protection.
Your job: build the Gemini classification module and the violation detail UI.
Tech stack: Next.js 14, TypeScript, Google Generative AI SDK (@google/generative-ai), Firebase Admin SDK, Tailwind CSS, shadcn/ui.
Tasks:
1. /lib/classify.ts — Core classification function
   - Export async function classifyViolation(params: ClassifyParams): Promise<ClassificationResult>
   - ClassifyParams: { matchUrl, pageTitle, pageDescription, matchType, rightsTier, ownerOrg, tags }
   - ClassificationResult: { classification, confidence, reasoning, commercialSignal, watermarkLikelyRemoved, severity }
   - Call Gemini 1.5 Flash using the exact prompt in PRD Section 10
   - Parse the JSON response safely (wrap in try/catch, validate fields)
   - Derive severity from classification + confidence:
       CRITICAL: UNAUTHORIZED and confidence >= 0.85
       HIGH:     UNAUTHORIZED and confidence 0.7–0.84, or NEEDS_REVIEW and confidence >= 0.85
       MEDIUM:   NEEDS_REVIEW, or EDITORIAL_FAIR_USE with commercial_signal = true
       LOW:      EDITORIAL_FAIR_USE or AUTHORIZED
2. /lib/classify.test.ts — Manual test cases
   - Write 5 test cases covering: clear piracy, editorial news use, official team repost, meme overlay, ambiguous commercial blog
   - Log Gemini's classification and confidence for each
   - This is for your own prompt tuning, not production
3. /app/violations/[id]/page.tsx — Violation Detail Page
   - Fetch violation document from Firestore by id (server component)
   - Show: matched URL (clickable), match type, detected_at, severity chip
   - "AI Analysis" card: gemini_class badge, confidence percentage bar, full gemini_reasoning text
   - "Signals" row: Commercial Signal chip, Watermark Removed chip (conditional)
   - Action buttons: Mark Resolved / Dispute / Flag False Positive (POST to /api/violations/[id]/status)
   - Linked asset card at top (asset thumbnail + rights_tier)
4. /api/violations/[id]/status/route.ts
   - Accept POST { status: 'resolved' | 'disputed' | 'false_positive', reviewedBy: string }
   - Update Firestore violation document
   - Write to /audit_log collection
Keep the Gemini prompt in a separate /lib/prompts.ts file so it's easy to iterate without touching logic.
Return TypeScript with full types. No any types.
Patil — Firebase + Cloud Functions + Auth + Alerts
Focus: Firebase project setup, Firestore schema + security rules, Cloud Functions,
email alerts, environment config
Sets up Firebase project (Auth, Firestore, Storage, Functions)
Deploys Cloud Functions: alert trigger on new CRITICAL violation, scheduled rescan
cron
Configures Firebase Auth with Google Sign-In
Writes Firestore security rules
Manages .env files across local and Vercel
Agentic AI Prompt — use this in Cursor / Claude to build your part:
You are setting up the Firebase backend and Cloud Functions for "SportShield", a Next.js 14 app.
Your job: Firebase config, Firestore schema + security rules, Cloud Functions for alerts and scheduled scans.
Tech stack: Firebase Admin SDK, Firebase Functions (2nd gen), Firestore, Firebase Auth, Nodemailer or Firebase Trigger Email extension.
Tasks:
1. /firestore.rules — Security Rules
   Write rules so that:
   - Only authenticated users can read their own org's assets and violations
     (match /assets/{id} { allow read, write: if request.auth != null && resource.data.owner_org == request.auth.token.org }
   - audit_log is write-only from server (no client writes)
   - /organizations/{id} readable only by members of that org
2. /functions/src/onViolationCreated.ts — Alert trigger
   - Firestore onCreate trigger on /violations/{violationId}
   - If new violation.severity == 'CRITICAL' or 'HIGH':
     - Fetch the parent asset's owner_org
     - Fetch org's alert_email and alert_threshold from /organizations
     - If severity meets threshold: send email via Nodemailer (SMTP) or Firebase Trigger Email extension
     - Email content: violation URL, asset name, severity, link to /violations/{id}
3. /functions/src/scheduledRescan.ts — Scheduled rescan
   - Cloud Scheduler cron: runs every 24 hours
   - Query Firestore for all assets where last_scanned_at < 24h ago
   - For each, call the Next.js /api/scan/{assetId} endpoint (use NEXT_PUBLIC_APP_URL env var)
   - Log result to /scans collection
4. /app/api/auth/[...nextauth] — OR Firebase Auth setup
   - Configure Firebase Auth with Google provider
   - On first sign-in, create /organizations/{uid} document with default fields
   - Store org_id in the user's Firebase custom claims
5. /firestore-schema.md
   - Write out the full collection structure from PRD Section 12 as a reference doc for the team
   - Include example documents for each collection
Use Firebase Functions 2nd gen (onDocumentCreated from firebase-functions/v2/firestore).
Use environment variables for SMTP credentials — never hardcode.
Add error handling and logging (functions.logger) to every function.
10. Gemini Prompt Design (Core Intelligence)
SYSTEM:
You are a digital rights analyst for a sports media organization.
You classify whether a found image usage constitutes an IP violation.
Always respond with valid JSON only. No markdown, no preamble.
USER:
Original asset context:- Rights tier: {rights_tier}  (e.g. "commercial" = no reuse without license)- Sport/event: {tags}- Owner organization: {owner_org}
Matched page context:- URL: {match_url}- Page title: {page_title}- Page description: {page_description}- Match type: {match_type}  (full_match | partial_match | visually_similar)
Classify the usage as one of:
  AUTHORIZED        - confirmed licensed or official use
  UNAUTHORIZED      - clear commercial or redistributive use without license
  EDITORIAL_FAIR_USE - news/commentary use, likely covered by fair use
  NEEDS_REVIEW      - ambiguous, human review required
Respond with:
{
  "classification": "...",
  "confidence": 0.0–1.0,
  "reasoning": "1–2 sentence explanation",
  "commercial_signal": true|false,
  "watermark_likely_removed": true|false
}
11. Demo Video Script (2 minutes)
Time Action Narration
0:00
0:10
Show
landing page
“Sports organizations lose millions to unauthorized use of their
media every year. SportShield changes that.”
0:10
0:30
Upload 2
official
match
photos
“When an asset is uploaded, SportShield fingerprints it and
immediately scans the entire internet using Google Cloud
Vision.”
0:30
0:50
Show
violations
feed
populating
“In seconds, we find every place that image appears — full
copies, cropped versions, filtered variants.”
0:50
1:15
Click a
CRITICAL
violation
“Gemini Vision analyzes the page context and classifies the
usage. Here — commercial use, watermark removed. Severity:
Critical.”
1:15
1:35
Show
dashboard
analytics
“The dashboard gives rights teams a real-time view of their
exposure — which domains are infringing, severity trends,
geographic spread.”
1:35
1:50
Show email
alert
“The moment a critical violation is detected, the rights team is
alerted automatically.”
1:50
2:00
Show audit
log
“Every decision is logged immutably — giving organizations a
transparent trail for dispute and legal action.”
12. Firestore Collection Structure
/organizations/{org_id}
  name, plan, created_at, alert_email, alert_threshold
/assets/{asset_id}
  owner_org, uploaded_at, rights_tier, tags,
  phash, embedding_id, storage_url,
  scan_status, last_scanned_at
/violations/{violation_id}
  asset_id, detected_at, match_url, match_type,
  page_context, gemini_class, gemini_reasoning,
  severity, status, reviewed_by
/audit_log/{log_id}
  timestamp, action, actor, asset_id,
  violation_id, prev_state, new_state
/scans/{scan_id}
  asset_id, triggered_at, trigger_type,
  raw_vision_response, matches_count, status
13. Environment Variables
# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=   # path to service account JSON (local only)
# Firebase (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
# Firebase Admin (server-side)
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
# Vertex AI
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_EMBEDDING_MODEL=multimodalembedding@001
# Gemini
GEMINI_MODEL=gemini-1.5-pro
# Alerts
SENDGRID_API_KEY=                  # if not using Trigger Email extension
14. Judging Criteria Alignment
Criterion How SportShield Addresses It
Real-world impact Directly solves stated problem domain; sports IP theft is a
documented billion-dollar problem
Use of Google
technologies
Cloud Vision, Vertex AI, Gemini, Firebase, Cloud Run, Cloud
Functions
Technical
execution
Layered pipeline (fingerprint → web detection → AI classification)
not just a single API call
Scalability thinking Cloud-native, Firestore + Vector Search scales horizontally, async
Cloud Functions
Innovation Gemini Vision as reasoning layer on top of detection is novel — not
just “found or not found”
Demo quality Clear before/after narrative, live violation detection, Gemini
reasoning visible