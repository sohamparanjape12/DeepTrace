import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildMasterPrompt } from "./prompts";

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
  classification: 'AUTHORIZED' | 'UNAUTHORIZED' | 'EDITORIAL_FAIR_USE' | 'NEEDS_REVIEW';
  confidence: number;
  reasoning: string;
  commercial_signal: boolean;
  watermark_likely_removed: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  // New fields from the master prompt
  visual_match_score: number;
  contextual_match_score: number;
  reasoning_steps: string[];
  is_derivative_work: boolean;
}

/**
 * Classifies an asset usage violation using the Forensic Content Auditor prompt.
 * Performs visual + contextual audit to determine the relationship between two digital assets.
 * 
 * @param params The detailed context required for the classification prompt.
 * @returns {Promise<ClassificationResult>} The classification output including inferred severity.
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

  let jsonResp: any;
  try {
    const result = await model.generateContent(promptParts);
    const text = result.response.text();

    // Safely parse JSON in case there's markdown wrappers
    const cleanText = text.replace(/```json/i, '').replace(/```/g, '').trim();
    jsonResp = JSON.parse(cleanText);
  } catch (error) {
    console.error("Gemini classification failed:", error);
    jsonResp = {
      classification: 'NEEDS_REVIEW',
      visual_match_score: 0,
      contextual_match_score: 0,
      reasoning_steps: ["Error: Failed to parse AI response or API error."],
      commercial_intent_detected: false,
      is_derivative_work: false,
    };
  }

  const {
    classification = 'NEEDS_REVIEW',
    visual_match_score = 0,
    contextual_match_score = 0,
    reasoning_steps = [],
    commercial_intent_detected = false,
    is_derivative_work = false,
  } = jsonResp;

  // Derive a unified confidence score (80% visual, 20% contextual as per prompt weighting)
  const confidence = (visual_match_score * 0.8) + (contextual_match_score * 0.2);

  // Derive reasoning string from steps array
  const reasoning = Array.isArray(reasoning_steps) ? reasoning_steps.join(' ') : String(reasoning_steps);

  // Map legacy fields
  const commercial_signal = commercial_intent_detected;
  const watermark_likely_removed = is_derivative_work && visual_match_score >= 0.7;

  // Severity derivation using the weighted confidence
  let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  if (classification === 'UNAUTHORIZED' && confidence >= 0.85) {
    severity = 'CRITICAL';
  } else if (
    (classification === 'UNAUTHORIZED' && confidence >= 0.70) ||
    (classification === 'NEEDS_REVIEW' && confidence >= 0.85)
  ) {
    severity = 'HIGH';
  } else if (
    classification === 'NEEDS_REVIEW' ||
    (classification === 'EDITORIAL_FAIR_USE' && commercial_signal === true)
  ) {
    severity = 'MEDIUM';
  } else {
    severity = 'LOW';
  }

  return {
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
  };
}
