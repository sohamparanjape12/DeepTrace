import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildMasterPrompt } from "./prompts.v1.legacy";

// ── Input / Output Interfaces ──

export interface ClassifyParams {
  matchUrl: string;
  pageTitle: string;
  pageDescription: string;
  matchType: 'full_match' | 'partial_match' | 'visually_similar';
  rightsTier: string;
  ownerOrg: string;
  tags: string[];
  originalAssetUrl?: string;
  violationImageUrl?: string;
  assetDescription?: string;
}

export interface ClassificationResult {
  // Legacy fields (kept for backward compat)
  classification: 'AUTHORIZED' | 'UNAUTHORIZED' | 'EDITORIAL_FAIR_USE' | 'NEEDS_REVIEW';
  confidence: number;
  reasoning: string;
  commercial_signal: boolean;
  watermark_likely_removed: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  visual_match_score: number;
  contextual_match_score: number;
  reasoning_steps: string[];
  is_derivative_work: boolean;

  // ── Reliability Scoring Engine (RSE) ──
  reliability_score: number;           // 0–100
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  recommended_action: 'auto_enforce' | 'human_review' | 'no_action';

  // 6-Factor Sub-Scores (all 0.0–1.0)
  visual_evidence_score: number;
  transformation_integrity_score: number;
  context_authenticity_score: number;
  source_credibility_score: number;
  behavioral_consistency_score: number;
  attribution_licensing_score: number;

  // Forensic Signals
  context_type: string;
  transformation_type: string;
  watermark_intact: boolean;
  credit_present: boolean;
  contradictions: string[];
  abstained: boolean;
}

// ── Scoring Engine Constants ──

const WEIGHTS = {
  visual:         0.35,
  transformation: 0.15,
  context:        0.20,
  source:         0.10,
  behavior:       0.10,
  attribution:    0.10,
};

const THRESHOLDS = {
  HIGH:   80,
  MEDIUM: 50,
};

// ── Main Classification Function ──

/**
 * Classifies an asset usage violation using the multi-factor Reliability Scoring Engine.
 * Performs a 6-dimensional forensic audit, detects contradictions, and supports abstention.
 */
