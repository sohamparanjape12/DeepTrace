'use client';

import { useState } from 'react';
import { Bell, Mail, Shield, Key, Save, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth-context';

type AlertThreshold = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'ALL';

const THRESHOLDS: { value: AlertThreshold; label: string; desc: string }[] = [
  { value: 'CRITICAL', label: 'Critical Only',    desc: 'Only alert on confirmed critical violations' },
  { value: 'HIGH',     label: 'High & Above',     desc: 'Alert on high and critical violations' },
  { value: 'MEDIUM',   label: 'Medium & Above',   desc: 'Alert on medium, high, and critical' },
  { value: 'ALL',      label: 'All Violations',   desc: 'Alert on every new violation detected' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [threshold, setThreshold]     = useState<AlertThreshold>('HIGH');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [digest, setDigest]           = useState(false);
  const [slackUrl, setSlackUrl]       = useState('');
  const [saved, setSaved]             = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-12 max-w-3xl">
      <PageHeader title="Settings" subtitle="Configure your organization's alert and scan preferences." />

      {/* Org Profile */}
      <section className="bento-card p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-brand-muted" />
          <h2 className="font-display font-black uppercase text-sm tracking-tight">Organization Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="text-meta">Organization Name</label>
            <input
              type="text"
              defaultValue="UEFA Media"
              className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white text-sm font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-meta">Admin Email</label>
            <input
              type="email"
              defaultValue={user?.email ?? 'admin@example.com'}
              className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white text-sm font-medium text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
            />
          </div>
        </div>
      </section>

      {/* Alert Threshold */}
      <section className="bento-card p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-brand-muted" />
          <h2 className="font-display font-black uppercase text-sm tracking-tight">Alert Threshold</h2>
        </div>
        <p className="text-brand-muted text-sm font-medium">Send email alerts when a violation exceeds this severity level.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {THRESHOLDS.map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => setThreshold(value)}
              className={`px-5 py-4 rounded-xl border text-left transition-all ${
                threshold === value
                  ? 'border-brand-text bg-brand-text text-white'
                  : 'border-brand-border bg-white text-brand-text hover:border-zinc-400'
              }`}
            >
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${threshold === value ? 'text-white/60' : 'text-brand-muted'}`}>{value}</p>
              <p className="text-sm font-bold">{label}</p>
              <p className={`text-xs mt-1 ${threshold === value ? 'text-white/60' : 'text-brand-muted'}`}>{desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Notification Channels */}
      <section className="bento-card p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-brand-muted" />
          <h2 className="font-display font-black uppercase text-sm tracking-tight">Notification Channels</h2>
        </div>
        <div className="space-y-5">
          {/* Email Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-brand-border">
            <div>
              <p className="text-sm font-bold text-brand-text">Email Alerts</p>
              <p className="text-xs text-brand-muted font-medium mt-0.5">Instant email on threshold-crossing violations</p>
            </div>
            <button
              onClick={() => setEmailAlerts(p => !p)}
              className={`w-12 h-6 rounded-full transition-all duration-300 relative ${emailAlerts ? 'bg-brand-text' : 'bg-zinc-200'}`}
            >
              <div className={`absolute w-5 h-5 rounded-full bg-white shadow top-0.5 transition-all duration-300 ${emailAlerts ? 'left-6.5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Daily Digest Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-brand-border">
            <div>
              <p className="text-sm font-bold text-brand-text">Daily Digest</p>
              <p className="text-xs text-brand-muted font-medium mt-0.5">Receive a daily summary of all scan activity</p>
            </div>
            <button
              onClick={() => setDigest(p => !p)}
              className={`w-12 h-6 rounded-full transition-all duration-300 relative ${digest ? 'bg-brand-text' : 'bg-zinc-200'}`}
            >
              <div className={`absolute w-5 h-5 rounded-full bg-white shadow top-0.5 transition-all duration-300 ${digest ? 'left-6.5' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Slack Webhook */}
          <div className="space-y-2">
            <label className="text-meta">Slack Webhook URL <span className="text-zinc-300 normal-case font-normal">(optional)</span></label>
            <input
              type="url"
              value={slackUrl}
              onChange={e => setSlackUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white text-sm font-medium text-brand-text placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all font-mono text-xs"
            />
          </div>
        </div>
      </section>

      {/* API Keys */}
      <section className="bento-card p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-brand-muted" />
          <h2 className="font-display font-black uppercase text-sm tracking-tight">API & Integrations</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Gemini API Key',        value: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '●●●●●●●●●●●●' : 'Not configured' },
            { label: 'Firebase Project ID',   value: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'Not configured' },
            { label: 'Storage Bucket',        value: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'Not configured' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-brand-border">
              <p className="text-xs font-bold text-brand-text">{label}</p>
              <p className="text-xs font-mono text-brand-muted">{value}</p>
            </div>
          ))}
          <p className="text-[10px] font-bold text-brand-muted">API keys are configured via environment variables and not editable here.</p>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4 pt-4">
        <Button onClick={handleSave} size="lg" className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saved ? 'Settings Saved ✓' : 'Save Settings'}
        </Button>
        {saved && <p className="text-sm font-bold text-green-600">Your preferences have been updated.</p>}
      </div>
    </div>
  );
}
