<div align="center">

# DeepTrace

### Forensic-grade copyright defense for digital sports media

Built for **Build with AI: Solution Challenge 2026** by Hack2Skill × GDG.

[Live Demo](https://deeptrace-h2s.vercel.app)

![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=000)
![Gemini](https://img.shields.io/badge/Gemini-3.1%20Flash-4285F4?logo=google&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000?logo=vercel)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## Table of Contents

- [The Problem](#the-problem)
- [Our Solution](#our-solution)
- [Live Demo](#live-demo)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Key Features](#key-features)
- [Reliability Scoring Engine v2](#reliability-scoring-engine-v2)
- [DMCA Module](#dmca-module)
- [Local Development](#local-development)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [Team](#team)
- [Acknowledgements](#acknowledgements)

---

## The Problem

Sports organizations publish thousands of high-value digital assets every match day — match photos, highlight stills, player portraits, broadcast frames. Within minutes of publication, those assets scatter across social platforms, news sites, and pirate domains.

There is no scalable, near-real-time way to:

1. Fingerprint official media at upload.
2. Continuously scan the open web for unauthorized usage.
3. Intelligently distinguish a violation from legitimate editorial coverage.
4. Quantify the financial risk and act on it.

Existing tools (Pixsy, Imatag, Copytrack) are single-step reverse-search engines with no contextual reasoning, no rights-tier awareness, and no forensic audit trail. Outsourced takedown agencies cost ₹7,500 to ₹16,500 per notice.

**Image piracy alone costs the global sports IP industry an estimated 5 to 8 percent of digital revenue annually.**

---

## Our Solution

**DeepTrace is a forensic IP-protection platform built on Google Cloud.**

Upload an official asset once. DeepTrace then:

- Generates a perceptual fingerprint (pHash + dHash + wHash).
- Discovers unauthorized copies across the open web via Google Lens.
- Filters noise through a tiered perceptual gate.
- Scrapes each matched page with Jina Reader.
- Audits each match with **Gemini 3.1 Flash** using our **Reliability Scoring Engine v2**.
- Emits a 0–100 reliability score, a severity tier, and a rupee-denominated revenue-at-risk number.
- Generates a legally compliant DMCA takedown notice with a **forensic evidence bundle** (PDF + WARC + Archive.org).
- Supports **Manual Overrides** via an escalation/dispute workflow.

Every stage is checkpointed in Firestore, so the pipeline is fully resumable across API timeouts and quota walls.

> **One-liner:** *Forensic-grade copyright defense, at the speed of the internet.*

---

## Live Demo

| Resource | Link |
|---|---|
| MVP | https://deeptrace-h2s.vercel.app |

---

## How It Works

```
1. Upload                  Rights holder drags an official asset.
2. Fingerprint             pHash + dHash + wHash generated server-side.
3. Discover                SerpAPI Google Lens reverse search.
4. Gate                    Tiered perceptual filter drops noise.
5. Scrape                  Jina Reader extracts page Markdown.
6. Audit                   Gemini 3.1 Flash + RSE v2 forensic verdict.
7. Score                   Three-axis score → 0–100 reliability.
8. Value                   Revenue-at-risk via weighted algorithm.
9. Alert                   Firestore real-time push to dashboard + email.
10. Act                    One-click DMCA takedown.
```

---

## Architecture

![Architecture Diagram](https://res.cloudinary.com/dqpt61klr/image/upload/v1777548562/architecture_sax1lq.png)

Five layers, fully resumable, real-time on the client.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 15 (App Router), React 19 | SSR + API routes in one codebase |
| Styling | Vanilla CSS, custom Bento design system | Premium aesthetic, theme-aware |
| Auth | Firebase Authentication | Google-native, zero-config OAuth |
| Database | Cloud Firestore | Real-time sync, durable pipeline state |
| Storage | Cloudinary | Global CDN, automatic transforms |
| Discovery | SerpAPI (Google Lens engine) | Best-in-class visual match recall |
| Scraping | Jina Reader | Clean Markdown for LLM auditing |
| AI | Gemini 3.1 Flash (Google AI Studio) | Vision + structured JSON, 1M context |
| Queue | Upstash QStash | Durable serverless job queue |
| Email | Resend | Transactional + DMCA delivery |
| Hosting | Vercel | Edge-cached Next.js |

**Google services used (judging criterion):** Firebase Auth · Cloud Firestore · Gemini · Google Lens.

---

## Key Features

### Detection
- Asset registration with **pHash + dHash + wHash** fingerprinting
- **One-click "Quick Start" samples** for instant pipeline demonstration
- SerpAPI Google Lens discovery
- Tiered perceptual gate: NEAR_IDENTICAL · TRANSFORMED · HIGH_RISK_OVERRIDE · DROP
- Jina Reader page scraping with token budgeting

### Forensics
- **RSE v2 adaptive-weight Gemini audit** (60/30/10 → 10/70/20 based on evidence)
- Three-axis scoring: relevancy × confidence × severity
- Reliability score 0–100 with HIGH/MEDIUM/LOW tiers
- Contradiction detection and explicit abstention (`INSUFFICIENT_EVIDENCE`)
- Explainability bullets with ✔/⚠/✖/ℹ/→ icons

### Business Intelligence
- Revenue-at-Risk modeling (₹85,000 / ₹35,000 / ₹12,000 / ₹4,000 per Critical/High/Medium/Low)
- Domain-class multipliers (Piracy ×2.5, Social ×1.2, E-commerce ×2.0)
- TLD-based regional analysis and top-domain leaderboard

### Operations
- **Durable resumable pipeline** with stage enum + idempotency keys
- **Global Progress Banner**: Real-time cross-app tracking of all active forensic scans
- **Glassy Accuracy Metrics**: High-fidelity, translucent UI overlays on asset thumbnails for instant quality assessment
- **Manual Override Workflow**: Dispute-driven forensic bypass for legal escalation
- **Forensic Bundle Sidecar**: One-click generation of PDF evidence, WARC archives, and Archive.org snapshots
- Templated **DMCA takedown dispatcher** with Resend integration
- Real-time in-app + email notification system (per-user preferences, daily digests)

---

## Reliability Scoring Engine v2

The RSE is the heart of DeepTrace. It replaces the brittle 80/20 hardcoded weighting in legacy reverse-search tools with a forensic, evidence-aware engine.

**Three axes:**

| Axis | Question | Range |
|---|---|---|
| Relevancy | Is this actually my image? | 0–100 |
| Confidence | Is the verdict correct? | 0–100 |
| Severity | How bad is it? | LOW · MEDIUM · HIGH · CRITICAL |

**Adaptive weighting:** RSE shifts weight between perceptual evidence and contextual evidence depending on completeness. A clean watermark + commercial product page tilts heavier on context. A pristine pHash match on a piracy domain tilts heavier on perceptual evidence.

**Outputs:**
- Verdict ∈ {AUTHORIZED, UNAUTHORIZED, EDITORIAL_FAIR_USE, NEEDS_REVIEW, INSUFFICIENT_EVIDENCE}
- Reliability score 0–100 (single dashboard-friendly number)
- Contradiction flag (model + code-side cross-check)
- Explainability bullets (5–8 lines explaining *why*)

See [`lib/classify.v2.ts`](./lib/classify.v2.ts) and [`lib/prompts.v2.ts`](./lib/prompts.v2.ts) for the full implementation.

---

## DMCA Module

DeepTrace ships with a built-in, legally compliant DMCA takedown dispatcher.

- Eligibility gate: `verdict = INFRINGEMENT && reliability_score ≥ 70 && severity ∈ {CRITICAL, HIGH}`
- Host resolution via U.S. Copyright Office Designated Agent Directory + WHOIS fallback
- Notice drafted with **Gemini 3.1 Flash** filling only variable fields; statutory clauses are byte-identical fixed strings
- All six § 512(c)(3) elements rendered server-side
- Signed PDF archive in Cloudinary, full audit log retained for 3 years
- Counter-notice handler with 10-business-day countdown
- Dispatched via Resend, tracked through `sent → acknowledged → removed → counter_notice` lifecycle

See [`lib/dmca/`](./lib/dmca) for the implementation.

---

## Local Development

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (or npm ≥ 10)
- A Firebase project (Firestore + Auth enabled)
- API keys for Gemini, SerpAPI, Jina, Cloudinary, Resend, Upstash QStash

### Setup

```bash
# 1. Clone and install
git clone https://github.com/sohamparanjape12/deeptrace.git
cd deeptrace
npm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Fill in your API keys (see Environment Variables below)
$EDITOR .env.local

# 4. Start the dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

---

## Project Structure

```
deeptrace/
├── app/                              # Next.js App Router
│   ├── (app)/                        # Authenticated dashboard (Assets, Violations, DMCA)
│   ├── (auth)/                       # Authentication flow (Login, Onboarding)
│   ├── api/                          # Backend API routes
│   │   ├── dmca/                     # Takedown & Eligibility endpoints
│   │   ├── evidence/                 # Forensic bundle generation
│   │   ├── scan/                     # SerpAPI integration
│   │   └── violations/               # Triage & Status updates
│   ├── infrastructure/               # QStash & Pipeline workers
│   └── pricing/                      # Subscription plans
├── components/                       # Bento UI Design System
│   ├── shared/                       # Global components (Card, PageHeader, Banner)
│   ├── ui/                           # Base primitives
│   └── dmca/                         # Notice-specific UI
├── lib/                              # Core Forensic Engine
│   ├── dmca/                         # PDF generation, dispatch, host resolution
│   ├── notifications/                # Real-time event emission
│   ├── utils/                        # Formatting, URLs, math
│   ├── classify.v2.ts                # Reliability Scoring Engine (RSE)
│   ├── perceptual-filter.ts          # Tiered pHash/dHash gating
│   ├── pipeline-executor.ts          # Orchestration of scan/scrape/classify
│   ├── prompts.v2.ts                 # Gemini forensic system prompts
│   └── qstash.ts                     # Serverless job scheduling
├── types/                            # Central TypeScript definitions
├── public/                           # Static assets & Icons
├── styles/                           # Global CSS & Design Tokens
├── firebase.json                     # Firebase Hosting & Functions config
├── firestore.rules                   # Security rules for IP data
└── package.json                      # Project dependencies
├── PRD.md                            # Full product spec
└── README.md
```

---

## Environment Variables

Create `.env.local` with the following:

```env
# ── Google Cloud ────────────────────────────────────
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=

# ── Firebase (client) ───────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ── Firebase Admin (server) ─────────────────────────
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# ── Gemini ──────────────────────────────────────────
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.1-flash

# ── External APIs ───────────────────────────────────
SERPAPI_KEY=
JINA_API_KEY=
CLOUDINARY_URL=
RESEND_API_KEY=

# ── Queue ───────────────────────────────────────────
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=

# ── DMCA (optional) ─────────────────────────────────
WHOISXML_API_KEY=
DMCA_ARCHIVE_EMAIL=dmca-archive@deeptrace.app
DMCA_AUTO_DISPATCH=false
```

A full template is committed as [`.env.example`](./.env.example).

---

## Roadmap

### Q3 2026 — Scale
- Watermark embed and active-provenance detection
- Bulk CSV asset upload
- Scheduled weekly rescan via Cloud Scheduler
- Public reverse-search API for press teams

### Q4 2026 — Intelligence
- Geographic violation heatmap (TLD + IP geo fusion)
- Repeat-offender auto-escalation
- Brand-safety adjacency scoring
- Custom valuation per organization

### Q1 2027 — Enterprise
- Steganographic watermark forensics
- Slack, Teams, Jira integrations
- Full-service DMCA partnership tier
- Federated pirate-domain blocklist

### Q2 2027 — Defensive AI
- Adversarial robustness vs. AI upscale and deepfakes
- Pre-publication watermark API for broadcaster CMS

---

## Team

Built at MIT Pune for **Build with AI: Solution Challenge 2026**.

| Member |
|---|
| Soham Paranjape |
| Mitansh Bheda |
| Aarush Majumdar |
| Ishaan Patil |

---

## Acknowledgements

- **Google AI Studio** for Gemini 3.1 Flash access
- **Firebase** for Auth and Firestore
- **SerpAPI** for the Google Lens engine
- **Jina AI** for the Reader API
- **Hack2Skill × GDG** for organizing the Solution Challenge

This project was created as a hackathon submission.

---

<div align="center">

**DeepTrace** — _Forensic-grade copyright defense, at the speed of the internet._

</div>
