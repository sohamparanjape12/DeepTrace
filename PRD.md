<<<<<<< HEAD
# PRD — DeepTrace: Digital Sports Media Protection Platform

**Hackathon:** Build with AI: Solution Challenge 2026 (Hack2Skill × GDG)
**Problem Domain:** Digital Asset Protection — Protecting the Integrity of Digital Sports Media
**Submission Deadline:** April 27, 2026
**Team:** Soham (Full Stack), Mitansh, Aarush, Patil

---

## 1. Problem Statement

Sports organizations generate massive volumes of high-value digital media — match photos, highlight clips, player portraits, broadcast stills — that scatter across social platforms, news sites, and third-party apps within minutes of publication. Current tools provide no systematic way to track whether that content is being used without authorization, watermark-stripped, or repurposed commercially without license.

**The gap:** No scalable, near-real-time pipeline exists that can (a) fingerprint official media at upload, (b) continuously scan the internet for unauthorized usage, and (c) intelligently classify violations vs. legitimate editorial use.

---

## 2. Solution Overview — DeepTrace

DeepTrace is a Next.js web platform that lets sports organizations upload and register their official digital assets, then automatically monitors the internet for unauthorized use using a layered AI pipeline powered by Google Cloud.

### Core Value Loop

```
Upload Asset → Register Fingerprint → Automated Internet Scan →
AI Violation Classification → Real-Time Alert → Dashboard Review
```

---

## 3. Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| Frontend | Next.js latest (App Router) | Full-stack, SSR, API routes |
| Styling | Tailwind CSS + shadcn/ui | Rapid, professional UI |
| Auth | Firebase Auth | Google-native, fast setup |
| Database | Firebase Firestore | Real-time sync, no schema friction |
| File Storage | Cloudinary | 25GB free tier, transformation API, easy global delivery |
| Internet Scan | Google Cloud Vision API (Web Detection) | 1,000 free units/month — more than enough for a hackathon |
| AI Embedding | Gemini Embedding API (`text-embedding-004`) | Free tier via Google AI Studio, replaces Vertex AI Embeddings |
| Vector Search | FAISS (in-memory, Node.js via `faiss-node`) | Free, no infra, runs inside Cloud Run — drop Vertex AI Vector Search |
| Violation Classifier | Gemini 1.5 Flash | Free tier (15 RPM / 1M TPM) — Flash over Pro keeps costs at zero |
| Background Jobs | Cloud Functions (2nd gen) | 2M free invocations/month |
| Hosting | Vercel (free hobby tier) | Easier Next.js deploy than Cloud Run; zero config, zero cost |
| Monitoring | Firestore audit log | Cloud Logging has costs at scale — Firestore is free within limits |

---

## 4. User Roles

| Role | Description |
|---|---|
| **Org Admin** | Uploads assets, views violations, manages alerts |
| **Reviewer** | Triages flagged violations, marks resolved/disputed |
| **System (Automated)** | Runs scans, classifies, fires alerts |

---

## 5. Feature Specification

### 5.1 Asset Registration

- Org uploads image via drag-and-drop
- System generates:
  - pHash + dHash fingerprint (stored in Firestore)
  - Vertex AI multimodal embedding (stored in Vector Search index)
  - Metadata: owner, timestamp, tags, rights tier (editorial / commercial / all-rights)
- Asset stored in Firebase Storage with scoped path: `assets/{userId}/{assetId}/{fileName}`
- Upload confirmation + unique Asset ID returned

**Fields per asset:**
```
asset_id        string   auto-generated UUID
owner_id        string   user ID for isolation
owner_org       string   organization name
uploaded_at     timestamp
rights_tier     enum     [editorial, commercial, all_rights, no_reuse]
tags            string[] sport, event, player, date
phash           string   perceptual hash
embedding_id    string   Vertex AI index reference
scan_status     enum     [pending, scanning, clean, violations_found]
```

### 5.2 Internet Scan Pipeline

Triggered in two ways:
1. **On upload** — immediate first scan
2. **Scheduled** — Cloud Function cron every 24h per asset (configurable)

**Pipeline steps:**

```
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
```

### 5.3 Violation Record Schema

```
violation_id      string
owner_id          string   user ID for isolation
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
```

### 5.4 Dashboard

**Asset Library View**
- Grid of registered assets with scan status badges
- Filter by sport, rights tier, scan status
- Click asset → detail view with all violations

