export type DomainClass =
  | 'wire_service'
  | 'major_news'
  | 'social'
  | 'betting'
  | 'piracy'
  | 'ecommerce'
  | 'stock_photo'
  | 'portfolio'
  | 'unknown';

export const DOMAIN_CLASS_PRIORS: Record<
  string,
  { class: DomainClass; piracy_prior: number }
> = {
  // Wire services — zero tolerance for false positives
  'reuters.com': { class: 'wire_service', piracy_prior: 0.01 },
  'apnews.com': { class: 'wire_service', piracy_prior: 0.01 },
  'gettyimages.com': { class: 'wire_service', piracy_prior: 0.02 },
  'afp.com': { class: 'wire_service', piracy_prior: 0.01 },
  // Major news — low false-positive tolerance
  'bbc.com': { class: 'major_news', piracy_prior: 0.05 },
  'espn.com': { class: 'major_news', piracy_prior: 0.05 },
  'theguardian.com': { class: 'major_news', piracy_prior: 0.05 },
  'nytimes.com': { class: 'major_news', piracy_prior: 0.05 },
  'cnn.com': { class: 'major_news', piracy_prior: 0.05 },
  // Betting / gambling — high piracy prior
  'bet365.com': { class: 'betting', piracy_prior: 0.85 },
  'skybet.com': { class: 'betting', piracy_prior: 0.80 },
  'williamhill.com': { class: 'betting', piracy_prior: 0.80 },
  // Social media — medium prior
  'twitter.com': { class: 'social', piracy_prior: 0.30 },
  'x.com': { class: 'social', piracy_prior: 0.30 },
  'instagram.com': { class: 'social', piracy_prior: 0.25 },
  'facebook.com': { class: 'social', piracy_prior: 0.20 },
  'tiktok.com': { class: 'social', piracy_prior: 0.35 },
  // Ecommerce / Merch
  'amazon.com': { class: 'ecommerce', piracy_prior: 0.40 },
  'ebay.com': { class: 'ecommerce', piracy_prior: 0.50 },
  'etsy.com': { class: 'ecommerce', piracy_prior: 0.45 },
};

// ---------------------------------------------------------------------------
// FIX 1: Rights tier multipliers applied SERVER-SIDE to domain priors.
// This ensures that restricted assets on commercial platforms always score
// high regardless of what Gemini returns.
// ---------------------------------------------------------------------------
export const RIGHTS_TIER_MULTIPLIERS: Record<string, number> = {
  internal: 2.5,       // Internal-only: any third-party use is critical
  'All Rights': 2.0,   // All rights reserved: no third-party use allowed
  Commercial: 1.0,     // Commercial license: standard scoring
  Editorial: 0.8,      // Editorial license: news use is expected
};

/**
 * Computes an adjusted piracy prior by applying the rights tier multiplier
 * to the domain's base prior. Result is capped at 0.95 to avoid div-by-zero
 * downstream and to leave room for Gemini signals.
 *
 * Example: amazon.com (0.40) × internal (2.5) = 1.0 → capped at 0.95 → HIGH
 */
export function getAdjustedPiracyPrior(
  domain: string,
  rightsTier: string
): number {
  const domainEntry = DOMAIN_CLASS_PRIORS[domain];
  const basePrior = domainEntry?.piracy_prior ?? 0.5; // unknown domains default to 0.5
  const multiplier = RIGHTS_TIER_MULTIPLIERS[rightsTier] ?? 1.0;
  return Math.min(basePrior * multiplier, 0.95);
}

// ---------------------------------------------------------------------------
// FIX 2: Rights tier metadata typed explicitly so the prompt builder and
// scoring engine share a single source of truth.
// ---------------------------------------------------------------------------
export const RESTRICTED_TIERS = new Set(['internal', 'All Rights']);

export function isRestrictedTier(rightsTier: string): boolean {
  return RESTRICTED_TIERS.has(rightsTier);
}

export interface MasterPromptParams {
  rightsTier: string;
  tags: string[];
  ownerOrg: string;
  matchUrl: string;
  pageTitle: string;
  pageDescription: string;
  matchType: string;
  assetDescription?: string;
  assetCaptureDate?: string;
  pagePublishedAt?: string;
  pageBody?: string;
}

