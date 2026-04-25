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

Step 4 — RSE v2 Classification (Gemini 3.1 Flash-Lite)
  Input:  Scraped Context + Rights Tier + Asset Context + Side-by-Side Images
  Logic:  **Adaptive Weighting Engine** — Dynamically adjusts audit importance:
    - *Full Evidence*: 60% Visual / 30% Contextual / 10% Attribution
    - *Missing Original*: 10% Visual / 70% Contextual / 20% Attribution
    - *Visually Similar*: 40% Visual / 50% Contextual / 10% Attribution
  Audit Axes: Relevancy, Confidence, Severity, Brand Safety Risk, Sentiment.

Step 5 — Valuation & Logic Checks
  - **Temporal Impossibility**: Automatically authorizes usage if the page publication date pre-dates the asset capture date.
  - **Regional Analysis**: TLD-based geographic source detection (e.g., .cn → APAC, .de → Western Europe).
  - **Revenue at Risk**: Multi-factor financial impact modeling ($850/Critical, $350/High, $120/Medium, $45/Low) with domain-class multipliers (Piracy ×2.5, Social ×1.2).
  - **Pacing & Stability**: Integrated 4000ms request gaps and exponential backoff for Gemini rate-limit (429) resiliency.
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

**Command Center (Sidebar)**
- **Forensic Engine Branding**: High-contrast, minimalist navigation anchor.
- **Live Pipeline Pulse**: Visual indicators for active background scans (Discovery, Scraping, Auditing).
- **Metric Micro-badges**: Real-time counts of CRITICAL and HIGH violations synced via Firestore.
- **System Health**: Dynamic connectivity status for Gemini and Jina API clusters.
 URL + original asset + rights_tier
  Prompt: "Given this official sports image (rights: {rights_tier}),
           analyze the matched URL page context.
           Classify: [AUTHORIZED | UNAUTHORIZED | EDITORIAL_FAIR_USE | NEEDS_REVIEW]
           Reason briefly. Return JSON."
  Output: classification, confidence, reasoning
  Time:   ~1–3s per match (batched)

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
