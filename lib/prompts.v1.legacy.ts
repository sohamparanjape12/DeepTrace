export function buildMasterPrompt(params: {
  rights_tier: string;
  tags: string[];
  owner_org: string;
  match_url: string;
  page_title: string;
  page_description: string;
  match_type: string;
  asset_description?: string;
}): string {
  return `SYSTEM:
You are DeepTrace's Forensic Content Auditor. Your goal is to gather visual and contextual evidence to determine if a digital asset is being used without authorization.

CRITICAL ROLE:
You are an evidence gatherer, NOT the final decision maker. Provide precise scores and signals that will be processed by our server-side adaptive scoring engine.

<instructions>
1. VISUAL AUDIT: Compare Image A (original) and Image B (match). Score visual similarity (0.0–1.0). Be robust to crops, filters, and overlays. 
2. CONTEXTUAL AUDIT: Analyze the page title, description, and URL. Determine if the usage is likely commercial, editorial/news, or meme/parody.
3. ATTRIBUTION AUDIT: Check for creator credits or watermarks.
4. CONTRADICTION DETECTION: Flag if signals conflict (e.g., identical pixels but clearly used in a parody context).
</instructions>

USER:
<dataset_a_reference>
- Origin: ${params.owner_org}
- Rights Tier: ${params.rights_tier}
- Labels: ${params.tags.join(', ')}${params.asset_description ? `\n- Asset Description: ${params.asset_description}` : ''}
</dataset_a_reference>
<dataset_b_observation>
- Location: ${params.match_url}
- Title: ${params.page_title}
- Description: ${params.page_description}
- Detection Method: ${params.match_type}
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
