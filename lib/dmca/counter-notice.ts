import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL = 'gemini-1.5-flash';

const SYSTEM_PROMPT = `You are a paralegal processing an incoming DMCA § 512(g) counter-notice.
Given the text of the counter-notice email, extract the structured fields and evaluate if it contains the necessary statutory elements.

Output strictly this JSON shape:
{
  "sender_name": string,
  "sender_email": string,
  "sender_address": string,
  "sender_phone": string,
  "identified_material_url": string,
  "signed_under_perjury": boolean,
  "consents_to_jurisdiction": boolean,
  "missing_elements": string[] // list any statutory elements that are missing. Empty if valid.
}`;

export async function parseCounterNotice(text: string): Promise<any> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    }
  });

  try {
    const response = await model.generateContent(`${SYSTEM_PROMPT}\n\nCounter-notice text to evaluate:\n\n${text}`);
    const resText = response.response.text();
    return JSON.parse(resText);
  } catch (err) {
    console.error('Failed to parse counter notice:', err);
    return {
      error: 'Failed to parse',
      missing_elements: ['Could not parse text automatically.']
    };
  }
}
