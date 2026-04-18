import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/firebase-admin';
import { ClassifyParams, GeminiClass, Severity } from '@/types';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Perform AI classification of a suspected violation using Gemini 1.5 Flash.
 * Updates the violation document with analysis and severity.
 */
export async function POST(req: NextRequest) {
  try {
    const body: ClassifyParams = await req.json();
    const { violationId, matchUrl, pageTitle, assetRightsTier, ownerOrg, matchType } = body;

    if (!violationId) {
      return NextResponse.json({ error: 'Missing violationId' }, { status: 400 });
    }

    // 1. Prepare classification prompt
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const prompt = `
      SYSTEM:
      You are a digital rights analyst for a sports media organization called DeepTrace.
      You classify whether a found image usage constitutes an IP violation.
      Always respond with valid JSON only. No markdown, no preamble.

      USER:
      Original asset context:
      - Rights tier: ${assetRightsTier}
      - Owner organization: ${ownerOrg}

      Matched page context:
      - URL: ${matchUrl}
      - Page title: ${pageTitle || 'Unknown'}
      - Match type: ${matchType} (full_match | partial_match | visually_similar)

      Classify the usage as one of:
      - AUTHORIZED        (confirmed licensed or official use)
      - UNAUTHORIZED      (clear commercial or redistributive use without license)
      - EDITORIAL_FAIR_USE (news/commentary use, likely covered by fair use)
      - NEEDS_REVIEW      (ambiguous, human review required)

      Respond with JSON:
      {
        "classification": "AUTHORIZED | UNAUTHORIZED | EDITORIAL_FAIR_USE | NEEDS_REVIEW",
        "confidence": 0.0-1.0,
        "reasoning": "1-2 sentence explanation",
        "commercial_signal": true|false,
        "watermark_likely_removed": true|false
      }
    `;

    // 2. Call Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // 3. Parse and validate JSON
    let analysis;
    try {
      // Clean possible markdown code blocks if the model ignores the preamble
      const cleanJson = text.replace(/```json|```/g, '').trim();
      analysis = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Gemini JSON parse error:', text);
      throw new Error('Failed to parse AI classification result');
    }

    // 4. Determine Severity
    // CRITICAL: UNAUTHORIZED and confidence >= 0.85
    // HIGH: UNAUTHORIZED and confidence 0.7-0.84, or NEEDS_REVIEW and confidence >= 0.85
    // MEDIUM: NEEDS_REVIEW, or EDITORIAL_FAIR_USE with commercial_signal = true
    // LOW: EDITORIAL_FAIR_USE or AUTHORIZED
    
    let severity: Severity = 'LOW';
    const conf = analysis.confidence || 0;
    const cls = analysis.classification as GeminiClass;

    if (cls === 'UNAUTHORIZED') {
      severity = conf >= 0.85 ? 'CRITICAL' : 'HIGH';
    } else if (cls === 'NEEDS_REVIEW') {
      severity = conf >= 0.85 ? 'HIGH' : 'MEDIUM';
    } else if (cls === 'EDITORIAL_FAIR_USE' && analysis.commercial_signal) {
      severity = 'MEDIUM';
    }

    // 5. Update Violation in Firestore
    const violationRef = db.collection('violations').doc(violationId);
    await violationRef.update({
      geminiClass: cls,
      geminiReasoning: analysis.reasoning,
      severity: severity,
      confidence: conf,
      confidenceScore: conf, // Storing for analytics
    });

    return NextResponse.json({
      violationId,
      classification: cls,
      severity,
      analysis
    });

  } catch (error: any) {
    console.error('Classification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
