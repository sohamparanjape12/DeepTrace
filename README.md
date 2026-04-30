<div align="center">

# DeepTrace

### Forensic-grade copyright defense for digital sports media

Built for **Build with AI: Solution Challenge 2026** by Hack2Skill × GDG.

[Live Demo](#) · [Demo Video](#) · [Project Deck](#) · [PRD](./PRD.md)

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
- Generates a legally compliant DMCA takedown notice on demand.

Every stage is checkpointed in Firestore, so the pipeline is fully resumable across API timeouts and quota walls.

> **One-liner:** *Forensic-grade copyright defense, at the speed of the internet.*

---

## Live Demo

| Resource | Link |
|---|---|
| MVP | https://deeptrace.vercel.app |
| Demo video (≤ 3 min) | _coming soon_ |
| Project deck | _coming soon_ |
| GitHub repository | _this repo_ |
| PRD | [./PRD.md](./PRD.md) |

**Test credentials**
A demo Google Workspace account is provided in the project deck for evaluation.

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

```
┌─────────────────────────── Client (Browser) ──────────────────────────┐
│                                                                       │
│   Next.js App Router  •  Bento UI  •  Firebase Auth                   │
│                                                                       │
└──────────────┬──────────────────────────────────────┬─────────────────┘
               │                                      │
   1. Upload   │                                      │  12. Realtime
   asset      ▼                                      ▲   sync
┌─── Edge / Vercel ──────────────────────┐  ┌──── Google Cloud ─────────┐
│                                        │  │                            │
│  Next.js API Routes                    │  │  Firebase Auth             │
│  Upstash QStash (durable queue)        │  │  Cloud Firestore           │
│                                        │  │  Gemini 3.1 Flash          │
└────────┬─────────────────────┬─────────┘  │                            │
         │                     │            └────────────┬───────────────┘
   3-5.  │              13.    │                         │
   scan  │             dispatch│                         │ 4-11.
         ▼                     ▼                         ▼
┌─── External APIs ─────────┐         ┌─── Worker Layer ───────────────┐
│  SerpAPI (Google Lens)    │ ─────▶ │  Perceptual Gate (pHash+dHash)  │
│  Jina Reader              │ ─────▶ │  RSE v2 Engine                  │
│  Cloudinary CDN           │ ─────▶ │  DMCA Dispatcher                │
└───────────────────────────┘         └─────────────────────────────────┘
```

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
- Real-time pipeline pulse banner via Firestore `onSnapshot`
- Side-by-side violation viewer with full audit trail
- Templated **DMCA takedown dispatcher**
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
git clone https://github.com/<your-org>/deeptrace.git
cd deeptrace
pnpm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Fill in your API keys (see Environment Variables below)
$EDITOR .env.local

# 4. Start the dev server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Production build

```bash
pnpm build
pnpm start
```

### Tests

```bash
pnpm test          # unit tests
pnpm test:e2e      # Playwright end-to-end
pnpm test:visual   # visual regression (light + dark)
```

---

## Project Structure

```
deeptrace/
├── app/                              # Next.js App Router
│   ├── (dashboard)/                  # Authenticated dashboard
│   │   ├── assets/                   # Asset library + upload
│   │   ├── violations/               # Violation feed + detail
│   │   ├── dmca/                     # DMCA notice management
│   │   └── notifications/            # Notification feed + preferences
│   └── api/                          # API routes
│       ├── scan/                     # SerpAPI scan trigger
│       ├── classify/                 # RSE v2 endpoint
│       ├── dmca/                     # DMCA module endpoints
│       └── notifications/            # Notification endpoints
├── components/                       # Bento UI components
│   ├── ui/                           # Primitives
│   ├── dmca/                         # DMCA-specific components
│   └── notifications/                # Bell, panel, toast
├── lib/                              # Server logic
│   ├── classify.v2.ts                # RSE v2 classifier
│   ├── prompts.v2.ts                 # Gemini system prompts
│   ├── perceptual-filter.ts          # Tiered hash gate
│   ├── jina.ts                       # Page scraper
│   ├── revenue.ts                    # Revenue-at-risk model
│   ├── dmca/                         # DMCA module
│   └── notifications/                # Notification emit + delivery
├── data/
│   └── dmca-agents.json              # Curated agent directory
├── emails/                           # React Email templates
├── styles/
│   └── globals.css                   # Design tokens, light + dark
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

| Member | Role |
|---|---|
| **Soham Paranjape** *(team lead)* | Full-stack, AI pipeline, RSE v2, DMCA module |
| Mitansh | _role_ |
| Aarush | _role_ |
| Patil | _role_ |

---

## Acknowledgements

- **Google AI Studio** for Gemini 3.1 Flash access
- **Firebase** for Auth and Firestore
- **SerpAPI** for the Google Lens engine
- **Jina AI** for the Reader API
- **Hack2Skill × GDG** for organizing the Solution Challenge

This project was created as a hackathon submission. The codebase is open-sourced under the MIT License — see [LICENSE](./LICENSE).

---

<div align="center">

**DeepTrace** — _Forensic-grade copyright defense, at the speed of the internet._

</div>
