// Shared type definitions for DeepTrace

export type ScanStatus = 'pending' | 'scanning' | 'clean' | 'violations_found';
export type RightsTier = 'editorial' | 'commercial' | 'all_rights' | 'no_reuse';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type GeminiClass = 'AUTHORIZED' | 'UNAUTHORIZED' | 'EDITORIAL_FAIR_USE' | 'NEEDS_REVIEW' | 'INSUFFICIENT_EVIDENCE';
export type ViolationStatus = 'open' | 'resolved' | 'disputed' | 'false_positive';
export type MatchType = 'full_match' | 'partial_match' | 'visually_similar';

export type AssetStatus = 'pending' | 'processed' | 'failed';
export type PipelineRightsTier = 'no_reuse' | 'editorial' | 'general';

export interface Asset {
  id: string;                  // New ID field (matches Phase 0)
  asset_id?: string;           // Legacy ID field
  url: string;                 // Source URL (matches Phase 0)
  source: string;              // Source platform/site (matches Phase 0)
  rightsTier: PipelineRightsTier; // New RightsTier (matches Phase 0)
  rights_tier?: RightsTier;    // Legacy RightsTier
  hash: string;                // Content/URL hash (matches Phase 0)
  clusterId?: string;          // For grouping similar assets
  status: AssetStatus;         // Pipeline status
  scan_status?: ScanStatus;    // Legacy scan status
  geminiResult?: any;          // AI processing results
  archivedUrl?: string;        // Permanent archive link
  
  // Existing/Legacy fields preserved for UI compatibility
  name?: string;
  owner_org?: string;
  owner_id?: string;
  uploaded_at?: string;
  tags?: string[];
  phash?: string;
  thumbnailUrl?: string;
  storageUrl?: string;
  createdAt?: any;             // Firestore Timestamp or Date
  updatedAt?: any;             // Firestore Timestamp or Date
}

export interface Violation {
  violation_id: string;
  owner_id: string;            // User ID for multi-tenant isolation
  asset_id: string;
  asset_name?: string;
  detected_at: string;        // ISO string
  match_url: string;
  match_type: MatchType;
  page_context?: string;
  gemini_class: GeminiClass;
  gemini_reasoning?: string;
  severity: Severity;
  status: ViolationStatus;
  reviewed_by?: string;
  assetThumbnailUrl?: string;
  confidence?: number;
  similarityScore?: number;
  commercialSignal?: boolean;
  watermarkLikelyRemoved?: boolean;
  // snake_case aliases used by Firestore / classify.ts
  commercial_signal?: boolean;
  watermark_likely_removed?: boolean;
  visual_match_score?: number;
  contextual_match_score?: number;
  reasoning_steps?: string[];
  is_derivative_work?: boolean;
  
  // Business Impact Fields
  estimated_reach?: number;
  monetized_usage?: boolean;
  brand_sensitivity?: 'high' | 'medium' | 'low';
  revenue_risk?: number;
  region?: string;

  // Reliability Scoring Engine (RSE) Fields
  reliability_score?: number;           // 0–100
  reliability_tier?: 'HIGH' | 'MEDIUM' | 'LOW';
  relevancy?: number;                   // 0.0–1.0
  recommended_action?: 'escalate' | 'human_review' | 'monitor' | 'no_action';
  
  // v2 Metadata
  classification_schema_version?: number;
  domain_class?: string;
  contradiction_flag?: boolean;
  explainability_bullets?: string[];
  abstain?: boolean;
  
  // Nested Data Maps
  scores?: Record<string, number>;
  signals?: Record<string, boolean | string>;
  evidence_quality?: {
    original_image_loaded: boolean;
    suspect_image_loaded: boolean;
    both_images_available: boolean;
    match_type_strength: number;
  };
  applied_weights?: Record<string, number>;

  // legacy / v1 fields
  visual_evidence_score?: number;       // 0.0–1.0
  transformation_integrity_score?: number;
  context_authenticity_score?: number;
  source_credibility_score?: number;
  behavioral_consistency_score?: number;
  attribution_licensing_score?: number;
  context_type?: string;
  transformation_type?: string;
  watermark_intact?: boolean;
  credit_present?: boolean;
  contradictions?: string[];
  abstained_v1?: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative';
  brand_safety_risk?: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  risk_factors?: string[];
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action_type: string;
  actor: string;
  asset_id?: string;
  violation_id?: string;
  prev_state?: string;
  next_state?: string;
}

export interface ClassifyParams {
  violationId: string;
  matchUrl: string;
  pageTitle?: string;
  pageDescription?: string;
  assetRightsTier: string;
  ownerOrg: string;
  matchType: string;
  tags?: string[];
}

