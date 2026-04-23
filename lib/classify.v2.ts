import { GoogleGenerativeAI } from "@google/generative-ai";
import { 
  buildMasterPrompt, 
  DOMAIN_CLASS_PRIORS, 
  MasterPromptParams, 
  DomainClass 
} from "./prompts.v2";

// ── Types ──

export type Classification = 'AUTHORIZED' | 'UNAUTHORIZED' | 'EDITORIAL_FAIR_USE' | 'NEEDS_REVIEW' | 'INSUFFICIENT_EVIDENCE';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface EvidenceQuality {
  original_image_loaded: boolean;
  suspect_image_loaded: boolean;
  both_images_available: boolean;
  match_type_strength: number; // full_match=1.0, partial=0.7, visually_similar=0.4
}

export interface ClassifyParams extends MasterPromptParams {
  violationId: string;
  originalAssetUrl?: string;
  violationImageUrl?: string;
  assetFirstPublishUrl?: string;
}

export interface ClassificationResult {
  // Three axes
  relevancy: number;           // 0.0–1.0 — "is this my image?"
  confidence: number;          // 0.0–1.0 — "how sure are we?"
  reliability_score: number;   // 0–100 — dashboard-friendly version
  reliability_tier: 'HIGH' | 'MEDIUM' | 'LOW';

  // Classification
  classification: Classification;
  severity: Severity;
  recommended_action: 'escalate' | 'human_review' | 'monitor' | 'no_action';

  // Evidence
  domain_class: DomainClass;
  evidence_quality: EvidenceQuality;
  contradiction_flag: boolean;
  contradictions: string[];
  abstained: boolean;
  explainability_bullets: string[];

  // Raw signals from Gemini
  visual_match_score: number;
  contextual_match_score: number; // mapped from context_authenticity_score
  commercial_exploitation: boolean;
  is_derivative_work: boolean;
  watermark_intact: boolean;
  credit_present: boolean;
  context_type: string;
  transformation_type: string;
  reasoning_steps: string[];
  reasoning: string;

  // Adaptive weights used (for audit trail)
  applied_weights: Record<string, number>;

  // Legacy compatibility fields
  commercial_signal: boolean;
  watermark_likely_removed: boolean;
  scores: Record<string, number>;
  signals: Record<string, boolean | string>;
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
  } catch (e) {
    // invalid URL
  }
  return 'unknown';
}

function getPiracyPrior(domainClass: DomainClass): number {
  // Find a matching prior or use defaults
  for (const config of Object.values(DOMAIN_CLASS_PRIORS)) {
    if (config.class === domainClass) return config.piracy_prior;
  }
  
  switch (domainClass) {
    case 'wire_service': return 0.01;
    case 'major_news':   return 0.05;
    case 'social':       return 0.25;
    case 'betting':      return 0.85;
    case 'piracy':       return 0.95;
    case 'ecommerce':    return 0.45;
    default:             return 0.50; // unknown
  }
}

// ── Main Classifier ──