// ---------------------------------------------------------------------------
// FIX 3: buildMasterPrompt — three structural changes:
//   (a) Rights enforcement DIRECTIVE injected at the top of the SYSTEM block,
//       before any other instruction.
//   (b) Instruction #6 added to explicitly cap context_authenticity_score
//       for restricted tiers in commercial contexts.
//   (c) Two new JSON output fields: rights_tier_override (bool) and
//       rights_tier_reasoning (string) so the server-side engine can apply
//       a hard severity floor without re-parsing all signals.
// ---------------------------------------------------------------------------
export function buildMasterPrompt(params: MasterPromptParams): string {
  // (a) Hard enforcement directive — only injected for restricted tiers.
  const rightsEnforcementDirective = isRestrictedTier(params.rightsTier)
    ? `
⚠️  RIGHTS ENFORCEMENT DIRECTIVE — READ BEFORE ALL OTHER INSTRUCTIONS:
The rights tier for this asset is: "${params.rightsTier}".
This means the asset is NOT licensed for ANY third-party use under ANY circumstances.
The following framing does NOT constitute a license and must NOT reduce severity:
  - "Tribute" or "fan" works
  - "Biography" or "commemorative" publications
  - "Educational" or "journalistic" claims
  - Positive sentiment or praise of the subject
  - Small-scale or individual sellers
ANY commercial exploitation (storefront listing, product sale, merchandise, stock site)
on ANY platform is a CRITICAL violation when rights_tier is "${params.rightsTier}".
SCORE CEILINGS YOU MUST RESPECT:
  - context_authenticity_score MUST be ≤ 0.20 for any commercial context.
  - commercial_exploitation MUST be true for any storefront/retail/product listing.
  - rights_tier_override MUST be true.
Failure to apply these ceilings is a scoring error.
`
    : '';

  const instructions = `SYSTEM:
${rightsEnforcementDirective}You are DeepTrace's Forensic Content Auditor. Your goal is to gather visual and contextual evidence to determine if a digital asset is being used without authorization.

CRITICAL ROLE:
You are an evidence gatherer, NOT the final decision maker. Provide precise scores and signals that will be processed by our server-side adaptive scoring engine.

<instructions>
1. VISUAL AUDIT: Compare Image A (original) and Image B (match). Score visual similarity (0.0–1.0). Be robust to crops, filters, and overlays.
2. CONTEXTUAL AUDIT: Analyze the page title, description, URL, and the visible page content provided. Determine if the usage is likely commercial (e-commerce, stock site), editorial/news (article, press release), social share, or meme/parody.
3. SENTIMENT & BRAND SAFETY AUDIT: Analyze the tone of the page content. Is it positive, neutral, or negative towards the asset or owner? Flag any brand safety risks (e.g., adult content, gambling, hate speech).
4. ATTRIBUTION AUDIT: Check for creator credits or watermarks.
5. CONTRADICTION DETECTION: Flag if signals conflict (e.g., identical pixels but clearly used in a parody context).
6. RIGHTS TIER ENFORCEMENT: The rights tier "${params.rightsTier}" is a hard legal constraint, not a scoring input.
   ${isRestrictedTier(params.rightsTier)
      ? `Because this asset is "${params.rightsTier}", apply the following mandatory score ceilings:
   - context_authenticity_score MUST be ≤ 0.20 for commercial, ecommerce, or storefront contexts.
   - commercial_exploitation MUST be true if the page is a product listing, storefront, or retail page.
   - rights_tier_override MUST be set to true.
   - Do NOT allow positive sentiment, tribute framing, or biography framing to increase context_authenticity_score above 0.20.
   - "Tribute", "biography", "fan work", or "educational" labels are not licenses. Treat them as irrelevant to rights status.`
      : `Apply standard scoring. The rights tier "${params.rightsTier}" permits some third-party uses; evaluate context carefully.`
    }
</instructions>`;

  const visibleContent = params.pageBody
    ? `\n<visible_page_content>\n${params.pageBody}\n</visible_page_content>`
    : '';

  return `${instructions}

USER:
<dataset_a_reference>
- Origin: ${params.ownerOrg}
- Rights Tier: ${params.rightsTier}
- Content Tags: ${params.tags.join(', ')}${params.assetDescription ? `\n- Asset Description: ${params.assetDescription}` : ''}${params.assetCaptureDate ? `\n- Capture Date: ${params.assetCaptureDate}` : ''}
</dataset_a_reference>
<dataset_b_observation>
- Location: ${params.matchUrl}
- Page Title: ${params.pageTitle}
- Page Description: ${params.pageDescription}${params.pagePublishedAt ? `\n- Published At: ${params.pagePublishedAt}` : ''}
- Detection Method: ${params.matchType}${visibleContent}
</dataset_b_observation>

Respond in this exact JSON format:
{
  "visual_match_score": 0.0-1.0,
  "context_authenticity_score": 0.0-1.0,
  "attribution_licensing_score": 0.0-1.0,
  "commercial_exploitation": true|false,
  "is_derivative_work": true|false,
  "watermark_intact": true|false,
  "credit_present": true|false,
  "context_type": "commercial | editorial | meme_parody | unknown",
  "transformation_type": "crop | filter | overlay | resize | heavy_edit | minimal | none",
  "sentiment": "positive | neutral | negative",
  "brand_safety_risk": "safe | low | medium | high | critical",
  "risk_factors": ["list specific risks like gambling, adult, hate_speech, etc, or empty array"],
  "rights_tier_override": true|false,
  "rights_tier_reasoning": "Explain how the rights tier of '${params.rightsTier}' affects the classification of this usage. If override is true, state which ceiling rules were applied.",
  "reasoning_steps": [
    "Step 1: Visual similarity...",
    "Step 2: Contextual analysis...",
    "Step 3: Sentiment and brand safety...",
    "Step 4: Rights tier enforcement — state which rules were applied and what ceilings were enforced.",
    "Step 5: Signal cross-validation..."
  ],
  "contradictions": ["list any conflicting signals, or empty array"]
}`;
}

