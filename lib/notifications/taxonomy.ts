import type {
  EventType,
  NotifSeverity,
  Category,
  Channel,
  NotificationPayload,
  NotificationAction,
} from './types';

// ── Taxonomy Entry ────────────────────────────────────────────────────────────

export interface TaxonomyEntry {
  category: Category;
  severity: NotifSeverity;
  defaultChannels: Channel[];
  icon: string; // lucide icon name
}

export const TAXONOMY: Record<EventType, TaxonomyEntry> = {
  'violation.critical': {
    category: 'violations',
    severity: 'critical',
    defaultChannels: ['in_app', 'toast', 'email_immediate'],
    icon: 'ShieldAlert',
  },
  'violation.high': {
    category: 'violations',
    severity: 'high',
    defaultChannels: ['in_app', 'toast'],
    icon: 'Shield',
  },
  'violation.needs_review': {
    category: 'violations',
    severity: 'medium',
    defaultChannels: ['in_app'],
    icon: 'Eye',
  },
  'pipeline.completed': {
    category: 'pipeline',
    severity: 'info',
    defaultChannels: ['in_app', 'toast'],
    icon: 'CheckCircle',
  },
  'pipeline.failed': {
    category: 'pipeline',
    severity: 'high',
    defaultChannels: ['in_app', 'toast', 'email_immediate'],
    icon: 'XCircle',
  },
  'dmca.dispatched': {
    category: 'dmca',
    severity: 'info',
    defaultChannels: ['in_app', 'toast'],
    icon: 'Send',
  },
  'dmca.counter_notice': {
    category: 'dmca',
    severity: 'high',
    defaultChannels: ['in_app', 'toast', 'email_immediate'],
    icon: 'AlertTriangle',
  },
  'dmca.content_removed': {
    category: 'dmca',
    severity: 'info',
    defaultChannels: ['in_app', 'toast'],
    icon: 'CheckCircle',
  },
};

// ── Template Functions ────────────────────────────────────────────────────────

type TemplateFn = (p: NotificationPayload) => {
  title: string;
  body: string;
  action?: NotificationAction;
};

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

export const TEMPLATES: Record<EventType, TemplateFn> = {
  'violation.critical': (p) => ({
    title: truncate(`Critical violation on ${p.asset_title ?? 'your asset'}`, 80),
    body: truncate(
      `Reliability score ${p.reliability_score ?? '—'}/100. Found on ${p.host_domain ?? 'unknown domain'}. Immediate action required.`,
      280
    ),
    action: p.violation_id
      ? { label: 'Review Violation', href: `/violations/${p.violation_id}` }
      : undefined,
  }),

  'violation.high': (p) => ({
    title: truncate(`High-severity violation detected on ${p.asset_title ?? 'your asset'}`, 80),
    body: truncate(
      `A high-priority infringement was found on ${p.host_domain ?? 'an external domain'}. Review and take action.`,
      280
    ),
    action: p.violation_id
      ? { label: 'Review Violation', href: `/violations/${p.violation_id}` }
      : undefined,
  }),

  'violation.needs_review': (p) => ({
    title: truncate(`Violation flagged for review on ${p.asset_title ?? 'your asset'}`, 80),
    body: truncate(
      `A potential infringement requires manual review. Forensic confidence is below the auto-escalation threshold.`,
      280
    ),
    action: p.violation_id
      ? { label: 'Review Now', href: `/violations/${p.violation_id}` }
      : undefined,
  }),

  'pipeline.completed': (p) => ({
    title: truncate(`Forensic audit complete for ${p.asset_title ?? 'your asset'}`, 80),
    body: truncate(
      `The scan pipeline has finished processing. Check your violations feed for new findings.`,
      280
    ),
    action: p.asset_id
      ? { label: 'View Asset', href: `/assets/${p.asset_id}` }
      : undefined,
  }),

  'pipeline.failed': (p) => ({
    title: truncate(`Pipeline failure on ${p.asset_title ?? 'your asset'}`, 80),
    body: truncate(
      `The forensic audit pipeline encountered a critical error and could not complete. The system will retry automatically.`,
      280
    ),
    action: p.asset_id
      ? { label: 'View Asset', href: `/assets/${p.asset_id}` }
      : undefined,
  }),

  'dmca.dispatched': (p) => ({
    title: truncate(`DMCA notice dispatched`, 80),
    body: truncate(
      `Your DMCA takedown notice has been successfully sent to the host's copyright agent. Awaiting response.`,
      280
    ),
    action: p.notice_id
      ? { label: 'View Notice', href: `/dmca/${p.notice_id}` }
      : undefined,
  }),

  'dmca.counter_notice': (p) => ({
    title: truncate(`Counter-notice received on DMCA filing`, 80),
    body: truncate(
      `The infringing party has filed a counter-notice. Review immediately and consult your legal team if necessary.`,
      280
    ),
    action: p.notice_id
      ? { label: 'Review Counter-Notice', href: `/dmca/${p.notice_id}` }
      : undefined,
  }),

  'dmca.content_removed': (p) => ({
    title: truncate(`Content successfully removed`, 80),
    body: truncate(
      `The infringing content has been taken down following your DMCA notice. No further action is required.`,
      280
    ),
    action: p.notice_id
      ? { label: 'View Notice', href: `/dmca/${p.notice_id}` }
      : undefined,
  }),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Maps a violation severity (from the forensic pipeline) to the appropriate
 * notification event type.
 */
export function severityToEventType(
  severity: string
): 'violation.critical' | 'violation.high' | 'violation.needs_review' {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'violation.critical';
    case 'HIGH':     return 'violation.high';
    default:         return 'violation.needs_review';
  }
}