export async function classifyViolation(params: ClassifyParams): Promise<ClassificationResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
  const modelName = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: { responseMimeType: "application/json" }
  });

  // 1. Evidence Quality Check
  const evidenceQuality: EvidenceQuality = {
    original_image_loaded: !!params.originalAssetUrl,
    suspect_image_loaded: !!params.violationImageUrl,
    both_images_available: !!(params.originalAssetUrl && params.violationImageUrl),
    match_type_strength: params.matchType === 'full_match' ? 1.0 : params.matchType === 'partial_match' ? 0.7 : 0.4
  };

  const domainClass = classifyDomain(params.matchUrl);

  // 2. Gemini Evidence Gathering
  const textPrompt = buildMasterPrompt(params);
  const promptParts: any[] = [{ text: textPrompt }];

  const fetchToGenerativePart = async (url: string) => {
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': 'DeepTrace/1.0' } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buffer = await resp.arrayBuffer();
      return {
        inlineData: {
          data: Buffer.from(buffer).toString("base64"),
          mimeType: resp.headers.get("content-type") || "image/jpeg"
        }
      };
    } catch (err) {
      console.error(`Failed to fetch image from ${url}:`, err);
      return null;
    }
  };

  if (params.originalAssetUrl) {
    const part = await fetchToGenerativePart(params.originalAssetUrl);
    if (part) promptParts.push(part);
    else evidenceQuality.original_image_loaded = false;
  }
  if (params.violationImageUrl) {
    const part = await fetchToGenerativePart(params.violationImageUrl);
    if (part) promptParts.push(part);
    else evidenceQuality.suspect_image_loaded = false;
  }

  evidenceQuality.both_images_available = evidenceQuality.original_image_loaded && evidenceQuality.suspect_image_loaded;

  let jsonResp: any;
  try {
    const result = await model.generateContent(promptParts);
    const text = result.response.text();
    jsonResp = JSON.parse(text);
  } catch (error) {
    console.error("Gemini v2 call failed:", error);
    jsonResp = {
      visual_match_score: 0,
      context_authenticity_score: 0,
      attribution_licensing_score: 0,
      commercial_exploitation: false,
      is_derivative_work: false,
      watermark_intact: false,
      credit_present: false,
      context_type: 'unknown',
      transformation_type: 'none',
      reasoning_steps: ["System Error: Classification pipeline failed."],
      contradictions: []
    };
  }

  // 3. Adaptive Weighting Logic
  let wVisual = 0.60;
  let wContext = 0.30;
  let wAttribution = 0.10;

  if (!evidenceQuality.both_images_available) {
    wVisual = 0.10; // Collapse visual weight
    wContext = 0.70;
    wAttribution = 0.20;
  } else if (params.matchType === 'visually_similar') {
    wVisual = 0.40;
    wContext = 0.50;
    wAttribution = 0.10;
  }

  const applied_weights = { visual: wVisual, context: wContext, attribution: wAttribution };

  // 4. Three-Axis Scoring
  
  // Relevancy: "Is this my image?" (Heavily weighted towards visual)
  const relevancy = (jsonResp.visual_match_score * 0.8) + (evidenceQuality.match_type_strength * 0.2);

  // Confidence: "How sure are we?"
  let signalsCount = 0;
  if (jsonResp.visual_match_score > 0) signalsCount++;
  if (jsonResp.context_authenticity_score > 0) signalsCount++;
  if (jsonResp.attribution_licensing_score > 0) signalsCount++;
  
  const baseConfidence = (signalsCount / 3) * (evidenceQuality.both_images_available ? 1.0 : 0.6);
  const confidence = Math.max(0.1, baseConfidence - (jsonResp.contradictions?.length ? 0.2 : 0));

  // Reliability Score (0–100)
  const reliability_score = Math.round(((relevancy * 0.5) + (confidence * 0.5)) * 100);
  const reliability_tier = reliability_score >= 80 ? 'HIGH' : reliability_score >= 50 ? 'MEDIUM' : 'LOW';

  // Severity: "How bad is this?" (Domain prior * commercial signal * relevancy)
  const piracyPrior = getPiracyPrior(domainClass);
  const commercialMultiplier = jsonResp.commercial_exploitation ? 1.2 : 0.8;
  const severityRaw = Math.min(1.0, piracyPrior * commercialMultiplier * (0.5 + (relevancy * 0.5)));
  
  let severity: Severity = 'LOW';
  if (severityRaw >= 0.8) severity = 'CRITICAL';
  else if (severityRaw >= 0.5) severity = 'HIGH';
  else if (severityRaw >= 0.3) severity = 'MEDIUM';

  // 5. Classification with Hard Rules
  let classification: Classification = jsonResp.visual_match_score >= 0.7 ? 'UNAUTHORIZED' : 'NEEDS_REVIEW';

  const abstain = !evidenceQuality.both_images_available && jsonResp.context_authenticity_score < 0.4;
  const contradiction_flag = (jsonResp.visual_match_score >= 0.8 && jsonResp.context_authenticity_score <= 0.3) || (jsonResp.contradictions?.length > 0);

  if (abstain) {
    classification = 'INSUFFICIENT_EVIDENCE';
  } else if (domainClass === 'wire_service' && jsonResp.credit_present) {
    classification = 'AUTHORIZED';
  } else if (jsonResp.context_type === 'editorial' || jsonResp.context_type === 'meme_parody') {
    classification = 'EDITORIAL_FAIR_USE';
  } else if (contradiction_flag) {
    classification = 'NEEDS_REVIEW';
  }

  // 6. Temporal Impossibility Check
  if (params.pagePublishedAt && params.assetCaptureDate) {
    const pub = new Date(params.pagePublishedAt);
    const cap = new Date(params.assetCaptureDate);
    if (pub < cap) {
      classification = 'AUTHORIZED'; // Pre-dates asset
    }
  }

  // 7. Recommended Action
  let recommended_action: ClassificationResult['recommended_action'] = 'monitor';
  if (classification === 'UNAUTHORIZED' && severity === 'CRITICAL' && reliability_score >= 80) {
    recommended_action = 'escalate';
  } else if (classification === 'UNAUTHORIZED' || classification === 'NEEDS_REVIEW') {
    recommended_action = 'human_review';
  } else {
    recommended_action = 'no_action';
  }

  // 8. Explainability Bullets
  const explainability_bullets: string[] = [];
  if (jsonResp.visual_match_score >= 0.8) explainability_bullets.push(`✔ High visual match detected (${Math.round(jsonResp.visual_match_score * 100)}%)`);
  else if (jsonResp.visual_match_score >= 0.4) explainability_bullets.push(`⚠ Moderate visual similarity`);
  else explainability_bullets.push(`✖ Low visual match`);

  if (jsonResp.commercial_exploitation) explainability_bullets.push(`→ Commercial context identified`);
  if (jsonResp.credit_present) explainability_bullets.push(`ℹ Creator attribution found on page`);
  if (domainClass === 'wire_service') explainability_bullets.push(`ℹ Hosted on known wire-service domain`);
  if (contradiction_flag) explainability_bullets.push(`⚠ Conflicting signals detected`);
  if (jsonResp.is_derivative_work) explainability_bullets.push(`→ Transformation: ${jsonResp.transformation_type}`);

  return {
    relevancy,
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
    reasoning_steps: jsonResp.reasoning_steps || [],
    reasoning: (jsonResp.reasoning_steps || []).join(' '),
    applied_weights,
    // Legacy mapping
    commercial_signal: jsonResp.commercial_exploitation,
    watermark_likely_removed: jsonResp.is_derivative_work && !jsonResp.watermark_intact,
    scores: {
      visual: jsonResp.visual_match_score,
      context: jsonResp.context_authenticity_score,
      attribution: jsonResp.attribution_licensing_score
    },
    signals: {
      commercial: jsonResp.commercial_exploitation,
      derivative: jsonResp.is_derivative_work,
      watermark_intact: jsonResp.watermark_intact,
      credit: jsonResp.credit_present
    }
  };
}
