'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PreferencesForm } from '@/components/notifications/PreferencesForm';

export default function NotificationsPreferencesPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/notifications"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: 'var(--brand-muted)',
            textDecoration: 'none',
            marginBottom: 16,
            transition: 'color 120ms ease',
          }}
        >
          <ChevronLeft style={{ width: 12, height: 12 }} />
          Notifications
        </Link>
        <p className="text-meta" style={{ marginBottom: 8 }}>Notification Settings</p>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--brand-text)', margin: 0, letterSpacing: '-0.04em' }}>
          Preferences
        </h1>
        <p style={{ fontSize: 12, color: 'var(--brand-muted)', marginTop: 6, fontWeight: 500 }}>
          Control which events notify you and how. Changes are saved automatically.
        </p>
      </div>

      <PreferencesForm />
    </div>
  );
}
