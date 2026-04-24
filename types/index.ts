// Shared type definitions for DeepTrace

export type ScanStatus = 'pending' | 'scanning' | 'clean' | 'violations_found';
export type RightsTier = 'editorial' | 'commercial' | 'all_rights' | 'no_reuse';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type GeminiClass = 'AUTHORIZED' | 'UNAUTHORIZED' | 'EDITORIAL_FAIR_USE' | 'NEEDS_REVIEW';
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
  asset_id: string;
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
  assetRightsTier: string;
  ownerOrg: string;
  matchType: string;
}

