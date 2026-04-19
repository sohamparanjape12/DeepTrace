'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, Globe, Cpu, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { SeverityChip } from '@/components/shared/SeverityChip';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';
import type { Violation } from '@/types';

const MOCK_VIOLATION: Violation = {
  violation_id: 'v1',
  asset_id: 'a1',
  detected_at: '2026-04-18T08:12:00Z',
  match_url: 'https://reddit.com/r/soccer/post/a1b2c3',
  match_type: 'full_match',
  page_context: 'r/soccer — "Best shots from UCL Final 2026" — Reddit post with 4.2k upvotes featuring embedded full-resolution image.',
  gemini_class: 'UNAUTHORIZED',
  gemini_reasoning: 'The image appears in its full resolution without any attribution. The page context shows it\'s used on a monetized platform (Reddit with Reddit Premium integrations). The rights tier is "commercial" — any commercial display without explicit license violates the rights holder\'s IP. Classification: UNAUTHORIZED. Confidence: 0.94.',
  severity: 'CRITICAL',
  status: 'open',
  assetThumbnailUrl: 'https://picsum.photos/seed/ucl/800/500',
};

const classConfig = {
  UNAUTHORIZED:       { label: 'Unauthorized',  classes: 'text-red-700 bg-red-50 border-red-200' },
  EDITORIAL_FAIR_USE: { label: 'Editorial Fair Use', classes: 'text-amber-700 bg-amber-50 border-amber-200' },
  NEEDS_REVIEW:       { label: 'NEEDS REVIEW',  classes: 'text-blue-700 bg-blue-50 border-blue-200' },
  AUTHORIZED:         { label: 'Authorized',    classes: 'text-green-700 bg-green-50 border-green-200' },
};

const matchTypeLabels: Record<string, string> = {
  full_match:       'Full Match',
  partial_match:    'Partial Match',
  visually_similar: 'Visually Similar',
};

export default function ViolationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [violation, setViolation] = useState<Violation>(MOCK_VIOLATION);
  const cls = classConfig[violation.gemini_class];

  const handleAction = (status: Violation['status']) => {
    setViolation(prev => ({ ...prev, status }));
  };

  return (
    <div className="space-y-12 max-w-4xl">
      {/* Back */}
      <div className="flex items-center gap-4">
        <Link href="/violations">
          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Violations
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <SeverityChip severity={violation.severity} />
          <span className={clsx('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border', cls.classes)}>
            {cls.label}
          </span>
          {violation.status !== 'open' && (
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted border border-brand-border px-2.5 py-1 rounded-full capitalize">
              {violation.status.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Evidence: Matched Image */}
      <div className="bento-card overflow-hidden">
        <div className="aspect-video bg-zinc-100 relative overflow-hidden">
          <img
            src={violation.assetThumbnailUrl}
            alt="Asset evidence"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <a
              href={violation.match_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group w-fit"
            >
              <p className="text-white font-bold text-lg group-hover:underline break-all">{violation.match_url}</p>
              <ExternalLink className="w-4 h-4 text-white/70 group-hover:text-white transition-colors shrink-0" />
            </a>
          </div>
        </div>

        {/* Detection Metadata Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-brand-border border-t border-brand-border">
          {[
            { icon: Calendar, label: 'Detected', value: new Date(violation.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
            { icon: Globe,    label: 'Match Type', value: matchTypeLabels[violation.match_type] },
            { icon: Globe,    label: 'Source Domain', value: (() => { try { return new URL(violation.match_url).hostname; } catch { return '—'; } })() },
            { icon: Cpu,      label: 'Gemini Model', value: 'Gemini 1.5 Flash' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-6 space-y-1">
              <p className="text-meta flex items-center gap-1.5"><Icon className="w-3 h-3" />{label}</p>
              <p className="text-sm font-bold text-brand-text">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Page Context */}
      {violation.page_context && (
        <div className="bento-card p-8 space-y-4">
          <h3 className="font-display font-black uppercase text-sm tracking-tight">Page Context</h3>
          <p className="text-brand-muted font-medium leading-relaxed">{violation.page_context}</p>
        </div>
      )}

      {/* Gemini AI Reasoning */}
      <div className="bento-card p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-black uppercase text-sm tracking-tight">Gemini AI Classification</h3>
          <div className={clsx('text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border', cls.classes)}>
            {cls.label}
          </div>
        </div>
        <div className="p-6 bg-zinc-50 rounded-xl border border-brand-border">
          <p className="text-sm font-medium text-brand-text leading-relaxed font-mono">{violation.gemini_reasoning}</p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <p className="text-[10px] font-bold text-brand-muted">Analysis powered by Gemini 1.5 Flash • Google AI Studio</p>
        </div>
      </div>

      {/* Triage Actions */}
      {violation.status === 'open' && (
        <div className="bento-card p-8 space-y-6">
          <h3 className="font-display font-black uppercase text-sm tracking-tight">Triage Action</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => handleAction('resolved')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" /> Mark Resolved
            </button>
            <button
              onClick={() => handleAction('disputed')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" /> Dispute
            </button>
            <button
              onClick={() => handleAction('false_positive')}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-brand-border bg-white text-brand-muted text-[11px] font-black uppercase tracking-widest hover:border-zinc-400 hover:text-brand-text transition-all"
            >
              <XCircle className="w-4 h-4" /> False Positive
            </button>
          </div>
        </div>
      )}

      {violation.status !== 'open' && (
        <div className="flex items-center gap-3 bento-card px-8 py-5">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm font-bold text-brand-text capitalize">
            This violation has been marked as <span className="text-brand-accent">{violation.status.replace('_', ' ')}</span>.
          </p>
        </div>
      )}
    </div>
  );
}
