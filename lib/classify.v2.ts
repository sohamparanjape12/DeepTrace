import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  buildMasterPrompt,
  DOMAIN_CLASS_PRIORS,
  MasterPromptParams,
  DomainClass
} from "./prompts.v2";
import { scrapePage } from "./jina";
import { RetryableError, PermanentError } from "./error-classes";

// ── Types ──
let lastGeminiRequestAt = 0;
const MIN_GEMINI_GAP = 4000; // 4 seconds

export type Classification = 'AUTHORIZED' | 'UNAUTHORIZED' | 'EDITORIAL_FAIR_USE' | 'NEEDS_REVIEW' | 'INSUFFICIENT_EVIDENCE';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface EvidenceQuality {
  original_image_loaded: boolean;
  suspect_image_loaded: boolean;
  both_images_available: boolean;
  match_type_strength: number;
}

export interface ClassifyParams extends MasterPromptParams {
  violationId: string;
  originalAssetUrl?: string;
  violationImageUrl?: string;
  assetFirstPublishUrl?: string;
  violationImageBuffer?: Buffer;
  violationImageMime?: string;
  gateSimilarity?: number;
  gateTier?: 'NEAR_IDENTICAL' | 'TRANSFORMED' | 'HIGH_RISK_OVERRIDE' | 'DROPPED_LOW_SIM' | 'DROPPED_NO_HASH';
}

export interface ClassificationResult {
  relevancy: number;
  confidence: number;
  reliability_score: number;
  reliability_tier: 'HIGH' | 'MEDIUM' | 'LOW';
  classification: Classification;
  severity: Severity;
  recommended_action: 'escalate' | 'human_review' | 'monitor' | 'no_action';
  domain_class: DomainClass;
  evidence_quality: EvidenceQuality;
  contradiction_flag: boolean;
  contradictions: string[];
  abstained: boolean;
  explainability_bullets: string[];
  visual_match_score: number;
  contextual_match_score: number;
  commercial_exploitation: boolean;
  is_derivative_work: boolean;
  watermark_intact: boolean;
  credit_present: boolean;
  context_type: string;
  transformation_type: string;
  reasoning_steps: string[];
  reasoning: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  brand_safety_risk: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  risk_factors: string[];
  applied_weights: Record<string, number | boolean | string>;
  region: string;
  revenue_risk: number;
  commercial_signal: boolean;
  watermark_likely_removed: boolean;
  scores: Record<string, number>;
  signals: Record<string, boolean | string>;
}

// ── FIX 1: Centralized rights tier config ──────────────────────────────────
// Single source of truth for all restricted tiers and their scoring impact.
// Previously isStrictlyRestricted only checked 'no_reuse' | 'internal_use_only'
// but the multiplier table in prompts.v2.ts also had 'internal' | 'All Rights'.
// This unifies them and adds severityFloor so severity and classification
// can never disagree.

const RIGHTS_TIER_CONFIG: Record<string, {
  isRestricted: boolean;
  piracyMultiplier: number;
  severityFloor: Severity;
}> = {
  'no_reuse': { isRestricted: true, piracyMultiplier: 2.5, severityFloor: 'CRITICAL' },
  'internal_use_only': { isRestricted: true, piracyMultiplier: 2.5, severityFloor: 'CRITICAL' },
  'internal': { isRestricted: true, piracyMultiplier: 2.5, severityFloor: 'CRITICAL' },
  'All Rights': { isRestricted: true, piracyMultiplier: 2.0, severityFloor: 'HIGH' },
  'Commercial': { isRestricted: false, piracyMultiplier: 1.0, severityFloor: 'MEDIUM' },
  'Editorial': { isRestricted: false, piracyMultiplier: 0.8, severityFloor: 'LOW' },
};

function getRightsTierConfig(rightsTier: string) {
  return RIGHTS_TIER_CONFIG[rightsTier] ?? {
    isRestricted: false,
    piracyMultiplier: 1.0,
    severityFloor: 'MEDIUM' as Severity,
  };
}

// ── FIX 2: Domain prior lookup by URL, not by DomainClass ─────────────────
// The old getPiracyPrior(domainClass) iterated Object.values() and returned
// the FIRST domain it found with that class — so ebay.com (0.50) could
// shadow amazon.com (0.45), and any class lookup was non-deterministic.
// Now we match the actual hostname directly.

