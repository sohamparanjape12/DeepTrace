export type DomainClass = 'wire_service' | 'major_news' | 'social' | 'betting' | 'piracy' | 'ecommerce' | 'unknown';

export const DOMAIN_CLASS_PRIORS: Record<string, { class: DomainClass, piracy_prior: number }> = {
  // Wire services — zero tolerance for false positives
  'reuters.com':     { class: 'wire_service', piracy_prior: 0.01 },
  'apnews.com':      { class: 'wire_service', piracy_prior: 0.01 },
  'gettyimages.com': { class: 'wire_service', piracy_prior: 0.02 },
  'afp.com':         { class: 'wire_service', piracy_prior: 0.01 },
  // Major news — low false-positive tolerance
  'bbc.com':         { class: 'major_news', piracy_prior: 0.05 },
  'espn.com':        { class: 'major_news', piracy_prior: 0.05 },
  'theguardian.com': { class: 'major_news', piracy_prior: 0.05 },
  'nytimes.com':     { class: 'major_news', piracy_prior: 0.05 },
  'cnn.com':         { class: 'major_news', piracy_prior: 0.05 },
  // Betting / gambling — high piracy prior
  'bet365.com':      { class: 'betting', piracy_prior: 0.85 },
  'skybet.com':      { class: 'betting', piracy_prior: 0.80 },
  'williamhill.com': { class: 'betting', piracy_prior: 0.80 },
  // Social media — medium prior
  'twitter.com':     { class: 'social', piracy_prior: 0.30 },
  'x.com':           { class: 'social', piracy_prior: 0.30 },
  'instagram.com':   { class: 'social', piracy_prior: 0.25 },
  'facebook.com':    { class: 'social', piracy_prior: 0.20 },
  'tiktok.com':      { class: 'social', piracy_prior: 0.35 },
  // Ecommerce / Merch
  'amazon.com':      { class: 'ecommerce', piracy_prior: 0.40 },
  'ebay.com':        { class: 'ecommerce', piracy_prior: 0.50 },
  'etsy.com':        { class: 'ecommerce', piracy_prior: 0.45 },
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

export function buildMasterPrompt(params: MasterPromptParams): string {
  const instructions = `SYSTEM:
You are DeepTrace's Forensic Content Auditor. Your goal is to gather visual and contextual evidence to determine if a digital asset is being used without authorization.

CRITICAL ROLE:
You are an evidence gatherer, NOT the final decision maker. Provide precise scores and signals that will be processed by our server-side adaptive scoring engine.

<instructions>
1. VISUAL AUDIT: Compare Image A (original) and Image B (match). Score visual similarity (0.0–1.0). Be robust to crops, filters, and overlays. 
2. CONTEXTUAL AUDIT: Analyze the page title, description, URL, and the visible page content provided. Determine if the usage is likely commercial (e-commerce, stock site), editorial/news (article, press release), social share, or meme/parody.
3. ATTRIBUTION AUDIT: Check for creator credits or watermarks.
4. CONTRADICTION DETECTION: Flag if signals conflict (e.g., identical pixels but clearly used in a parody context).
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
  "reasoning_steps": [
    "Step 1: Visual similarity...",
    "Step 2: Contextual analysis...",
    "Step 3: Signal cross-validation..."
  ],
  "contradictions": ["list any conflicting signals, or empty array"]
}`;
}
