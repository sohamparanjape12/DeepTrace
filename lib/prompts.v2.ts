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

// Rights tiers that prohibit ALL third-party use with no exceptions.
// Keep in sync with RIGHTS_TIER_CONFIG in classify.v2.ts.
const RESTRICTED_TIERS = new Set([
  'no_reuse',
  'internal_use_only',
  'internal',
  'All Rights',
]);

export function isRestrictedTier(rightsTier: string): boolean {
  return RESTRICTED_TIERS.has(rightsTier);
}

export function buildMasterPrompt(params: MasterPromptParams): string {
  const restricted = isRestrictedTier(params.rightsTier);

  // Injected at the very top of the SYSTEM block for restricted tiers so
  // Gemini reads it before any other instruction. LLMs weight early context
  // more heavily — placement here is intentional.
  const rightsEnforcementDirective = restricted
    ? `
⚠️  RIGHTS ENFORCEMENT DIRECTIVE — READ BEFORE ALL OTHER INSTRUCTIONS:
The rights tier for this asset is: "${params.rightsTier}".
This asset is NOT licensed for ANY third-party use under ANY circumstances.

The following framing does NOT constitute a license and MUST NOT reduce severity:
  - "Tribute", "fan", or "homage" works
  - "Biography" or "commemorative" publications
  - "Educational" or "journalistic" claims
  - Positive sentiment or praise of the subject
  - Small-scale or individual sellers

ANY commercial exploitation (storefront listing, product sale, merchandise,
stock site) on ANY platform is a CRITICAL violation when rights_tier is
"${params.rightsTier}".

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
   CRITICAL: If the visual match is less than 0.50, and Image B does NOT appear to be a heavily transformed/edited version of Image A (i.e., they are fundamentally different images, even if they share the same subject), you MUST evaluate the context with a grain of salt. Do not let matching context (like title or description) artificially inflate the visual_match_score.
   IMPORTANT RULE: Two distinct images of the same subject (e.g., two different book covers, two different photos of the same person) are NOT derivative works of each other. Set "is_derivative_work" to true ONLY if Image B is clearly a modified (cropped, filtered, zoomed, edited) version of Image A itself.

2. CONTEXTUAL AUDIT: Analyze the page title, description, URL, and visible page content. Determine if the usage is:
   - commercial: product listing, storefront, merchandise, stock site
   - editorial: news article, press release on a recognized news domain
   - meme_parody: transformative, commentary-based
   - unknown: insufficient context
   IMPORTANT: A biography or tribute book sold on a retail platform (Amazon, eBay, Etsy) is COMMERCIAL, not editorial.
   Editorial context is only valid for recognized news/media domains (e.g. bbc.com, reuters.com, nytimes.com).
   A retail storefront cannot be editorial regardless of the content being sold.

3. SENTIMENT & BRAND SAFETY AUDIT: Analyze tone. Flag brand safety risks (adult content, gambling, hate speech, etc).

4. ATTRIBUTION AUDIT: Check for creator credits or watermarks.

5. CONTRADICTION DETECTION: Flag if signals conflict (e.g. identical pixels but used in a parody context).

6. RIGHTS TIER ENFORCEMENT: The rights tier "${params.rightsTier}" is a hard legal constraint, not a scoring input.
${restricted
      ? `   Because this asset is "${params.rightsTier}", apply the following mandatory score ceilings:
   - context_authenticity_score MUST be ≤ 0.20 for commercial, ecommerce, or storefront contexts.
   - commercial_exploitation MUST be true if the page is a product listing, storefront, or retail page.
   - rights_tier_override MUST be set to true.
   - Positive sentiment, tribute framing, or biography framing MUST NOT increase context_authenticity_score above 0.20.
   - "Tribute", "biography", "fan work", and "educational" are NOT licenses. Treat them as irrelevant to rights status.`
      : `   Apply standard scoring. The rights tier "${params.rightsTier}" permits some third-party uses; evaluate context carefully.`}
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
  "rights_tier_reasoning": "Explain how the rights tier of '${params.rightsTier}' affects classification. If override is true, state which ceiling rules were applied and why.",
  "reasoning_steps": [
    "Step 1: Visual similarity — describe what you see",
    "Step 2: Contextual analysis — describe the page type and domain",
    "Step 3: Sentiment and brand safety — tone and risk flags",
    "Step 4: Rights tier enforcement — state which rules were applied and what ceilings were enforced",
    "Step 5: Signal cross-validation — confirm or flag contradictions"
  ],
  "contradictions": ["list any conflicting signals, or empty array"]
}`;
}