function getPiracyPriorForUrl(url: string): number {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, config] of Object.entries(DOMAIN_CLASS_PRIORS)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return config.piracy_prior;
      }
    }
  } catch (_) { }

  // Fallback by class if domain isn't in the table
  const domainClass = classifyDomain(url);
  switch (domainClass) {
    case 'wire_service': return 0.01;
    case 'major_news': return 0.05;
    case 'social': return 0.25;
    case 'betting': return 0.85;
    case 'piracy': return 0.95;
    case 'ecommerce': return 0.45;
    default: return 0.50;
  }
}

// ── FIX 3: getAdjustedPiracyPrior is now ACTUALLY CALLED in scoring ────────
// In the previous version this function was defined but never invoked —
// severity was computed from the raw piracy prior with no tier multiplier.

function getAdjustedPiracyPrior(url: string, rightsTier: string): number {
  const basePrior = getPiracyPriorForUrl(url);
  const { piracyMultiplier } = getRightsTierConfig(rightsTier);
  return Math.min(basePrior * piracyMultiplier, 0.95);
}

// ── FIX 4: computeSeverity applies the hard severityFloor ─────────────────
// The old logic had no floor, so a restricted-tier UNAUTHORIZED result on
// amazon.com would still land at MEDIUM because severityRaw ≈ 0.43.
// Now: if classification === UNAUTHORIZED, severity can never fall below
// the tier's defined floor (CRITICAL for no_reuse, HIGH for All Rights).

const SEVERITY_ORDER: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function computeSeverity(
  adjustedPrior: number,
  relevancyAdjusted: number,
  commercialExploitation: boolean,
  classification: Classification,
  rightsTier: string,
): Severity {
  const commercialMultiplier = commercialExploitation ? 1.2 : 0.8;
  const severityRaw = Math.min(
    1.0,
    adjustedPrior * commercialMultiplier * (0.5 + relevancyAdjusted * 0.5)
  );

  let severity: Severity =
    severityRaw >= 0.80 ? 'CRITICAL' :
      severityRaw >= 0.50 ? 'HIGH' :
        severityRaw >= 0.30 ? 'MEDIUM' : 'LOW';

  // Hard floor: UNAUTHORIZED + restricted tier → severity can never go below floor
  if (classification === 'UNAUTHORIZED') {
    const { severityFloor } = getRightsTierConfig(rightsTier);
    if (SEVERITY_ORDER.indexOf(severity) < SEVERITY_ORDER.indexOf(severityFloor)) {
      severity = severityFloor;
    }
  }

  return severity;
}

// ── Helpers ──

export function classifyDomain(url: string): DomainClass {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const [domain, config] of Object.entries(DOMAIN_CLASS_PRIORS)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return config.class;
      }
    }
  } catch (_) { }
  return 'unknown';
}

function estimateRegion(url: string, domainClass: DomainClass): string {
  try {
    const hostname = new URL(url).hostname;
    const tld = hostname.split('.').pop()?.toLowerCase();
    const regions: Record<string, string> = {
      'com': 'North America', 'net': 'Global', 'org': 'Global',
      'io': 'North America', 'uk': 'Western Europe', 'de': 'Western Europe',
      'fr': 'Western Europe', 'it': 'Western Europe', 'es': 'Western Europe',
      'nl': 'Western Europe', 'cn': 'APAC', 'jp': 'APAC', 'in': 'APAC',
      'br': 'LATAM', 'mx': 'LATAM', 'ru': 'Eastern Europe',
    };
    if (tld && regions[tld]) return regions[tld];
    if (domainClass === 'major_news' || domainClass === 'social') return 'Global';
    if (domainClass === 'piracy' || domainClass === 'betting') return 'Offshore/Emerging';
  } catch (_) { }
  return 'International';
}

function calculateRevenueRisk(severity: Severity, domainClass: DomainClass): number {
  const baseRates: Record<Severity, number> = {
    'CRITICAL': 850, 'HIGH': 350, 'MEDIUM': 120, 'LOW': 45
  };
  const multipliers: Record<DomainClass, number> = {
    'piracy': 2.5, 'major_news': 1.8, 'social': 1.2, 'betting': 2.0,
    'wire_service': 0.8, 'ecommerce': 3.0, 'unknown': 1.0,
    'stock_photo': 0.5, 'portfolio': 0.3
  };
  return Math.round(baseRates[severity] * (multipliers[domainClass] || 1));
}

