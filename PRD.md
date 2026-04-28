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

## 3. Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| **Frontend** | Next.js latest (App Router) | Full-stack, SSR, API routes |
| **Styling** | Vanilla CSS + High-Fidelity Bento UI | Custom premium aesthetic with hardware-accelerated micro-animations |
| **Auth** | Firebase Auth | Google-native, fast setup |
| **Database** | Firebase Firestore | Real-time sync, durable state persistence |
| **File Storage** | Cloudinary | Global image hosting, auto-transformations |
| **Internet Scan** | SerpAPI (Google Lens Engine) | Superior visual match discovery over standard Web Detection |
| **Web Scraping** | Jina Reader API | Context-aware Markdown extraction for Gemini auditing |
| **AI Pipeline** | Gemini 3.1 Flash | High-concurrency forensic classification with RSE v2 logic |
| **Scheduling** | Upstash QStash | Serverless task queue for durable pipeline resumption |
| **Hosting** | Vercel | Zero-latency Next.js delivery |

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
  - Metadata: owner, organization, rights tier (Editorial / Commercial / All Rights / No Reuse)
- Asset stored in Cloudinary for global reference and high-speed delivery
- Initial **SerpAPI** reverse search triggered automatically

**Fields per asset:**
```typescript
asset_id        string   auto-generated UUID
owner_id        string   user ID for isolation
owner_org       string   organization name
uploaded_at     timestamp
rights_tier     enum     [editorial, commercial, all_rights, no_reuse]
tags            string[] sport, event, player, date
phash           string   perceptual hash for exact matching
scan_status     enum     [pending, scanning, clean, violations_found]
stage           enum     [uploaded, reverse_searched, gated, analyzing, complete]
```

### 5.2 Forensic Pipeline Architecture (RSE v2)

The DeepTrace pipeline is **durable and resumable**, designed to survive API timeouts and quota limits.

```
Step 1 — Discovery (SerpAPI Google Lens)
  Input:  Original Asset URL
  Output: List of web matches (title, link, source, thumbnail)

Step 2 — Gating (Perceptual Filter)
  Input:  Original Asset vs. Web Match Thumbnails
  Logic:  Compares pHash/dHash distances to filter out noise.

Step 3 — Scraping (Jina Reader)
  Input:  Matched URL
  Output: Clean Markdown content (Title, Meta, Full Body Text)

Step 4 — RSE v2 Classification (Gemini 3.1 Flash)
  Input:  Scraped Context + Rights Tier + Asset Context + Side-by-Side Images
  Logic:  Adaptive Weighting Engine dynamically adjusts audit importance.
  Audit Axes: Relevancy, Confidence, Severity, Brand Safety Risk, Sentiment.

Step 5 — Valuation & Financial Impact
  - Multi-factor financial impact modeling using a weighted algorithm.
  - Base Rates: ₹85,000 (Critical), ₹35,000 (High), ₹12,000 (Medium), ₹4,000 (Low).
  - Multipliers: Rights Tier (up to 2.5x), Domain Class (up to 2.5x), Commercial Signal (2.0x).
```

### 5.3 Violation Record Schema

```typescript
violation_id      string   Deterministic hash (AssetID + MatchURL)
asset_id          string   (ref)
match_url         string   URL where image was found
status            enum     [open, resolved, disputed, false_positive]
severity          enum     [CRITICAL, HIGH, MEDIUM, LOW]
gemini_class      enum     [AUTHORIZED, UNAUTHORIZED, EDITORIAL_FAIR_USE, NEEDS_REVIEW]
reliability_score number   (0-100)
revenue_risk      number   Estimated financial loss in Rupees
recommended_action enum    [escalate, human_review, monitor, no_action]
```

### 5.4 High-Fidelity Interface

- **Executive Dashboard**: Bento-grid layout with live trend analysis and source risk heatmaps.
- **Forensic Detail View**: Side-by-side verification (Original vs. Match) with RSE gauges and audit trails.
- **Global Pipeline Pulse**: Floating notification tracking background discovery and analysis stages.
- **Refined Settings**: Hardware-accelerated micro-animations for notification toggles with high-contrast, theme-aware designs.

### 5.5 Real-Time Alerts

- Firestore `onWrite` Cloud Function triggers on new CRITICAL or HIGH violation.
- Integrated daily digest and immediate email alerts.
- Live notification badges via Firestore real-time listeners.

---

## 6. Page Map (Next.js Routes)

```
/                         Landing / login
/dashboard                Overview analytics & Executive Command Center
/assets                   Asset library grid & Registration
/assets/upload            Drag-and-drop ingestion flow
/assets/[id]              Asset detail + violation list
/violations               Global real-time violations feed
/violations/[id]          Single violation forensic detail + Gemini reasoning
/settings                 Org profile, alert thresholds, and notification controls
```

---

## 7. MVP Scope & Current Progress

### MVP Status (100% Core Complete)
- [x] Asset upload + fingerprint registration
- [x] Cloud Vision + SerpAPI discovery pipeline
- [x] Gemini 3.1 Flash RSE v2 classification
- [x] Dynamic Revenue Loss Algorithm (weighted forensic model)
- [x] Real-time Dashboard with bento aesthetics
- [x] Firestore security rules & data isolation

---

## 8. Forensic Algorithm Logic (lib/revenue.ts)

DeepTrace calculates financial risk using four primary axes:
1.  **Baseline Severity**: Standardized fees representing licensing or legal recovery costs.
2.  **Rights Tier Multiplier**: Higher penalties for "No Reuse" or "All Rights" assets.
3.  **Domain Impact**: Multipliers for Piracy, E-commerce, or Major News sources.
4.  **Commercial Context**: Double risk weighting for explicit monetization (storefronts, ads).

---

## 9. Environment Variables

```env
# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=

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
GEMINI_MODEL=gemini-3.1-flash

# Jina Reader
JINA_API_KEY=

# SerpAPI (Google Lens)
SERPAPI_KEY=
```
