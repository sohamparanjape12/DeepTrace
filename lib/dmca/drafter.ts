import { GoogleGenerativeAI } from '@google/generative-ai';
import { NoticeDraft, NoticeDraftSchema } from './types';
import { Asset, Violation } from '../../types';

const MODEL = 'gemini-3.1-flash-lite-preview';

const SYSTEM_PROMPT = `You are a paralegal drafting fields for a DMCA § 512(c) notice.
You DO NOT write any legal language. You DO NOT write the good-faith statement
or the perjury statement. You DO NOT write the closing or signature.

Your only job is to populate this JSON contract with concise, factual prose
based on the evidence provided. Use neutral, non-inflammatory language.
Never assert the recipient's intent. Never accuse fraud, theft, or willful
infringement. State only what was observed.

Output strictly this JSON shape:
{
  "work_description": string,        // 1-2 sentences identifying the original work
  "infringement_description": string,// 1-2 sentences describing what was found
  "evidence_summary": string,        // 2-4 bullet points, prefixed with "- "
  "optional_context_note": string    // <= 80 words, optional context for the host
}

Hard rules:
- No adjectives like "blatant", "egregious", "obvious", "clearly".
- No first-person plural ("we", "our") — use "the rights holder".
- Quote URLs verbatim as provided. Do not shorten or modify them.
- If evidence is thin, return short fields. Do not embellish.`;

export async function draftNotice(violation: Violation, asset: Asset): Promise<NoticeDraft> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      maxOutputTokens: 800,
    }
  });

  const promptContent = `
${SYSTEM_PROMPT}

Violation ID: ${violation.violation_id}
Match URL: ${violation.match_url}
Original Asset ID: ${asset.id || asset.asset_id}
Asset Rights Tier: ${asset.rightsTier || asset.rights_tier}
Asset Tags: ${asset.tags?.join(', ') || 'None'}
RSE Reliability Score: ${violation.reliability_score || 'N/A'}
Audit Trail Steps:
${(violation.explainability_bullets || []).map(b => `- ${b}`).join('\n')}
${(violation.gemini_reasoning || '')}

Please generate the required JSON fields based on this evidence.
`;

  let attempt = 0;
  let resultJSON: any;

  while (attempt < 2) {
    attempt++;
    try {
      const response = await model.generateContent(promptContent);
      const text = response.response.text();
      const parsed = JSON.parse(text);

      // Validate with Zod
      resultJSON = NoticeDraftSchema.parse(parsed);

      // Basic adjective check just in case
      const bannedAdjectives = ['blatant', 'egregious', 'obvious', 'clearly'];
      const combinedText = Object.values(resultJSON).join(' ').toLowerCase();
      const hasBanned = bannedAdjectives.some(adj => combinedText.includes(adj));

      if (hasBanned) {
        throw new Error('Response contained banned adjectives.');
      }

      break;
    } catch (error) {
      if (attempt >= 2) {
        throw new Error(`Draft generation failed after 2 attempts: ${(error as any).message}`);
      }
    }
  }

  return resultJSON;
}