function bufferToGenerativePart(buf: Buffer, mime = 'image/jpeg') {
  return { inlineData: { data: buf.toString('base64'), mimeType: mime } };
}

// ── Main Classifier ──

export async function classifyViolation(params: ClassifyParams): Promise<ClassificationResult> {
  const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
  );
  const modelName = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" } as any
  });

  // 1. Scrape Page Context
  let scraped = { title: '', description: '', bodyText: '' };
  if (!params.pageTitle || !params.pageDescription) {
    scraped = await scrapePage(params.matchUrl);
  }
  const enrichedParams = {
    ...params,
    pageTitle: params.pageTitle || scraped.title,
    pageDescription: params.pageDescription || scraped.description,
    pageBody: params.pageBody || scraped.bodyText
  };

  // 2. Evidence Quality
  const evidenceQuality: EvidenceQuality = {
    original_image_loaded: !!params.originalAssetUrl,
    suspect_image_loaded: !!params.violationImageUrl,
    both_images_available: !!(params.originalAssetUrl && params.violationImageUrl),
    match_type_strength: params.matchType === 'full_match' ? 1.0
      : params.matchType === 'partial_match' ? 0.7 : 0.4
  };

  const domainClass = classifyDomain(enrichedParams.matchUrl);

  // 3. Build prompt and image parts
  const textPrompt = buildMasterPrompt(enrichedParams);
  const promptParts: any[] = [{ text: textPrompt }];

  const fetchToGenerativePart = async (url: string) => {
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': 'DeepTrace/1.0' } });
      if (!resp.ok) {
        if (resp.status === 429 || resp.status >= 500) throw new RetryableError(`Image fetch: ${resp.status}`);
        if (resp.status === 404 || resp.status === 403) throw new PermanentError(`Image inaccessible: ${resp.status}`);
        throw new PermanentError(`Image fetch failed: ${resp.status}`);
      }
      const buffer = await resp.arrayBuffer();
      return {
        inlineData: {
          data: Buffer.from(buffer).toString("base64"),
          mimeType: resp.headers.get("content-type") || "image/jpeg"
        }
      };
    } catch (err) {
      if (err instanceof RetryableError || err instanceof PermanentError) throw err;
      throw new RetryableError((err as any).message);
    }
  };

  if (params.originalAssetUrl) {
    const part = await fetchToGenerativePart(params.originalAssetUrl);
    if (part) promptParts.push(part);
    else evidenceQuality.original_image_loaded = false;
  }

  if (params.violationImageBuffer) {
    promptParts.push(bufferToGenerativePart(
      params.violationImageBuffer,
      params.violationImageMime || 'image/jpeg'
    ));
    evidenceQuality.suspect_image_loaded = true;
  } else if (params.violationImageUrl) {
    const part = await fetchToGenerativePart(params.violationImageUrl);
    if (part) promptParts.push(part);
    else evidenceQuality.suspect_image_loaded = false;
  }

  evidenceQuality.both_images_available =
    evidenceQuality.original_image_loaded && evidenceQuality.suspect_image_loaded;

  // 4. Call Gemini
  let jsonResp: any;
  try {
    const now = Date.now();
    const timeSinceLast = now - lastGeminiRequestAt;
    if (timeSinceLast < MIN_GEMINI_GAP) {
      await new Promise(resolve => setTimeout(resolve, MIN_GEMINI_GAP - timeSinceLast));
    }
    lastGeminiRequestAt = Date.now();

    const result = await model.generateContent(promptParts);
    const text = result.response.text();
    if (!text || text.length < 5) throw new RetryableError('Empty Gemini response');
    jsonResp = JSON.parse(text);
  } catch (error: any) {
    if (error instanceof RetryableError || error instanceof PermanentError) throw error;
    const msg = error.message?.toLowerCase() || '';
    const code = error.code || (error.status === 'RESOURCE_EXHAUSTED' ? 8 : 0);
    if (code === 8 || msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
      throw new RetryableError('Gemini rate limit exceeded (Quota Exhausted)');
    }
    if (msg.includes('safety') || msg.includes('blocked')) {
      throw new RetryableError('Gemini safety block');
    }
    throw new RetryableError(`Gemini Error: ${error.message || 'Unknown failure'}`);
  }

  // 5. Adaptive Weights
  let wVisual = 0.60, wContext = 0.30, wAttribution = 0.10;
  if (!evidenceQuality.both_images_available) {
    wVisual = 0.10; wContext = 0.70; wAttribution = 0.20;
  } else if (params.matchType === 'visually_similar') {
    wVisual = 0.40; wContext = 0.50; wAttribution = 0.10;
  }

  // 6. Three-Axis Scoring
  const gateSim = typeof params.gateSimilarity === 'number'
    ? Math.max(0, Math.min(1, params.gateSimilarity)) : null;

  const relevancy = gateSim !== null
    ? (jsonResp.visual_match_score * 0.7) + (evidenceQuality.match_type_strength * 0.2) + (gateSim * 0.1)
    : (jsonResp.visual_match_score * 0.8) + (evidenceQuality.match_type_strength * 0.2);

  const relevancyAdjusted = (
    gateSim !== null && jsonResp.visual_match_score >= 0.9 && gateSim <= 0.4
  ) ? relevancy * 0.6 : relevancy;

  let signalsCount = 0;
  if (jsonResp.visual_match_score > 0) signalsCount++;
  if (jsonResp.context_authenticity_score > 0) signalsCount++;
  if (jsonResp.attribution_licensing_score > 0) signalsCount++;

  const baseConfidence = (signalsCount / 3) * (evidenceQuality.both_images_available ? 1.0 : 0.6);
  const confidence = Math.max(0.1, baseConfidence - (jsonResp.contradictions?.length ? 0.2 : 0));

  const reliability_score = Math.round(((relevancyAdjusted * 0.5) + (confidence * 0.5)) * 100);
  const reliability_tier = reliability_score >= 80 ? 'HIGH' : reliability_score >= 50 ? 'MEDIUM' : 'LOW';

  // 7. Classification
  const { isRestricted } = getRightsTierConfig(params.rightsTier);
  const abstain = !evidenceQuality.both_images_available && jsonResp.context_authenticity_score < 0.4;
  const contradiction_flag = (jsonResp.visual_match_score >= 0.8 && jsonResp.context_authenticity_score <= 0.3)
    || (jsonResp.contradictions?.length > 0);

  let classification: Classification = jsonResp.visual_match_score >= 0.7 ? 'UNAUTHORIZED' : 'NEEDS_REVIEW';

  if (abstain) {
    classification = 'INSUFFICIENT_EVIDENCE';
  } else if (isRestricted) {
    classification = jsonResp.visual_match_score >= 0.5 ? 'UNAUTHORIZED' : 'NEEDS_REVIEW';
  } else if (domainClass === 'wire_service' && jsonResp.credit_present) {
    classification = 'AUTHORIZED';
  } else if (jsonResp.context_type === 'editorial' || jsonResp.context_type === 'meme_parody') {
    classification = 'EDITORIAL_FAIR_USE';
  } else if (contradiction_flag) {
    classification = 'NEEDS_REVIEW';
  }

  // Temporal impossibility
  if (params.pagePublishedAt && params.assetCaptureDate) {
    const pub = new Date(params.pagePublishedAt);
    const cap = new Date(params.assetCaptureDate);
    if (pub < cap) classification = 'AUTHORIZED';
  }

  // 8. Severity — FIX 3+4 applied here
  const adjustedPrior = getAdjustedPiracyPrior(enrichedParams.matchUrl, params.rightsTier);
  const severity = computeSeverity(
    adjustedPrior,
    relevancyAdjusted,
    jsonResp.commercial_exploitation,
    classification,
    params.rightsTier,
  );

  // 9. Recommended Action
  let recommended_action: ClassificationResult['recommended_action'] = 'monitor';
  if (classification === 'UNAUTHORIZED' && (severity === 'CRITICAL' && reliability_score >= 80 || isRestricted)) {
    recommended_action = 'escalate';
  } else if (classification === 'UNAUTHORIZED' || classification === 'NEEDS_REVIEW') {
    recommended_action = 'human_review';
  } else {
    recommended_action = 'no_action';
  }

  // 10. Explainability Bullets
  const explainability_bullets: string[] = [];
  if (jsonResp.visual_match_score >= 0.8)
    explainability_bullets.push(`✔ High visual match detected (${Math.round(jsonResp.visual_match_score * 100)}%)`);
  else if (jsonResp.visual_match_score >= 0.4)
    explainability_bullets.push(`⚠ Moderate visual similarity`);
  else
    explainability_bullets.push(`✖ Low visual match`);

  if (jsonResp.commercial_exploitation) explainability_bullets.push(`→ Commercial context identified`);
  if (jsonResp.credit_present) explainability_bullets.push(`ℹ Creator attribution found on page`);
  if (domainClass === 'wire_service') explainability_bullets.push(`ℹ Hosted on known wire-service domain`);
  if (contradiction_flag) explainability_bullets.push(`⚠ Conflicting signals detected`);
  if (jsonResp.is_derivative_work) explainability_bullets.push(`→ Transformation: ${jsonResp.transformation_type}`);

  if (isRestricted) {
    explainability_bullets.push(`⛔ Rights tier override: "${params.rightsTier}" prohibits all external reuse`);
    explainability_bullets.push(`⛔ Severity floor applied: minimum ${getRightsTierConfig(params.rightsTier).severityFloor}`);
    if (jsonResp.context_type === 'editorial' || jsonResp.context_type === 'meme_parody') {
      explainability_bullets.push(`⚠ Gemini detected editorial context — overridden by rights tier restriction`);
    }
  }

  if (gateSim !== null) {
    explainability_bullets.push(
      `ℹ Pre-filter similarity ${Math.round(gateSim * 100)}%${params.gateTier ? ` (${params.gateTier})` : ''}`
    );
  }
  if (gateSim !== null && jsonResp.visual_match_score >= 0.9 && gateSim <= 0.4) {
    explainability_bullets.push('⚠ Gemini and pre-filter disagree — relevancy dampened');
  }

  return {
    relevancy: relevancyAdjusted,
    confidence,
    reliability_score,
    reliability_tier,
    classification,
    severity,
    recommended_action,
    domain_class: domainClass,
    evidence_quality: evidenceQuality,
    contradiction_flag,
    contradictions: jsonResp.contradictions || [],
    abstained: abstain,
    explainability_bullets,
    visual_match_score: jsonResp.visual_match_score,
    contextual_match_score: jsonResp.context_authenticity_score,
    commercial_exploitation: jsonResp.commercial_exploitation,
    is_derivative_work: jsonResp.is_derivative_work,
    watermark_intact: jsonResp.watermark_intact,
    credit_present: jsonResp.credit_present,
    context_type: jsonResp.context_type,
    transformation_type: jsonResp.transformation_type,
    sentiment: jsonResp.sentiment || 'neutral',
    brand_safety_risk: jsonResp.brand_safety_risk || 'safe',
    risk_factors: jsonResp.risk_factors || [],
    reasoning_steps: jsonResp.reasoning_steps || [],
    reasoning: (jsonResp.reasoning_steps || []).join(' '),
    applied_weights: {
      visual: wVisual,
      context: wContext,
      attribution: wAttribution,
      gate_similarity_used: gateSim !== null,
      gate_similarity_value: gateSim ?? 0,
      adjusted_piracy_prior: adjustedPrior,
      rights_tier_floor: getRightsTierConfig(params.rightsTier).severityFloor,
    },
    region: estimateRegion(enrichedParams.matchUrl, domainClass),
    revenue_risk: calculateRevenueRisk(severity, domainClass),
    commercial_signal: jsonResp.commercial_exploitation,
    watermark_likely_removed: jsonResp.is_derivative_work && !jsonResp.watermark_intact,
    scores: {
      visual: jsonResp.visual_match_score,
      context: jsonResp.context_authenticity_score,
      attribution: jsonResp.attribution_licensing_score,
      adjusted_prior: adjustedPrior,
    },
    signals: {
      commercial: jsonResp.commercial_exploitation,
      derivative: jsonResp.is_derivative_work,
      watermark_intact: jsonResp.watermark_intact,
      credit: jsonResp.credit_present,
    }
  };
}