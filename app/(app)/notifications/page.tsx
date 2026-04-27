'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/lib/notifications/store';
import { useNotificationStore } from '@/lib/notifications/store';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import type { NotificationDoc, Category } from '@/lib/notifications/types';

const TABS: Array<{ key: Category | 'all'; label: string }> = [
  { key: 'all',        label: 'All'        },
  { key: 'violations', label: 'Violations' },
  { key: 'pipeline',   label: 'Pipeline'   },
  { key: 'dmca',       label: 'DMCA'       },
];

function groupByDate(items: NotificationDoc[]) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const groups: Record<string, NotificationDoc[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  for (const n of items) {
    const d = n.created_at?.toDate
      ? n.created_at.toDate().toDateString()
      : new Date(n.created_at || 0).toDateString();
    if (d === today) groups['Today'].push(n);
    else if (d === yesterday) groups['Yesterday'].push(n);
    else groups['Earlier'].push(n);
  }

  return groups;
}

export default function NotificationsPage() {
  const { items, isLoading } = useNotifications();
  const { markAllRead } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<Category | 'all'>('all');

  const unreadCount = items.filter((n) => !n.read_at && !n.archived_at).length;

  const filtered = items.filter((n) => {
    if (n.archived_at) return false;
    if (activeTab === 'all') return true;
    return n.category === activeTab;
  });

  const grouped = groupByDate(filtered);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p className="text-meta" style={{ marginBottom: 8 }}>Activity Feed</p>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--brand-text)', margin: 0, letterSpacing: '-0.04em' }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p style={{ fontSize: 11, color: 'var(--brand-muted)', margin: '6px 0 0', fontWeight: 700 }}>
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              fontSize: 10,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--brand-muted)',
              background: 'var(--brand-surface)',
              border: '1px solid var(--brand-border)',
              borderRadius: 8,
              padding: '8px 14px',
              cursor: 'pointer',
              transition: 'color 120ms ease, border-color 120ms ease',
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          marginBottom: 24,
          background: 'var(--brand-surface)',
          border: '1px solid var(--brand-border)',
          borderRadius: 10,
          padding: 4,
        }}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1,
              padding: '7px 12px',
              borderRadius: 7,
              fontSize: 10,
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 120ms ease, color 120ms ease',
              background: activeTab === key ? 'var(--brand-text)' : 'transparent',
              color: activeTab === key ? 'var(--brand-bg)' : 'var(--brand-muted)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <div className="w-5 h-5 rounded-full border-2 border-brand-text border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 32px',
            background: 'var(--brand-surface)',
            border: '1px solid var(--brand-border)',
            borderRadius: 12,
          }}
        >
          <Bell style={{ width: 32, height: 32, color: 'var(--brand-muted)', opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-muted)', margin: 0 }}>
            No notifications{activeTab !== 'all' ? ` in ${activeTab}` : ''}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Object.entries(grouped).map(([group, groupItems]) => {
            if (groupItems.length === 0) return null;
            return (
              <div key={group}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    color: 'var(--brand-muted)',
                    marginBottom: 8,
                  }}
                >
                  {group}
                </p>
                <div
                  style={{
                    background: 'var(--brand-surface)',
                    border: '1px solid var(--brand-border)',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                  role="list"
                  aria-label={`${group} notifications`}
                >
                  {groupItems.map((n) => (
                    <NotificationItem key={n.id} notification={n} compact={false} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
