import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AnalysisContext {
  caption?: string;
  surroundingText?: string;
  hashtags?: string[];
  metadata?: Record<string, any>;
  imageUrl?: string;
}

export interface AnalysisResult {
  severity: "CRITICAL" | "HIGH" | "LOW";
  sentiment_flag: "SAFE" | "TOXIC" | "MOCKERY";
  reasoning: string;
}

export function buildIntelligencePrompt(context: AnalysisContext): string {
  return `You are the central intelligence layer for DeepTrace and Brand protection platform. 

You will be provided with an image (a potentially unauthorized use of a digital asset) and its surrounding context (caption, surrounding webpage text, hashtags, and metadata).

Context Data:
- Caption: ${context.caption || 'N/A'}
- Surrounding Text: ${context.surroundingText || 'N/A'}
- Hashtags: ${context.hashtags?.join(', ') || 'N/A'}
- Metadata: ${JSON.stringify(context.metadata || {})}

Your task is to analyze this data and output a strictly formatted JSON object containing three fields: "severity", "sentiment_flag", and "reasoning". Do not output markdown, HTML, or conversational text. 

Follow these evaluation rules strictly:

1. Evaluate IP Severity ("severity"):
   - "CRITICAL": Direct piracy, unauthorized commercial use (e.g., selling merchandise with the logo), or links to illegal streams.
   - "HIGH": Unauthorized use by a brand/influencer for engagement farming without direct monetization.
   - "LOW": Legitimate editorial fair use (news articles) or standard fan engagement.

2. Evaluate Brand Safety Sentiment ("sentiment_flag"):
   - "SAFE": The surrounding text is positive, neutral, or standard sports banter.
   - "TOXIC": The asset is being used in a context involving hate speech, severe harassment, political extremism, or content that actively damages the organization's public reputation. 
   - "MOCKERY": The asset is being used primarily to ridicule the organization or players in a viral/meme capacity.

3. Provide Reasoning ("reasoning"):
   - A concise, 1-2 sentence explanation of why you assigned these specific tags.

Output Format:
{
  "severity": "CRITICAL" | "HIGH" | "LOW",
  "sentiment_flag": "SAFE" | "TOXIC" | "MOCKERY",
  "reasoning": "string"
}`;
}

export async function analyzeAssetContext(context: AnalysisContext): Promise<AnalysisResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");
  const modelName = (process.env.GEMINI_MODEL || "gemini-1.5-flash").trim();
  const model = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: { responseMimeType: "application/json" } as any
  });

  const promptText = buildIntelligencePrompt(context);
  const promptParts: any[] = [{ text: promptText }];

  if (context.imageUrl) {
    try {
      const resp = await fetch(context.imageUrl, { headers: { 'User-Agent': 'DeepTrace/1.0' } });
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        promptParts.push({
          inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType: resp.headers.get("content-type") || "image/jpeg"
          }
        });
      } else {
        console.warn(`Failed to fetch image from ${context.imageUrl}: HTTP ${resp.status}`);
      }
    } catch (err) {
      console.warn(`Failed to fetch image from ${context.imageUrl}:`, err);
    }
  }

  try {
    const result = await model.generateContent(promptParts);
    const text = result.response.text();
    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Analysis generation failed:", error);
    // Fallback in case of failure
    return {
      severity: "LOW",
      sentiment_flag: "SAFE",
      reasoning: "System fallback due to classification error."
    };
  }
}
