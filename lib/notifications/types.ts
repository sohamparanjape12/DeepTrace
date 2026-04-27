import { z } from 'zod';

// ── Enums ─────────────────────────────────────────────────────────────────────

export const EventTypeSchema = z.enum([
  'violation.critical',
  'violation.high',
  'violation.needs_review',
  'pipeline.completed',
  'pipeline.failed',
  'dmca.dispatched',
  'dmca.counter_notice',
  'dmca.content_removed',
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const SeveritySchema = z.enum(['critical', 'high', 'medium', 'info']);
export type NotifSeverity = z.infer<typeof SeveritySchema>;

export const ChannelSchema = z.enum(['in_app', 'toast', 'email_immediate']);
export type Channel = z.infer<typeof ChannelSchema>;

export const CategorySchema = z.enum(['violations', 'pipeline', 'dmca', 'system']);
export type Category = z.infer<typeof CategorySchema>;

// ── Payload ───────────────────────────────────────────────────────────────────

export const NotificationPayloadSchema = z.object({
  violation_id: z.string().optional(),
  asset_id: z.string().optional(),
  notice_id: z.string().optional(),
  scan_id: z.string().optional(),
  // Extra context for template rendering
  asset_title: z.string().optional(),
  host_domain: z.string().optional(),
  reliability_score: z.number().optional(),
  revenue_at_risk: z.number().optional(),
  severity_label: z.string().optional(),
});
export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;

// ── Notification Document ─────────────────────────────────────────────────────

export interface NotificationAction {
  label: string;
  href: string;
}

export interface NotificationDoc {
  id?: string;              // Firestore doc ID (set client-side after read)
  user_id: string;
  org_id?: string;
  event_type: EventType;
  category: Category;
  severity: NotifSeverity;
  title: string;
  body: string;
  action?: NotificationAction;
  payload: NotificationPayload;
  channels_delivered: Channel[];
  read_at: string | null;
  archived_at: string | null;
  created_at: any;          // Firestore ServerTimestamp or ISO string
  source_event_id: string;
}

// ── Preferences ───────────────────────────────────────────────────────────────

export interface ChannelToggles {
  in_app: boolean;
  toast: boolean;
  email: boolean;
}

export interface NotificationPreferences {
  channels: {
    violations: ChannelToggles;
    pipeline: ChannelToggles;
    dmca: ChannelToggles;
    system: ChannelToggles;
  };
  quiet_hours: {
    enabled: boolean;
    start: string; // "HH:MM" 24h
    end: string;   // "HH:MM" 24h
    tz: string;    // IANA timezone
  };
  email_digest: 'immediate' | 'daily' | 'off';
  digest_send_hour: number; // 0–23
  updated_at?: string;
}

// ── Emit Input ────────────────────────────────────────────────────────────────

export const EmitInputSchema = z.object({
  user_id: z.string().optional(),
  org_id: z.string().optional(),
  event_type: EventTypeSchema,
  payload: NotificationPayloadSchema,
  source_event_id: z.string().min(1),
  override_channels: z.array(ChannelSchema).optional(),
});
export type EmitInput = z.infer<typeof EmitInputSchema>;
