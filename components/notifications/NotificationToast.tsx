'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { X, ShieldAlert, Shield, Eye, CheckCircle, XCircle, Send, AlertTriangle } from 'lucide-react';
import type { NotificationDoc } from '@/lib/notifications/types';
import { TAXONOMY } from '@/lib/notifications/taxonomy';

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  ShieldAlert, Shield, Eye, CheckCircle, XCircle, Send, AlertTriangle,
};

// Auto-dismiss durations in ms
const DISMISS_DURATION: Record<string, number> = {
  info:     5000,
  medium:   5000,
  high:     8000,
  critical: 0, // sticky — user must dismiss
};

interface ToastItem {
  notification: NotificationDoc;
  id: string;
  leaving: boolean;
}

interface NotificationToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

function Toast({ toast: { notification: n, id, leaving }, onDismiss }: NotificationToastProps) {
  const taxonomy = TAXONOMY[n.event_type];
  const IconComp = ICONS[taxonomy?.icon ?? 'Shield'] ?? Shield;
  const duration = DISMISS_DURATION[n.severity] ?? 5000;
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (duration === 0) return; // sticky
    const timer = setTimeout(() => onDismiss(id), duration);
    if (progressRef.current && duration > 0) {
      progressRef.current.style.animation = `notif-progress ${duration}ms linear forwards`;
    }
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const role = n.severity === 'info' || n.severity === 'medium' ? 'status' : 'alert';

  return (
    <div
      className={`notif-toast ${leaving ? 'notif-toast--leaving' : 'notif-toast--entering'}`}
      role={role}
      aria-live={n.severity === 'critical' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <div className={`notif-toast__severity-bar notif-toast__severity-bar--${n.severity}`} aria-hidden="true" />

      <div className={`notif-toast__icon-wrap notif-item__icon-wrap--${n.severity}`} aria-hidden="true">
        <IconComp className={`notif-item__icon--${n.severity}`} style={{ width: 14, height: 14 }} />
      </div>

      <div className="notif-toast__content">
        <p className="notif-toast__title">
          {n.title}
          <span className="sr-only"> — {n.severity} severity notification</span>
        </p>
        <p className="notif-toast__body">{n.body}</p>
        {n.action && (
          <Link href={n.action.href} className="notif-toast__action" tabIndex={0}>
            {n.action.label}
          </Link>
        )}
      </div>

      <button
        className="notif-toast__close"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        <X style={{ width: 12, height: 12 }} />
      </button>

      {duration > 0 && (
        <div ref={progressRef} className="notif-toast__progress" aria-hidden="true" />
      )}
    </div>
  );
}

// ── Toast Container ───────────────────────────────────────────────────────────

const MAX_VISIBLE = 3;

interface ToastContainerProps {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ items, onDismiss }: ToastContainerProps) {
  const visible = items.slice(0, MAX_VISIBLE);

  return (
    <div className="notif-toast-stack" aria-label="Notifications" aria-live="polite">
      {visible.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
