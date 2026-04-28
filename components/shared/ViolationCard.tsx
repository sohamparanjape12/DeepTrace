import { clsx } from 'clsx';
import { ExternalLink, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Info, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { SeverityChip } from './SeverityChip';
import { ReliabilityRing } from './ReliabilityRing';
import type { Violation } from '@/types';
import { useState } from 'react';

interface ViolationCardProps {
  violation: Violation;
  className?: string;
  onResolve?: (id: string) => void;
  onDispute?: (id: string) => void;
  onFalsePositive?: (id: string) => void;
  onDMCA?: (id: string) => void;
  onViewDMCA?: (noticeId: string) => void;
}

const classConfig: Record<string, { label: string; variant: string }> = {
  UNAUTHORIZED: { label: 'Unauthorized', variant: 'error' },
  EDITORIAL_FAIR_USE: { label: 'Fair Use', variant: 'info' },
  NEEDS_REVIEW: { label: 'NEEDS REVIEW', variant: 'warning' },
  AUTHORIZED: { label: 'Authorized', variant: 'success' },
  INSUFFICIENT_EVIDENCE: { label: 'Insufficient Evidence', variant: 'default' },
  ANALYZING: { label: 'Analyzing', variant: 'default' },
  NOT_A_MATCH: { label: 'Not a Match', variant: 'default' },
};

export function ViolationCard({ violation, className, onResolve, onDispute, onFalsePositive, onDMCA, onViewDMCA }: ViolationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = classConfig[violation.gemini_class] ?? classConfig.NEEDS_REVIEW;
  const domain = (() => { try { return new URL(violation.match_url).hostname; } catch { return violation.match_url; } })();

  const isEligible =
    (violation.gemini_class === 'UNAUTHORIZED' || violation.gemini_class?.toUpperCase() === 'UNAUTHORIZED') &&
    ((violation.reliability_score || 0) >= 80 || (violation.reliability_score || 0) >= 0.8) &&
    (violation.severity === 'CRITICAL' || violation.severity === 'HIGH' || violation.severity?.toUpperCase() === 'HIGH' || violation.severity?.toUpperCase() === 'CRITICAL') &&
    violation.status !== 'resolved' &&
    violation.status !== 'disputed' &&
    violation.status !== 'false_positive' &&
    (!violation.dmca_status || violation.dmca_status === 'none' || violation.dmca_status === 'withdrawn' || violation.dmca_status === 'uninitiated');

  const hasDMCA = !!violation.dmca_notice_id && !!violation.dmca_status && violation.dmca_status !== 'none' && violation.dmca_status !== 'uninitiated';

  return (
    <div className={clsx(
      'group relative bento-card p-0 flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-soft-xl border-brand-border hover:border-brand-text/20',
      violation.status !== 'open' && 'opacity-60 grayscale-[0.2]',
      isEligible && 'border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.15)] ring-1 ring-red-500/30 bg-red-50/10 dark:bg-red-500/5',
      hasDMCA && 'border-indigo-500/60 shadow-[0_0_25px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30 bg-indigo-50/10 dark:bg-indigo-500/5',
      className,
    )}>
      {/* 1. Visual Evidence Section */}
      <div className="w-full bg-brand-surface relative overflow-hidden aspect-video border-b border-brand-border/50 dark:border-zinc-900">
        {violation.assetThumbnailUrl ? (
          <img
            src={violation.assetThumbnailUrl}
            alt="Violation Evidence"
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
            <span className="text-3xl font-display font-black text-brand-muted/20">DT</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

        {/* Match Type Overlay */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-[8px] font-black uppercase tracking-widest text-white border border-white/10">
          {violation.match_type.replace('_', ' ')}
        </div>
      </div>

      {/* 2. Intelligence Section */}
      <div className="flex-1 p-6 flex flex-col gap-5 min-w-0">
        {/* Header: Key-Value Badges & Reliability */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className={clsx(
                'px-2.5 py-1 rounded-md text-[9px] font-bold border flex items-center gap-1.5 transition-colors uppercase',
                config.variant === 'error' && 'bg-red-500/5 text-red-600 border-red-500/10',
                config.variant === 'success' && 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10',
                config.variant === 'warning' && 'bg-amber-500/5 text-amber-600 border-amber-500/10',
                config.variant === 'info' && 'bg-blue-500/5 text-blue-600 border-blue-500/10',
                config.variant === 'default' && 'bg-zinc-500/5 text-zinc-600 border-zinc-500/10',
              )}>
                <span className="opacity-60 uppercase tracking-widest text-[8px] font-black">Status:</span>
                {config.label}
              </div>
              <div className="px-2.5 py-1 rounded-md text-[9px] font-bold bg-zinc-500/5 text-zinc-500 border border-zinc-500/10 flex items-center gap-1.5">
                <span className="opacity-60 uppercase tracking-widest text-[8px] font-black">Severity:</span>
                {violation.severity}
              </div>
              <div className="px-2.5 py-1 rounded-md text-[9px] font-bold bg-zinc-500/5 text-zinc-500 border border-zinc-500/10 flex items-center gap-1.5">
                <span className="opacity-60 uppercase tracking-widest text-[8px] font-black">Type:</span>
                {violation.match_type.includes('video') ? 'Video' : 'Image'}
                {violation.domain_class && violation.domain_class.toLowerCase() !== 'unknown' && (
                  <span className="ml-1 opacity-40">({violation.domain_class})</span>
                )}
              </div>
            </div>

            {/* Reliability Inline */}
            {violation.reliability_score !== undefined && (
              <div className="flex items-center gap-2 shrink-0 justify-center">
                <div className="scale-60 origin-center">
                  <ReliabilityRing score={violation.reliability_score} tier={violation.reliability_tier || 'LOW'} />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(violation.match_url, '_blank', 'noopener,noreferrer');
              }}
              className="group/link inline-flex items-center gap-1.5 max-w-full cursor-pointer"
            >
              <h3 className="text-sm font-black text-brand-text truncate border-b border-transparent group-hover/link:border-brand-text transition-all uppercase tracking-tight">
                {domain}
              </h3>
              <ExternalLink className="w-3.5 h-3.5 text-brand-muted group-hover/link:text-brand-text transition-colors shrink-0" />
            </div>
            <span className="text-[10px] font-bold tabular-nums text-brand-muted">
              {new Date(violation.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Content: Description & Metrics */}
        <div className="space-y-4 py-2 border-y border-brand-border/30">
          <div className="flex gap-x-4 gap-y-1 items-center justify-center text-[10px] font-bold">
            <div className="flex items-center gap-1.5 justify-between w-full">
              <span className="text-brand-muted uppercase tracking-widest text-[8px] font-black">Visual Integrity:</span>
              <span className="text-brand-text">{(violation.visual_match_score || 0 * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-1.5 justify-between border-l border-brand-border/50 pl-4 w-full">
              <span className="text-brand-muted uppercase tracking-widest text-[8px] font-black">Context Alignment:</span>
              <span className="text-brand-text">{((violation.contextual_match_score || 0) * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* 3. Operational Section */}
        <div className="pt-2 flex flex-wrap items-center justify-between">
          {(violation.status === 'open' || !violation.status) ? (
            <div className="flex items-center gap-1 w-full justify-center flex-col">
              <div className="flex items-center gap-2 w-full justify-center">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onResolve?.(violation.violation_id);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest text-white bg-brand-text dark:bg-brand-surface hover:bg-brand-text/90 transition-all active:scale-95 shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Resolve
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDispute?.(violation.violation_id);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest text-brand-text bg-transparent hover:bg-brand-surface border border-brand-border transition-all active:scale-95 shadow-sm"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Dispute
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onFalsePositive?.(violation.violation_id);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-text transition-all active:scale-95"
                >
                  <XCircle className="w-3.5 h-3.5" /> False Positive
                </button>
              </div>

              {isEligible && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDMCA?.(violation.violation_id);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 transition-all active:scale-95 shadow-sm mt-2"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> DMCA Takedown
                </button>
              )}
              {hasDMCA && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onViewDMCA?.(violation.dmca_notice_id!);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all active:scale-95 shadow-sm mt-2 dark:text-indigo-300 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 dark:border-indigo-500/20"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> View DMCA
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 px-3 py-2 rounded-lg bg-brand-surface border border-brand-border text-[10px] font-black uppercase tracking-widest text-brand-muted">
                Status: <span className="text-brand-text ml-1">{violation.status}</span>
              </div>
              {violation.reviewed_by && (
                <span className="text-[10px] text-zinc-400 font-medium shrink-0">Reviewer: {violation.reviewed_by}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
