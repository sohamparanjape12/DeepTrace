'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Shield, Eye, CheckCircle, XCircle, Send, AlertTriangle, Archive } from 'lucide-react';
import type { NotificationDoc } from '@/lib/notifications/types';
import { useNotificationStore } from '@/lib/notifications/store';

// ── Icon Map ──────────────────────────────────────────────────────────────────

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldAlert, Shield, Eye, CheckCircle, XCircle, Send, AlertTriangle,
};

import { TAXONOMY } from '@/lib/notifications/taxonomy';

// ── Time Ago ──────────────────────────────────────────────────────────────────

function timeAgo(ts: any): string {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: NotificationDoc;
  compact?: boolean; // true = panel view, false = full-page view
}

export function NotificationItem({ notification: n, compact = true }: NotificationItemProps) {
  const { archive } = useNotificationStore();
  const isUnread = !n.read_at && !n.archived_at;
  const taxonomy = TAXONOMY[n.event_type];
  const IconComp = ICONS[taxonomy?.icon ?? 'Shield'] ?? Shield;

  const unreadClass = isUnread ? `notif-item--unread notif-item--${n.severity}` : '';

  return (
    <div className={`notif-item ${unreadClass}`} role="listitem">
      {/* Icon */}
      <div className={`notif-item__icon-wrap notif-item__icon-wrap--${n.severity}`} aria-hidden="true">
        <IconComp className={`notif-item__icon--${n.severity}`} style={{ width: 14, height: 14 }} />
      </div>

      {/* Content */}
      <div className="notif-item__content">
        <p className="notif-item__title">
          {n.title}
          <span className="sr-only"> — {n.severity} severity</span>
        </p>
        {!compact && <p className="notif-item__body">{n.body}</p>}
        {compact && n.body && (
          <p className="notif-item__body" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {n.body}
          </p>
        )}
        {n.action && (
          <Link href={n.action.href} className="notif-item__action">
            {n.action.label}
          </Link>
        )}
      </div>

      {/* Meta */}
      <div className="notif-item__meta">
        <time className="notif-item__time" dateTime={typeof n.created_at === 'string' ? n.created_at : undefined}>
          {timeAgo(n.created_at)}
        </time>
        {n.id && (
          <button
            className="notif-item__archive-btn"
            onClick={(e) => { e.stopPropagation(); archive(n.id!); }}
            aria-label="Archive notification"
            title="Archive"
          >
            <Archive style={{ width: 10, height: 10 }} />
          </button>
        )}
      </div>
    </div>
  );
}
