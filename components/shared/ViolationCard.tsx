import { clsx } from 'clsx';
import { ExternalLink, CheckCircle, XCircle, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { SeverityChip } from './SeverityChip';
import { ReliabilityRing } from './ReliabilityRing';
import type { Violation } from '@/types';

interface ViolationCardProps {
  violation: Violation;
  className?: string;
  onResolve?: (id: string) => void;
  onDispute?: (id: string) => void;
  onFalsePositive?: (id: string) => void;
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

export function ViolationCard({ violation, className, onResolve, onDispute, onFalsePositive }: ViolationCardProps) {
  const config = classConfig[violation.gemini_class] ?? classConfig.NEEDS_REVIEW;
  const domain = (() => { try { return new URL(violation.match_url).hostname; } catch { return violation.match_url; } })();

  return (
    <div className={clsx(
      'group relative bento-card p-0 flex flex-col md:flex-row gap-0 overflow-hidden transition-all duration-300 hover:shadow-soft-xl border-brand-border hover:border-brand-text/20',
      violation.status !== 'open' && 'opacity-60 grayscale-[0.2]',
      className,
    )}>
      {/* 1. Visual Evidence Section */}
      <div className="w-full md:w-56 lg:w-64 shrink-0 bg-brand-surface relative overflow-hidden aspect-video md:aspect-auto border-r border-brand-border/50 dark:border-zinc-900">
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

        {/* Reliability Indicator */}
        {violation.reliability_score !== undefined && (
          <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-black/90 backdrop-blur-md rounded-full p-1 shadow-soft border border-white/20 scale-75 origin-bottom-left">
            <ReliabilityRing score={violation.reliability_score} tier={violation.reliability_tier || 'LOW'} />
          </div>
        )}

        {/* Match Type Overlay */}
        <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-[8px] font-black uppercase tracking-widest text-white border border-white/10">
          {violation.match_type.replace('_', ' ')}
        </div>
      </div>

      {/* 2. Intelligence Section */}
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-between gap-6 min-w-0">
        <div className="space-y-4">
          {/* Header: Status & Severity */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SeverityChip severity={violation.severity} />
              <div className={clsx(
                'px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border flex items-center gap-1.5 transition-colors',
                config.variant === 'error' && 'bg-red-500/5 text-red-600 border-red-500/10 group-hover:bg-red-500/10',
                config.variant === 'success' && 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10 group-hover:bg-emerald-500/10',
                config.variant === 'warning' && 'bg-amber-500/5 text-amber-600 border-amber-500/10 group-hover:bg-amber-500/10',
                config.variant === 'info' && 'bg-blue-500/5 text-blue-600 border-blue-500/10 group-hover:bg-blue-500/10',
                config.variant === 'default' && 'bg-zinc-500/5 text-zinc-600 border-zinc-500/10 group-hover:bg-zinc-500/10',
              )}>
                {violation.gemini_class === 'UNAUTHORIZED' ? <AlertTriangle className="w-2.5 h-2.5" /> :
                  violation.gemini_class === 'AUTHORIZED' ? <ShieldCheck className="w-2.5 h-2.5" /> : <Info className="w-2.5 h-2.5" />}
                {config.label}
              </div>
              {violation.asset_name && (
                <span className="px-2 py-1 rounded bg-brand-bg border border-brand-border/50 text-[8px] font-black uppercase tracking-tight text-brand-muted/60 truncate max-w-[120px]" title={violation.asset_name}>
                  {violation.asset_name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-brand-muted">
              <span className="text-[10px] font-bold tabular-nums">
                {new Date(violation.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Main Info: Source & Reasoning */}
          <div className="space-y-2">
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(violation.match_url, '_blank', 'noopener,noreferrer');
              }}
              className="group/link inline-flex items-center gap-1.5 max-w-full cursor-pointer"
            >
              <h3 className="text-base font-bold text-brand-text truncate border-b-2 border-transparent group-hover/link:border-brand-text transition-all">
                {domain}
              </h3>
              <ExternalLink className="w-3.5 h-3.5 text-brand-muted group-hover/link:text-brand-text transition-colors shrink-0" />
            </div>

            {violation.gemini_reasoning ? (
              <p className="text-sm text-brand-muted leading-relaxed line-clamp-2 font-medium">
                {violation.gemini_reasoning}
              </p>
            ) : (
              <p className="text-sm text-zinc-400 italic">Analysis in progress...</p>
            )}
          </div>

          {/* Forensic Detail Bar */}
          {violation.visual_match_score !== undefined && (
            <div className="grid grid-cols-2 gap-6 pt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted/60">Visual Integrity</span>
                  <span className="text-[10px] font-bold text-brand-text">{(violation.visual_match_score * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-brand-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-text transition-all duration-1000 ease-out"
                    style={{ width: `${violation.visual_match_score * 100}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted/60">Context Alignment</span>
                  <span className="text-[10px] font-bold text-brand-text">{((violation.contextual_match_score || 0) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-brand-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-muted transition-all duration-1000 ease-out"
                    style={{ width: `${(violation.contextual_match_score || 0) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Operational Section */}
        <div className="pt-4 border-t border-brand-border/50 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          {violation.status === 'open' ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onResolve?.(violation.violation_id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all active:scale-95 shadow-sm dark:text-emerald-300 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:border-emerald-500/20"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Resolve
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDispute?.(violation.violation_id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-all active:scale-95 shadow-sm dark:text-amber-300 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 dark:border-amber-500/20"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Dispute
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFalsePositive?.(violation.violation_id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-text hover:bg-brand-surface border border-transparent hover:border-brand-border transition-all active:scale-95 dark:text-brand-muted dark:hover:text-brand-text dark:hover:bg-brand-surface dark:border-brand-border"
              >
                <XCircle className="w-3.5 h-3.5" /> False Positive
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-lg bg-brand-surface border border-brand-border text-[10px] font-black uppercase tracking-widest text-brand-muted">
                Status: <span className="text-brand-text ml-1">{violation.status}</span>
              </div>
              {violation.reviewed_by && (
                <span className="text-[10px] text-zinc-400 font-medium">Reviewer: {violation.reviewed_by}</span>
              )}
            </div>
          )}

          {violation.domain_class && violation.domain_class.toLowerCase() !== 'unknown' && (
            <div className="ml-auto px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-[8px] font-black uppercase tracking-widest text-brand-muted">
              {violation.domain_class}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}