export async function classifyViolation(params: ClassifyParams): Promise<ClassificationResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
  const modelName = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();
  const model = genAI.getGenerativeModel({ model: modelName });

  const textPrompt = buildMasterPrompt({
    rights_tier: params.rightsTier,
    tags: params.tags,
    owner_org: params.ownerOrg,
    match_url: params.matchUrl,
    page_title: params.pageTitle,
    page_description: params.pageDescription,
    match_type: params.matchType,
    asset_description: params.assetDescription,
  });

  const promptParts: any[] = [{ text: textPrompt }];

  // Helper to fetch and convert an image URL to Gemini inlineData
  const fetchToGenerativePart = async (url: string) => {
    try {
      const resp = await fetch(url);
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
    if (part) {
      promptParts.push({ text: "\n--- IMAGE A: ORIGINAL ASSET (Dataset A Reference) ---" });
      promptParts.push(part);
    }
  }

  if (params.violationImageUrl) {
    const part = await fetchToGenerativePart(params.violationImageUrl);
    if (part) {
      promptParts.push({ text: "\n--- IMAGE B: SUSPECTED VIOLATION (Dataset B Observation) ---" });
      promptParts.push(part);
    }
  }

  // ── Call Gemini ──
  let jsonResp: any;
  try {
    const result = await model.generateContent(promptParts);
    const text = result.response.text();
    const cleanText = text.replace(/```json/i, '').replace(/```/g, '').trim();
    jsonResp = JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini classification failed:", error);
    jsonResp = {
      visual_evidence_score: 0,
      transformation_integrity_score: 0,
      context_authenticity_score: 0,
      source_credibility_score: 0,
      attribution_licensing_score: 0,
      classification: 'NEEDS_REVIEW',
      context_type: 'unknown',
      transformation_type: 'none',
      reasoning_steps: ["Error: Failed to parse AI response or API error."],
      commercial_intent_detected: false,
      is_derivative_work: false,
      watermark_intact: false,
      credit_present: false,
      contradictions: [],
    };
  }

  // ── Extract Raw Signals ──
  const {
    visual_evidence_score = 0,
    transformation_integrity_score = 0,
    context_authenticity_score = 0,
    source_credibility_score = 0,
    attribution_licensing_score = 0,
    classification: rawClassification = 'NEEDS_REVIEW',
    context_type = 'unknown',
    transformation_type = 'none',
    reasoning_steps = [],
    commercial_intent_detected = false,
    is_derivative_work = false,
    watermark_intact = false,
    credit_present = false,
    contradictions: rawContradictions = [],
  } = jsonResp;

  // Behavioral consistency — neutral baseline (future: query Firestore for domain history)
  const behavioral_consistency_score = 0.5;

  // ── Compute Reliability Score (0–100) ──
  const reliabilityRaw =
    (WEIGHTS.visual         * visual_evidence_score) +
    (WEIGHTS.transformation * transformation_integrity_score) +
    (WEIGHTS.context        * context_authenticity_score) +
    (WEIGHTS.source         * source_credibility_score) +
    (WEIGHTS.behavior       * behavioral_consistency_score) +
    (WEIGHTS.attribution    * attribution_licensing_score);

  const reliability_score = Math.round(reliabilityRaw * 100);

  // ── Confidence Level ──
  let confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  if (reliability_score >= THRESHOLDS.HIGH)   confidence_level = 'HIGH';
  else if (reliability_score >= THRESHOLDS.MEDIUM) confidence_level = 'MEDIUM';
  else confidence_level = 'LOW';

  // ── Abstention Logic ──
  // If 3+ sub-scores are 0, we have insufficient data — abstain
  const scores = [
    visual_evidence_score,
    transformation_integrity_score,
    context_authenticity_score,
    source_credibility_score,
    attribution_licensing_score,
  ];
  const zeroCount = scores.filter(s => s === 0).length;
  const abstained = zeroCount >= 3;

  // ── Contradiction Detection ──
  const contradictions: string[] = Array.isArray(rawContradictions) ? rawContradictions : [];

  // System-level contradiction checks
  if (visual_evidence_score > 0.8 && context_authenticity_score < 0.3) {
    contradictions.push(
      `High visual match (${(visual_evidence_score * 100).toFixed(0)}%) but low context authenticity (${(context_authenticity_score * 100).toFixed(0)}%) — possible editorial/parody use.`
    );
  }
  if (visual_evidence_score > 0.7 && credit_present && !commercial_intent_detected) {
    contradictions.push(
      `Strong visual match with credit present and no commercial intent — may be authorized usage.`
    );
  }
  if (is_derivative_work && watermark_intact) {
    contradictions.push(
      `Flagged as derivative work but watermark appears intact — contradictory signals.`
    );
  }

  // ── Determine Final Classification ──
  let classification = rawClassification as ClassificationResult['classification'];

  // Override classification based on RSE logic
  if (abstained) {
    classification = 'NEEDS_REVIEW';
  } else if (contradictions.length > 0 && classification === 'UNAUTHORIZED') {
    // Contradictions present: downgrade from auto-enforce to review
    classification = 'NEEDS_REVIEW';
  }

  // ── Recommended Action ──
  let recommended_action: ClassificationResult['recommended_action'];
  if (abstained || contradictions.length > 0) {
    recommended_action = 'human_review';
  } else if (reliability_score >= THRESHOLDS.HIGH && classification === 'UNAUTHORIZED') {
    recommended_action = 'auto_enforce';
  } else if (reliability_score >= THRESHOLDS.MEDIUM) {
    recommended_action = 'human_review';
  } else {
    recommended_action = 'no_action';
  }

  // ── Severity (derived from reliability + classification) ──
  let severity: ClassificationResult['severity'] = 'LOW';
  if (classification === 'UNAUTHORIZED' && reliability_score >= 85) {
    severity = 'CRITICAL';
  } else if (
    (classification === 'UNAUTHORIZED' && reliability_score >= 70) ||
    (classification === 'NEEDS_REVIEW' && reliability_score >= 85)
  ) {
    severity = 'HIGH';
  } else if (
    classification === 'NEEDS_REVIEW' ||
    (classification === 'EDITORIAL_FAIR_USE' && commercial_intent_detected)
  ) {
    severity = 'MEDIUM';
  }

  // ── Legacy Compatibility ──
  const confidence = reliabilityRaw; // 0.0–1.0
  const visual_match_score = visual_evidence_score;
  const contextual_match_score = context_authenticity_score;
  const commercial_signal = commercial_intent_detected;
  const watermark_likely_removed = is_derivative_work && !watermark_intact;
  const reasoning = Array.isArray(reasoning_steps) ? reasoning_steps.join(' ') : String(reasoning_steps);

  return {
    // Legacy
    classification,
    confidence,
    reasoning,
    commercial_signal,
    watermark_likely_removed,
    severity,
    visual_match_score,
    contextual_match_score,
    reasoning_steps: Array.isArray(reasoning_steps) ? reasoning_steps : [],
    is_derivative_work,

    // RSE
    reliability_score,
    confidence_level,
    recommended_action,
    visual_evidence_score,
    transformation_integrity_score,
    context_authenticity_score,
    source_credibility_score,
    behavioral_consistency_score,
    attribution_licensing_score,
    context_type,
    transformation_type,
    watermark_intact,
    credit_present,
    contradictions,
    abstained,
  };
}
