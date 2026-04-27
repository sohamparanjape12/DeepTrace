'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Settings } from 'lucide-react';
import { useNotifications, useUnreadCount } from '@/lib/notifications/store';
import { NotificationItem } from './NotificationItem';
import { useNotificationStore } from '@/lib/notifications/store';

const PANEL_LIMIT = 10;

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const { items } = useNotifications();
  const unreadCount = useUnreadCount();
  const { markAllRead } = useNotificationStore();

  const visibleItems = items
    .filter((n) => !n.archived_at)
    .slice(0, PANEL_LIMIT);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); bellRef.current?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={bellRef}
        className="notif-bell"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell style={{ width: 16, height: 16 }} />
        {unreadCount > 0 && (
          <span className="notif-bell__badge" aria-hidden="true">
            {displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Invisible overlay to catch outside clicks */}
          <div
            className="notif-panel-overlay"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <div
            ref={panelRef}
            className="notif-panel notif-panel--entering"
            role="dialog"
            aria-label="Notifications panel"
            aria-modal="false"
          >
            {/* Header */}
            <div className="notif-panel__header">
              <h2 className="notif-panel__title">Notifications</h2>
              <div className="notif-panel__actions">
                {unreadCount > 0 && (
                  <button
                    className="notif-panel__action-btn"
                    onClick={markAllRead}
                  >
                    Mark all read
                  </button>
                )}
                <Link
                  href="/notifications/preferences"
                  className="notif-panel__action-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Notification settings"
                >
                  <Settings style={{ width: 12, height: 12 }} />
                </Link>
              </div>
            </div>

            {/* List */}
            <div className="notif-panel__list" role="list" aria-label="Notification items">
              {visibleItems.length === 0 ? (
                <div className="notif-panel__empty">
                  <Bell className="notif-panel__empty-icon" />
                  <p className="notif-panel__empty-text">No notifications yet</p>
                </div>
              ) : (
                visibleItems.map((n) => (
                  <NotificationItem key={n.id} notification={n} compact />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="notif-panel__footer">
              <Link
                href="/notifications"
                className="notif-panel__view-all"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
