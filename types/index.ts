// Shared type definitions for DeepTrace

export type ScanStatus = 'pending' | 'scanning' | 'clean' | 'violations_found';
export type RightsTier = 'editorial' | 'commercial' | 'all_rights' | 'no_reuse';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type GeminiClass = 'AUTHORIZED' | 'UNAUTHORIZED' | 'EDITORIAL_FAIR_USE' | 'NEEDS_REVIEW';
export type ViolationStatus = 'open' | 'resolved' | 'disputed' | 'false_positive';
export type MatchType = 'full_match' | 'partial_match' | 'visually_similar';

export interface Asset {
  asset_id: string;
  name: string;
  owner_org: string;
  uploaded_at: string;        // ISO string
  rights_tier: RightsTier;
  tags: string[];
  phash?: string;
  scan_status: ScanStatus;
  thumbnailUrl?: string;
  storageUrl?: string;
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
