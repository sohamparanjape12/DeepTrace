'use client';

import React, { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { NotificationDoc } from '@/lib/notifications/types';
import { useNotifications } from '@/lib/notifications/store';
import { ToastContainer } from './NotificationToast';

interface ToastItem {
  notification: NotificationDoc;
  id: string;
  leaving: boolean;
}

/**
 * Mounts in the app layout. Watches the notification store for new items
 * and queues them as toasts. Manages the toast lifecycle (add, dismiss, animate out).
 */
export function ToastProvider() {
  const { items } = useNotifications();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  // Detect new notifications from the store and queue them as toasts
  React.useEffect(() => {
    for (const n of items) {
      if (!n.id || seenIds.current.has(n.id)) continue;
      if (!n.channels_delivered.includes('toast')) continue;
      if (n.archived_at) continue;

      seenIds.current.add(n.id);

      setToasts((prev) => [
        ...prev,
        { notification: n, id: n.id!, leaving: false },
      ]);
    }
  }, [items]);

  const dismiss = useCallback((toastId: string) => {
    // Animate out first
    setToasts((prev) =>
      prev.map((t) => (t.id === toastId ? { ...t, leaving: true } : t))
    );
    // Then remove after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 220);
  }, []);

  return <ToastContainer items={toasts} onDismiss={dismiss} />;
}
