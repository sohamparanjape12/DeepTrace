# DeepTrace Firestore Schema

This document details the complete Firestore collection structure per PRD Section 12, serving as a unified reference.

## `/organizations/{org_id}`
Holds organization details, subscription levels, and alert configurations for notifications.
- **Fields:**
  - `name`: string
  - `plan`: string
  - `created_at`: timestamp
  - `alert_email`: string
  - `alert_threshold`: string (e.g. 'CRITICAL', 'HIGH')

**Example Document:**
```json
{
  "name": "FIFA Official",
  "plan": "enterprise",
  "created_at": "2024-05-18T12:00:00Z",
  "alert_email": "rights@fifa.example.com",
  "alert_threshold": "HIGH"
}
```

## `/assets/{asset_id}` (Legacy)
Represents official media assets uploaded by organizations for monitoring.
- **Fields:**
  - `owner_org`: string (Matches `org_id`)
  - `uploaded_at`: timestamp
  - `rights_tier`: string
  - `tags`: array of strings
  - `phash`: string
  - `embedding_id`: string
  - `storage_url`: string
  - `scan_status`: string
  - `last_scanned_at`: timestamp

## `/assets_v2/{asset_id}` (Current)
Core entity for ingestion and processing pipeline.
- **Fields:**
  - `id`: string
  - `url`: string
  - `source`: string
  - `rightsTier`: string ('no_reuse' | 'editorial' | 'general')
  - `hash`: string (SHA256)
  - `clusterId`: string (optional)
  - `status`: string ('pending' | 'processed' | 'failed')
  - `geminiResult`: object (optional)
  - `archivedUrl`: string (optional)
  - `createdAt`: timestamp
  - `updatedAt`: timestamp

**Example Document:**
```json
{
  "owner_org": "org_771x9",
  "uploaded_at": "2024-05-18T13:45:00Z",
  "rights_tier": "commercial",
  "tags": ["soccer", "worldcup", "final"],
  "phash": "a3b4c10f88...",
  "embedding_id": "emb_10928",
  "storage_url": "gs://deeptrace.appspot.com/assets/video.mp4",
  "scan_status": "completed",
  "last_scanned_at": "2024-05-19T13:45:00Z"
}
```

## `/violations/{violation_id}`
Instances of detected unauthorized instances of official assets.
- **Fields:**
  - `asset_id`: string
  - `detected_at`: timestamp
  - `match_url`: string
  - `match_type`: string
  - `page_context`: object
  - `gemini_class`: string
  - `gemini_reasoning`: string
  - `severity`: string ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')
  - `status`: string ('pending', 'resolved', 'disputed', 'false_positive')
  - `reviewed_by`: string

**Example Document:**
```json
{
  "asset_id": "asset_100x2",
  "detected_at": "2024-05-19T08:30:00Z",
  "match_url": "https://unauthorizedsite.com/media/clip123",
  "match_type": "full_match",
  "page_context": {
    "title": "Watch the World Cup Final Highlights",
    "description": "Free streaming of sports..."
  },
  "gemini_class": "UNAUTHORIZED",
  "gemini_reasoning": "Clear commercial redistribution without license.",
  "severity": "CRITICAL",
  "status": "pending",
  "reviewed_by": null
}
```

## `/audit_log/{log_id}`
An immutable ledger tracking resolution state changes on violations.
- **Fields:**
  - `timestamp`: timestamp
  - `action`: string
  - `actor`: string
  - `asset_id`: string
  - `violation_id`: string
  - `prev_state`: string
  - `new_state`: string

**Example Document:**
```json
{
  "timestamp": "2024-05-19T09:15:00Z",
  "action": "status_update",
  "actor": "user_19a8f",
  "asset_id": "asset_100x2",
  "violation_id": "viol_8h2jf",
  "prev_state": "pending",
  "new_state": "resolved"
}
```

## `/scans/{scan_id}`
Logs capturing the occurrences of Cloud Scheduler web scans.
- **Fields:**
  - `asset_id`: string
  - `triggered_at`: timestamp
  - `trigger_type`: string
  - `raw_vision_response`: object
  - `matches_count`: number
  - `status`: string

**Example Document:**
```json
{
  "asset_id": "asset_100x2",
  "triggered_at": "2024-05-19T13:45:00Z",
  "trigger_type": "scheduled",
  "raw_vision_response": {
    "responses": [...]
  },
  "matches_count": 2,
  "status": "success"
}
```