**Violations Feed**
- Chronological feed of all open violations
- Filter by severity, asset, date range
- Each card shows: thumbnail, matched URL, Gemini classification, severity badge
- Actions: Mark Resolved / Dispute / Flag False Positive

**Analytics Panel**
- Total assets registered
- Total violations found (by severity)
- Top infringing domains
- Violation trend chart (7d / 30d)
- Geographic heatmap of violation sources (from URL TLD analysis)

**Alert Settings**
- Email alert threshold (severity level)
- Slack webhook (optional, bonus)
- Daily digest toggle

### 5.5 Real-Time Alerts

- Firestore `onWrite` Cloud Function triggers on new CRITICAL or HIGH violation
- Sends email via Firebase Extensions (Trigger Email) or SendGrid
- Dashboard shows live notification badge via Firestore real-time listener

### 5.6 Audit Log

Every scan, classification decision, and status change is written to an immutable `audit_log` collection with:
- Timestamp
- Action type
- Actor (user ID or "system")
- Asset ID + violation ID
- Previous state → new state

This is the "transparency and disputes" requirement from the problem statement.

### 5.7 Data Isolation & Multi-Tenancy
- All data (assets, violations, audit logs) is strictly scoped to the `owner_id` (the authenticated user's UID).
- Users can only access documents where `owner_id == request.auth.uid`.
- This is enforced at both the application level (filtered queries) and the database level (Firestore Security Rules).


---

## 6. Page Map (Next.js Routes)

```
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
```

---

## 7. MVP Scope vs. Stretch Goals

### MVP (Must ship by April 27)

- [x] Asset upload + fingerprint registration
- [x] Cloud Vision Web Detection scan (on-upload)
- [x] Gemini Vision classification of matches
- [x] Violations feed with severity
- [x] Dashboard with basic analytics
- [x] Firebase Auth (Google Sign-In)
- [x] Email alert on CRITICAL violation

### Stretch Goals (Add if time allows)

- [ ] Scheduled re-scan (Cloud Function cron)
- [ ] Geographic heatmap of violations
- [ ] Slack webhook integration
- [ ] Watermark embed + detection (Cloud Vision SafeSearch + custom model)
- [ ] Bulk asset upload (CSV manifest)
- [ ] "Find where my image is used" reverse search API (public-facing)
- [ ] Export violation report as PDF

---

## 8. 9-Day Build Plan

### Day 1–2 — Infrastructure + Auth (Soham + Patil)
- Firebase project setup (Auth, Firestore, Functions) and Cloudinary
- Cloud Vision API enabled + service account configured
- Vertex AI project + multimodal embedding model enabled
- Next.js project scaffold with Tailwind + shadcn/ui
- Firebase Auth (Google Sign-In) working
- Basic layout shell: sidebar nav, header

### Day 3–4 — Asset Upload + Scan Pipeline (Soham + Mitansh)
- Asset upload UI (drag-and-drop → Cloudinary via API route)
- Fingerprint generation on upload (pHash via Sharp + custom hash)
- Cloud Vision Web Detection API call on upload
- Raw results written to Firestore
- Vertex AI embedding call + store embedding ID

### Day 5–6 — Gemini Classification + Violations (Aarush + Patil)
- Gemini 1.5 Pro Vision API integration
- Classification prompt engineering + JSON response parsing
- Severity scoring logic
- Violations collection populated
- Violations feed UI (list + filter)
- Violation detail page with Gemini reasoning displayed

### Day 7 — Dashboard + Alerts (Mitansh + Aarush)
- Analytics panel (asset count, violation counts, trend chart)
- Top infringing domains list
- Email alert Cloud Function (Trigger Email extension)
- Real-time notification badge via Firestore listener

### Day 8 — Polish + Integration QA (Full Team)
- End-to-end test with real sports images
- Edge case handling (no matches found, Gemini API timeout)
- Loading states, error states, empty states
- Mobile responsiveness check
- Firestore security rules tightened

### Day 9 — Demo Video + Submission (Soham + full team review)
- Record 2-minute demo (script below)
- Write submission description
- Deploy to Cloud Run
- Final QA on deployed URL

---

## 9. Team Task Division

### Soham — Full Stack + UI/UX + Design
**Focus:** Next.js App Router structure, API routes, Cloud Vision integration, UI/UX design, Vercel deployment

- Scaffolds the Next.js project, folder structure, and Tailwind/shadcn/ui design system
- Owns `/api/*` routes and the scan pipeline orchestration
- Handles UI/UX design — layout, component design language, spacing, visual consistency
- Deploys to Vercel, manages GCP project service accounts
- Records demo video

**Agentic AI Prompt — use this in Cursor / Claude to build your part:**
```
You are building "DeepTrace", a Next.js latest App Router web app for sports media IP protection.

Your job: scaffold the full project and build the scan pipeline API.

Tech stack: Next.js latest (App Router), TypeScript, Tailwind CSS, shadcn/ui, Firebase Admin SDK,
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
```

---

### Mitansh — Frontend + Dashboard + Data Visualisation
**Focus:** Asset library UI, upload flow, dashboard analytics charts, real-time violation feed

- Builds asset library grid, upload drag-and-drop (Cloudinary API route upload)
- Dashboard charts: violation trend (Recharts LineChart), severity breakdown (PieChart), top infringing domains (BarChart)
- Real-time violation feed via Firestore `onSnapshot` listener
- Email alert settings UI in /settings page

**Agentic AI Prompt — use this in Cursor / Claude to build your part:**
```
You are building the frontend for "DeepTrace", a Next.js latest App Router app.
Soham has already set up the project scaffold, Tailwind, shadcn/ui, and Firebase client config.

Your job: build the asset library, upload flow, and dashboard analytics UI.

Tech stack: Next.js latest, TypeScript, Tailwind CSS, shadcn/ui, Firebase client SDK (Firestore), Cloudinary, Recharts.

Tasks:

1. /app/assets/page.tsx — Asset Library
   - Fetch all assets from Firestore /assets where owner_org == current user's org
   - Display as a responsive grid of AssetCards (thumbnail, rights_tier badge, scan_status badge, last_scanned_at)
   - Filter bar: by sport tag, rights_tier, scan_status
   - "Upload New Asset" button links to /assets/upload

2. /app/assets/upload/page.tsx — Upload Flow
   - Drag-and-drop zone (use react-dropzone)
   - Form fields: tags (multi-select: sport, event, player), rights_tier (select: editorial / commercial / all_rights / no_reuse)
   - On submit: upload file to Cloudinary via /api/assets/upload
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
```

---

### Aarush — Gemini Integration + Violation Detail + Severity Logic
**Focus:** Gemini 1.5 Flash classification module, violation detail pages, severity scoring, prompt iteration

- Owns the classification API route end-to-end (in coordination with Soham's scaffold)
- Builds the violation detail page showing Gemini's full reasoning
- Iterates on the classification prompt until accuracy is strong on test images
- Writes severity scoring function

**Agentic AI Prompt — use this in Cursor / Claude to build your part:**
```
You are building the AI classification layer for "DeepTrace", a Next.js latest app for sports media IP protection.

Your job: build the Gemini classification module and the violation detail UI.

Tech stack: Next.js latest, TypeScript, Google Generative AI SDK (@google/generative-ai), Firebase Admin SDK, Tailwind CSS, shadcn/ui.

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
```

---

### Patil — Firebase + Cloud Functions + Auth + Alerts
**Focus:** Firebase project setup, Firestore schema + security rules, Cloud Functions, email alerts, environment config

- Sets up Firebase project (Auth, Firestore, Functions) and Cloudinary
- Deploys Cloud Functions: alert trigger on new CRITICAL violation, scheduled rescan cron
- Configures Firebase Auth with Google Sign-In
- Writes Firestore security rules
- Manages .env files across local and Vercel

**Agentic AI Prompt — use this in Cursor / Claude to build your part:**
```
You are setting up the Firebase backend and Cloud Functions for "DeepTrace", a Next.js latest app.

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
```

---

## 10. Gemini Prompt Design (Core Intelligence)

```
SYSTEM:
You are a digital rights analyst for a sports media organization.
You classify whether a found image usage constitutes an IP violation.
Always respond with valid JSON only. No markdown, no preamble.

USER:
Original asset context:
- Rights tier: {rights_tier}  (e.g. "commercial" = no reuse without license)
- Sport/event: {tags}
- Owner organization: {owner_org}

Matched page context:
- URL: {match_url}
- Page title: {page_title}
- Page description: {page_description}
- Match type: {match_type}  (full_match | partial_match | visually_similar)

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
```

---

## 11. Demo Video Script (2 minutes)

| Time | Action | Narration |
|---|---|---|
| 0:00–0:10 | Show landing page | "Sports organizations lose millions to unauthorized use of their media every year. DeepTrace changes that." |
| 0:10–0:30 | Upload 2 official match photos | "When an asset is uploaded, DeepTrace fingerprints it and immediately scans the entire internet using Google Cloud Vision." |
| 0:30–0:50 | Show violations feed populating | "In seconds, we find every place that image appears — full copies, cropped versions, filtered variants." |
| 0:50–1:15 | Click a CRITICAL violation | "Gemini Vision analyzes the page context and classifies the usage. Here — commercial use, watermark removed. Severity: Critical." |
| 1:15–1:35 | Show dashboard analytics | "The dashboard gives rights teams a real-time view of their exposure — which domains are infringing, severity trends, geographic spread." |
| 1:35–1:50 | Show email alert | "The moment a critical violation is detected, the rights team is alerted automatically." |
| 1:50–2:00 | Show audit log | "Every decision is logged immutably — giving organizations a transparent trail for dispute and legal action." |

---

## 12. Firestore Collection Structure

```
/organizations/{org_id}
  name, plan, created_at, alert_email, alert_threshold

/assets/{asset_id}
  owner_id, owner_org, uploaded_at, rights_tier, tags,
  phash, embedding_id, storage_url,
  scan_status, last_scanned_at

/violations/{violation_id}
  owner_id, asset_id, detected_at, match_url, match_type,
  page_context, gemini_class, gemini_reasoning,
  severity, status, reviewed_by

/audit_log/{log_id}
  owner_id, timestamp, action, actor, asset_id,
  violation_id, prev_state, new_state

/scans/{scan_id}
  owner_id, asset_id, triggered_at, trigger_type,
  raw_vision_response, matches_count, status
```

---

## 13. Environment Variables

```env
# Google Cloud (Cloud Vision API)
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=   # path to service account JSON (local only)

# Firebase (client-side — safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (server-side only — never expose)
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Gemini (Google AI Studio — free tier)
# Get key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000   # set to Vercel URL in production

# Alerts (use Gmail SMTP App Password for zero cost)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=                  # team Gmail address
SMTP_PASS=                  # Gmail App Password (not account password)
```

> **Cost note:** All services used are on free tiers for hackathon scale.
> Cloud Vision Web Detection: 1,000 free units/month.
> Gemini 1.5 Flash via Google AI Studio: free (15 RPM, 1M TPM).
> Firebase Spark plan: free (Firestore 1GB, Functions 2M invocations). Cloudinary 25GB free tier.
> Vercel Hobby: free. Gmail SMTP: free. Total infra cost = $0.

---

## latest. Judging Criteria Alignment

| Criterion | How DeepTrace Addresses It |
|---|---|
| Real-world impact | Directly solves stated problem domain; sports IP theft is a documented billion-dollar problem |
| Use of Google technologies | Cloud Vision, Gemini 1.5 Flash, Firebase (Auth + Firestore + Storage + Functions) |
| Technical execution | Layered pipeline (fingerprint → web detection → AI classification) not just a single API call |
| Scalability thinking | Cloud-native, Firestore scales horizontally, async Cloud Functions, stateless API routes |
| Innovation | Gemini Vision as reasoning layer on top of detection is novel — not just "found or not found" |
| Demo quality | Clear before/after narrative, live violation detection, Gemini reasoning visible |
=======
# PRD — DeepTrace: Digital Sports Media Protection Platform

**Hackathon:** Build with AI: Solution Challenge 2026 (Hack2Skill × GDG)
**Problem Domain:** Digital Asset Protection — Protecting the Integrity of Digital Sports Media
**Submission Deadline:** April 27, 2026
**Team:** Soham (Full Stack), Mitansh, Aarush, Patil

---

## 1. Problem Statement

Sports organizations generate massive volumes of high-value digital media — match photos, highlight clips, player portraits, broadcast stills — that scatter across social platforms, news sites, and third-party apps within minutes of publication. Current tools provide no systematic way to track whether that content is being used without authorization, watermark-stripped, or repurposed commercially without license.

**The gap:** No scalable, near-real-time pipeline exists that can (a) fingerprint official media at upload, (b) continuously scan the internet for unauthorized usage, and (c) intelligently classify violations vs. legitimate editorial use.

---

## 2. Solution Overview — DeepTrace

DeepTrace is a Next.js web platform that lets sports organizations upload and register their official digital assets, then automatically monitors the internet for unauthorized use using a layered AI pipeline powered by Google Cloud.

### Core Value Loop

```
Upload Asset → Register Fingerprint → Automated Internet Scan →
AI Violation Classification → Real-Time Alert → Dashboard Review
```

---
| Layer | Technology | Justification |
|---|---|---|
| Frontend | Next.js latest (App Router) | Full-stack, SSR, API routes |
| Styling | Vanilla CSS + High-Fidelity Bento UI | Custom premium aesthetic, no generic "AI-slop" |
| Auth | Firebase Auth | Google-native, fast setup |
| Database | Firebase Firestore | Real-time sync, durable state persistence |
| File Storage | Cloudinary | Global image hosting, auto-transformations |
| Internet Scan | SerpAPI (Google Lens Engine) | Superior visual match discovery over standard Web Detection |
| Web Scraping | Jina Reader API | Context-aware Markdown extraction for Gemini auditing |
| AI Pipeline | Gemini 1.5 Flash (v2) | High-concurrency forensic classification with RSE v2 logic |
| Scheduling | Upstash QStash | Serverless task queue for durable pipeline resumption |
| Hosting | Vercel | Zero-latency Next.js delivery |

---

## 4. User Roles

| Role | Description |
|---|---|
| **Rights Holder** | Uploads official assets, defines rights tiers, reviews high-risk violations |
| **Forensic Analyst** | Manually reviews "Needs Review" cases, escalates to takedown teams |
| **System (Automated)** | Continuous discovery, scraping, and RSE classification |

---

## 5. Feature Specification

### 5.1 Asset Registration

- Org uploads image via drag-and-drop
- System generates:
  - **pHash + dHash + wHash** fingerprint (Perceptual Filtering)
  - Metadata: owner, organization, rights tier (editorial / commercial / all-rights)
- Asset stored in Cloudinary for global reference and high-speed delivery
- Initial **SerpAPI** reverse search triggered automatically

**Fields per asset:**
```
asset_id        string   auto-generated UUID
owner_id        string   user ID for isolation
owner_org       string   organization name
uploaded_at     timestamp
rights_tier     enum     [editorial, commercial, all_rights, no_reuse]
tags            string[] sport, event, player, date
phash           string   perceptual hash for exact matching
dhash           string   difference hash for structural similarity
scan_status     enum     [pending, scanning, clean, violations_found]
stage           enum     [uploaded, reverse_searched, gated, analyzing, complete]
totals          object   aggregation of hits (scraped, classified, failed)
```

### 5.2 Forensic Pipeline Architecture

The DeepTrace pipeline is **durable and resumable**, designed to survive API timeouts and quota limits.

```
Step 1 — Discovery (SerpAPI Google Lens)
  Input:  Original Asset URL
  Output: List of web matches (title, link, source, thumbnail)

Step 2 — Gating (Perceptual Filter)
  Input:  Original Asset vs. Web Match Thumbnails
  Logic:  Compares pHash/dHash distances.
  Decision: Forward to Gemini (High Similarity) OR Filter Out (Low Similarity)

Step 3 — Scraping (Jina Reader)
  Input:  Matched URL
  Output: Clean Markdown content (Title, Meta, Full Body Text)

Step 4 — RSE v2 Classification (Gemini 1.5 Flash)
  Input:  Scraped Context + Rights Tier + Asset Context + Side-by-Side Images
  Logic:  Weighted 80% Visual / 20% Contextual analysis
  Metrics: Relevancy, Confidence, Visual Match Score, Contextual Match Score

Step 5 — Valuation & Severity
  Final Classification: AUTHORIZED | UNAUTHORIZED | EDITORIAL_FAIR_USE | NEEDS_REVIEW
  Revenue at Risk: Dynamic modeling ($250–$5000+ per violation based on severity)
```

### 5.3 Violation Record Schema

```
violation_id      string   Deterministic hash (AssetID + MatchURL)
asset_id          string   (ref)
match_url         string   URL where image was found
status            enum     [open, resolved, disputed, false_positive]
severity          enum     [CRITICAL, HIGH, MEDIUM, LOW]
gemini_class      enum     [AUTHORIZED, UNAUTHORIZED, EDITORIAL_FAIR_USE, NEEDS_REVIEW]
reliability_score number   (0-100)
reliability_tier  enum     [HIGH, MEDIUM, LOW]
recommended_action enum    [escalate, human_review, monitor, no_action]
scraped_cache     object   Full metadata/body from Jina
```

### 5.4 High-Fidelity Interface

**Global Pipeline Banner**
- Persistent, floating notification tracking background analysis progress
- Real-time updates via Firestore `onSnapshot`
- Instant "View Analysis" navigation for active forensic jobs

**Forensic Detail View (Violation Dashboard)**
- **Side-by-Side Verification**: Original Asset vs. Suspected Infringement comparison
- **RSE Gauges**: Visual breakdown of relevancy, confidence, and match scores
- **Audit Trail**: Step-by-step reasoning from Gemini justifying the classification
- **Triage Actions**: Escalation, resolution, and review workflow
 URL + original asset + rights_tier
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
```

### 5.3 Violation Record Schema

```
violation_id      string
owner_id          string   user ID for isolation
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
```

### 5.4 Dashboard

**Asset Library View**
- Grid of registered assets with scan status badges
- Filter by sport, rights tier, scan status
- Click asset → detail view with all violations

**Violations Feed**
- Chronological feed of all open violations
- Filter by severity, asset, date range
- Each card shows: thumbnail, matched URL, Gemini classification, severity badge
- Actions: Mark Resolved / Dispute / Flag False Positive

**Analytics Panel**
- Total assets registered
- Total violations found (by severity)
- Top infringing domains
- Violation trend chart (7d / 30d)
- Geographic heatmap of violation sources (from URL TLD analysis)

**Alert Settings**
- Email alert threshold (severity level)
- Slack webhook (optional, bonus)
- Daily digest toggle

### 5.5 Real-Time Alerts

- Firestore `onWrite` Cloud Function triggers on new CRITICAL or HIGH violation
- Sends email via Firebase Extensions (Trigger Email) or SendGrid
- Dashboard shows live notification badge via Firestore real-time listener

### 5.6 Audit Log

Every scan, classification decision, and status change is written to an immutable `audit_log` collection with:
- Timestamp
- Action type
- Actor (user ID or "system")
- Asset ID + violation ID
- Previous state → new state

This is the "transparency and disputes" requirement from the problem statement.

### 5.7 Data Isolation & Multi-Tenancy
- All data (assets, violations, audit logs) is strictly scoped to the `owner_id` (the authenticated user's UID).
- Users can only access documents where `owner_id == request.auth.uid`.
- This is enforced at both the application level (filtered queries) and the database level (Firestore Security Rules).


---

## 6. Page Map (Next.js Routes)

```
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
```

---

## 7. MVP Scope vs. Stretch Goals

### MVP (Must ship by April 27)

- [x] Asset upload + fingerprint registration
- [x] Cloud Vision Web Detection scan (on-upload)
- [x] Gemini Vision classification of matches
- [x] Violations feed with severity
- [x] Dashboard with basic analytics
- [x] Firebase Auth (Google Sign-In)
- [x] Email alert on CRITICAL violation

### Stretch Goals (Add if time allows)

- [ ] Scheduled re-scan (Cloud Function cron)
- [ ] Geographic heatmap of violations
- [ ] Slack webhook integration
- [ ] Watermark embed + detection (Cloud Vision SafeSearch + custom model)
- [ ] Bulk asset upload (CSV manifest)
- [ ] "Find where my image is used" reverse search API (public-facing)
- [ ] Export violation report as PDF

---

## 8. Implementation Roadmap & Current Progress

### Phase 1 — Discovery & Discovery Pipeline (COMPLETED)
- **SerpAPI (Google Lens) Integration**: Replaced standard Web Detection with Lens for 10x better visual match accuracy.
- **Perceptual Gating**: Implemented pHash/dHash/wHash comparison logic to filter out low-similarity noise before AI processing.
- **Durable Pipeline**: Built a resumable state machine that persists pipeline progress to Firestore, ensuring reliability across network/API failures.

### Phase 2 — Contextual Forensic Analysis (COMPLETED)
- **Jina Reader Integration**: Automated deep-scraping of matched URLs to provide Gemini with full-page context (Markdown format).
- **RSE v2 (Reliability Scoring Engine)**: Implemented a weighted visual/contextual scoring engine in Gemini 1.5 Flash.
- **Humanized Reports**: Refactored technical forensic data into analyst-friendly labels and structured audit trails.

### Phase 3 — Business Intelligence & UX (COMPLETED)
- **Revenue at Risk Modeling**: Integrated dynamic valuation constants to track the financial impact of violations.
- **Global Pipeline Banner**: Implemented real-time background status tracking for seamless multi-page UX.
- **Executive Dashboard**: Finalized bento-grid dashboard with live trend analysis and source risk heatmaps.

### Phase 4 — Final Polish & Scale (IN PROGRESS)
- [ ] **Notification System**: Hooking up automated email triggers for CRITICAL violations.
- [ ] **Dynamic Valuation Config**: Moving revenue constants to a per-organization database table.
- [ ] **Batch Resolution**: Adding bulk-action UI for forensic analysts.

---

## 9. Gemini Prompt Design (Forensic Auditor v2)

DeepTrace uses a strictly typed JSON prompt to ensure Gemini 1.5 Flash outputs structured forensic evidence.

```json
{
  "system": "You are a Digital Forensic Analyst at DeepTrace. Your task is to audit a suspected IP violation by comparing an official reference image against a suspected match found on the web.",
  "logic": {
    "visual_match_score": "0.0-1.0 (How visually similar is the suspect to the original?)",
    "contextual_authenticity": "0.0-1.0 (Does the surrounding text indicate authorized use?)",
    "classification": "[UNAUTHORIZED, AUTHORIZED, EDITORIAL_FAIR_USE, NEEDS_REVIEW]",
    "severity": "[CRITICAL, HIGH, MEDIUM, LOW]",
    "reasoning_steps": "Array of 3 numbered forensic observations"
  }
}
```

---

## 10. Firestore Schema (v2 Production)

```typescript
/assets/{asset_id}
  - stage: 'uploaded' | 'reverse_searched' | 'gated' | 'analyzing' | 'complete'
  - totals: { reverse_hits, gated_pending, gate_dropped, classified, failed }
  - storageUrl: string
  - owner_org: string
  - rights_tier: string

/violations/{violation_id}
  - asset_id: string
  - match_url: string
  - stage: 'gated_pending' | 'gate_passed' | 'scraped' | 'classified' | 'failed'
  - scraped_cache: { title, description, bodyText, at }
  - gemini_class: string
  - reliability_score: number
  - revenue_at_risk: number
  - recommended_action: 'escalate' | 'human_review' | 'monitor'
```

---

## 11. Final Verification Plan

### Automated Tests
- **Pipeline Integrity**: Verify that a "Resume" call on a stuck asset correctly picks up from the last recorded stage.
- **Gating Accuracy**: Test against "Near-Duplicate" vs "Different Image" sets to verify phash/dhash thresholds.
- **RSE Consistency**: Audit Gemini reasoning for 10 diverse violation types to ensure score/classification alignment.

### Manual Verification
- **Global Banner**: Ensure progress percentages update in real-time across dashboard/violations/library pages.
- **Triage Flow**: Confirm that marking a violation as "Resolved" correctly updates asset aggregation totals.

---

## 12. Environment Variables

```env
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

# Gemini (Google AI Studio)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash

# Jina Reader
JINA_API_KEY=

# SerpAPI (Google Lens)
SERPAPI_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Cost note:** All services used are on free tiers for hackathon scale. Total infra cost = $0.

---

## 13. Judging Criteria Alignment

| Criterion | How DeepTrace Addresses It |
|---|---|
| Real-world impact | Directly solves sports IP theft; a documented multi-billion-dollar problem. |
| Use of Google Tech | Firebase, Gemini 1.5 Flash, and Firestore are core to the architecture. |
| Technical Execution | Layered pipeline (fingerprint → discovery → scraping → RSE v2 classification). |
| Innovation | Gemini Vision as a reasoning layer for forensic auditing is novel. |
| User Experience | High-fidelity bento-grid dashboard with real-time global status tracking. |
>>>>>>> 5e40d30a9982afd6cb7c7ed79515b7ca0e29e0e9
