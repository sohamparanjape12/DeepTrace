"use server";

import { classifyViolation, ClassifyParams, ClassificationResult } from "@/lib/classify";

/**
 * Server Action wrapper to securely execute the Gemini Classification engine from client components
 * without exposing the GEMINI_API_KEY to the browser.
 */
export async function runServerClassification(params: ClassifyParams): Promise<ClassificationResult> {
  return await classifyViolation(params);
}
