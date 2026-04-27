'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { NotificationPreferences, ChannelToggles } from '@/lib/notifications/types';
import { DEFAULT_PREFERENCES } from '@/lib/notifications/preferences';

const CATEGORIES: Array<{ key: keyof NotificationPreferences['channels']; label: string }> = [
  { key: 'violations', label: 'Violations' },
  { key: 'pipeline',   label: 'Pipeline'   },
  { key: 'dmca',       label: 'DMCA'       },
  { key: 'system',     label: 'System'     },
];

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <label className="notif-toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="notif-toggle__track" />
      <div className="notif-toggle__thumb" />
    </label>
  );
}

export function PreferencesForm() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial preferences
  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) => {
      fetch('/api/notifications/preferences', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          setPrefs(data);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    });
  }, [user]);

  // Debounced autosave
  const save = useCallback(
    (updated: NotificationPreferences, section: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        if (!user) return;
        const token = await user.getIdToken();
        await fetch('/api/notifications/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(updated),
        });
        setSavedKey(section);
        setTimeout(() => setSavedKey(null), 2000);
      }, 600);
    },
    [user]
  );

  const updateChannel = (
    cat: keyof NotificationPreferences['channels'],
    ch: keyof ChannelToggles,
    value: boolean
  ) => {
    const updated = {
      ...prefs,
      channels: {
        ...prefs.channels,
        [cat]: { ...prefs.channels[cat], [ch]: value },
      },
    };
    setPrefs(updated);
    save(updated, 'channels');
  };

  const updateDigest = (value: NotificationPreferences['email_digest']) => {
    const updated = { ...prefs, email_digest: value };
    setPrefs(updated);
    save(updated, 'email');
  };

  const updateQuietHours = (patch: Partial<NotificationPreferences['quiet_hours']>) => {
    const updated = { ...prefs, quiet_hours: { ...prefs.quiet_hours, ...patch } };
    setPrefs(updated);
    save(updated, 'quiet_hours');
  };

  if (isLoading) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--brand-muted)', fontSize: 12 }}>Loading preferences…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Channel Matrix */}
      <section className="notif-prefs__section">
        <div className="notif-prefs__section-header">
          <h2 className="notif-prefs__section-title">Delivery Channels</h2>
          {savedKey === 'channels' && <span className="notif-prefs__saved-pill">Saved</span>}
        </div>
        <table className="notif-prefs__matrix">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Category</th>
              <th>In-App</th>
              <th>Toast</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(({ key, label }) => (
              <tr key={key}>
                <td><span className="notif-prefs__category-label">{label}</span></td>
                <td>
                  <Toggle
                    id={`${key}-in_app`}
                    checked={prefs.channels[key].in_app}
                    onChange={(v) => updateChannel(key, 'in_app', v)}
                  />
                </td>
                <td>
                  <Toggle
                    id={`${key}-toast`}
                    checked={prefs.channels[key].toast}
                    onChange={(v) => updateChannel(key, 'toast', v)}
                  />
                </td>
                <td>
                  <Toggle
                    id={`${key}-email`}
                    checked={prefs.channels[key].email}
                    onChange={(v) => updateChannel(key, 'email', v)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Email Cadence */}
      <section className="notif-prefs__section">
        <div className="notif-prefs__section-header">
          <h2 className="notif-prefs__section-title">Email Cadence</h2>
          {savedKey === 'email' && <span className="notif-prefs__saved-pill">Saved</span>}
        </div>
        <div className="notif-prefs__radio-group">
          {[
            { value: 'immediate', label: 'Immediate (Critical only)', desc: 'Receive emails instantly for critical-severity events only.' },
            { value: 'daily',     label: 'Daily Digest',               desc: 'One summary email per day grouping all your notifications.' },
            { value: 'off',       label: 'Off',                        desc: 'No emails. In-app and toast notifications still apply.' },
          ].map(({ value, label, desc }) => (
            <label key={value} className="notif-prefs__radio-option">
              <input
                type="radio"
                name="email_digest"
                value={value}
                checked={prefs.email_digest === value}
                onChange={() => updateDigest(value as NotificationPreferences['email_digest'])}
              />
              <div>
                <div className="notif-prefs__radio-label">{label}</div>
                <div className="notif-prefs__radio-desc">{desc}</div>
              </div>
            </label>
          ))}
        </div>
        {prefs.email_digest === 'daily' && (
          <div className="notif-prefs__time-row">
            <span className="notif-prefs__time-label">Send at</span>
            <input
              type="number"
              min={0}
              max={23}
              value={prefs.digest_send_hour}
              className="notif-prefs__time-input"
              style={{ width: 64 }}
              onChange={(e) => {
                const updated = { ...prefs, digest_send_hour: parseInt(e.target.value) || 9 };
                setPrefs(updated);
                save(updated, 'email');
              }}
              aria-label="Digest send hour (0–23 UTC)"
            />
            <span className="notif-prefs__time-label">:00 UTC</span>
          </div>
        )}
      </section>

      {/* Quiet Hours */}
      <section className="notif-prefs__section">
        <div className="notif-prefs__section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 className="notif-prefs__section-title">Quiet Hours</h2>
            <Toggle
              id="quiet-hours-enabled"
              checked={prefs.quiet_hours.enabled}
              onChange={(v) => updateQuietHours({ enabled: v })}
            />
          </div>
          {savedKey === 'quiet_hours' && <span className="notif-prefs__saved-pill">Saved</span>}
        </div>
        {prefs.quiet_hours.enabled && (
          <div className="notif-prefs__time-row">
            <span className="notif-prefs__time-label">From</span>
            <input
              type="time"
              value={prefs.quiet_hours.start}
              className="notif-prefs__time-input"
              onChange={(e) => updateQuietHours({ start: e.target.value })}
              aria-label="Quiet hours start time"
            />
            <span className="notif-prefs__time-label">To</span>
            <input
              type="time"
              value={prefs.quiet_hours.end}
              className="notif-prefs__time-input"
              onChange={(e) => updateQuietHours({ end: e.target.value })}
              aria-label="Quiet hours end time"
            />
            <span className="notif-prefs__time-label" style={{ fontSize: 10, color: 'var(--brand-muted)' }}>
              Toast + email suppressed. In-app always delivered.
            </span>
          </div>
        )}
      </section>

    </div>
  );
}