// ---------------------------------------------------------------------------
// FIX 4: Server-side severity floor.
// Call this AFTER receiving Gemini's response. If rights_tier_override is
// true OR the adjusted prior is ≥ 0.85, severity is forced to "high"
// regardless of the composite score Gemini returns.
// ---------------------------------------------------------------------------
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface GeminiClassificationResult {
  visual_match_score: number;
  context_authenticity_score: number;
  attribution_licensing_score: number;
  commercial_exploitation: boolean;
  is_derivative_work: boolean;
  watermark_intact: boolean;
  credit_present: boolean;
  context_type: string;
  transformation_type: string;
  sentiment: string;
  brand_safety_risk: string;
  risk_factors: string[];
  rights_tier_override: boolean;
  rights_tier_reasoning: string;
  reasoning_steps: string[];
  contradictions: string[];
}

export interface ScoringEngineOutput {
  severity: Severity;
  adjustedPiracyPrior: number;
  rightsTierOverrideApplied: boolean;
  compositeScore: number;
  classification: 'Unauthorized' | 'Likely Unauthorized' | 'Needs Review' | 'Likely Authorized';
}

export function applySeverityFloor(
  gemini: GeminiClassificationResult,
  domain: string,
  rightsTier: string
): ScoringEngineOutput {
  const adjustedPiracyPrior = getAdjustedPiracyPrior(domain, rightsTier);
  const rightsTierOverrideApplied =
    gemini.rights_tier_override || adjustedPiracyPrior >= 0.85;

  // Composite score: weighted blend of Gemini signals.
  // visual_match_score is weighted highest; context_authenticity lowest for
  // restricted tiers since Gemini may still drift upward on "tribute" framing.
  const contextWeight = isRestrictedTier(rightsTier) ? 0.10 : 0.30;
  const visualWeight = 0.50;
  const priorWeight = 1 - visualWeight - contextWeight;

  const compositeScore =
    gemini.visual_match_score * visualWeight +
    (1 - gemini.context_authenticity_score) * contextWeight +
    adjustedPiracyPrior * priorWeight;

  // Hard floor: rights tier override always produces at least "high".
  let severity: Severity;
  if (rightsTierOverrideApplied && gemini.commercial_exploitation) {
    severity = 'critical';
  } else if (rightsTierOverrideApplied || compositeScore >= 0.80) {
    severity = 'high';
  } else if (compositeScore >= 0.55) {
    severity = 'medium';
  } else {
    severity = 'low';
  }

  let classification: ScoringEngineOutput['classification'];
  if (severity === 'critical' || severity === 'high') {
    classification = 'Unauthorized';
  } else if (severity === 'medium') {
    classification = 'Likely Unauthorized';
  } else if (compositeScore >= 0.35) {
    classification = 'Needs Review';
  } else {
    classification = 'Likely Authorized';
  }

  return {
    severity,
    adjustedPiracyPrior,
    rightsTierOverrideApplied,
    compositeScore,
    classification,
  };
}