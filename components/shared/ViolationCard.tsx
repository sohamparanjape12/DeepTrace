import { clsx } from 'clsx';
import { ExternalLink, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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

const classConfig = {
  UNAUTHORIZED:       { label: 'Unauthorized',       classes: 'text-brand-red-text bg-brand-red-muted border-brand-red-text/20' },
  EDITORIAL_FAIR_USE: { label: 'Fair Use',           classes: 'text-amber-700 bg-amber-50 border-amber-200' },
  NEEDS_REVIEW:       { label: 'NEEDS REVIEW',       classes: 'text-brand-blue-text bg-brand-blue-muted border-brand-blue-text/20' },
  AUTHORIZED:         { label: 'Authorized',         classes: 'text-brand-green-text bg-brand-green-muted border-brand-green-text/20' },
  INSUFFICIENT_EVIDENCE: { label: 'Insufficient Evidence', classes: 'text-zinc-500 bg-zinc-50 border-zinc-200' },
};

export function ViolationCard({ violation, className, onResolve, onDispute, onFalsePositive }: ViolationCardProps) {
  const cls = classConfig[violation.gemini_class] ?? classConfig.NEEDS_REVIEW;
  const domain = (() => { try { return new URL(violation.match_url).hostname; } catch { return violation.match_url; } })();

  return (
    <div className={clsx(
      'bento-card p-0 flex flex-col md:flex-row overflow-hidden group',
      violation.status === 'resolved' && 'opacity-50',
      className,
    )}>
      {/* Thumbnail */}
      <div className="w-full md:w-48 md:shrink-0 aspect-video md:aspect-auto bg-brand-bg relative overflow-hidden">
        {violation.assetThumbnailUrl ? (
          <img
            src={violation.assetThumbnailUrl}
            alt="Asset"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-brand-bg">
            <span className="text-2xl font-display font-black text-brand-muted">DT</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-brand-border/10" />
        
        {/* Reliability Overlay for Thumbnail */}
        {violation.reliability_score !== undefined && (
          <div className="absolute bottom-2 left-2 scale-50 origin-bottom-left">
            <ReliabilityRing score={violation.reliability_score} tier={violation.reliability_tier || 'LOW'} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SeverityChip severity={violation.severity} />
            <span className={clsx('text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border', cls.classes)}>
              {cls.label}
            </span>
            {violation.asset_name && (
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted border border-brand-border px-2 py-0.5 rounded ml-1">
                {violation.asset_name}
              </span>
            )}
            
            <div className="ml-auto flex items-center gap-3">
              {violation.sentiment && (
                <span className={clsx(
                  'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border',
                  violation.sentiment === 'positive' ? 'text-green-700 bg-green-50 border-green-200' :
                  violation.sentiment === 'negative' ? 'text-red-700 bg-red-50 border-red-200' :
                  'text-zinc-500 bg-zinc-50 border-zinc-200'
                )}>
                  {violation.sentiment}
                </span>
              )}
              <span className="text-[10px] text-brand-muted font-bold">
                {new Date(violation.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                window.open(violation.match_url, '_blank', 'noopener,noreferrer');
              }}
              className="flex items-center gap-2 group/link hover:text-brand-accent transition-colors cursor-pointer w-fit"
            >
              <p className="text-sm font-bold text-brand-text group-hover/link:text-brand-accent transition-colors truncate max-w-md">
                {domain}
              </p>
              <ExternalLink className="w-3.5 h-3.5 text-brand-muted group-hover/link:text-brand-accent transition-colors shrink-0" />
            </div>
            
            {violation.gemini_reasoning && (
              <p className="text-xs text-brand-muted leading-relaxed line-clamp-2 font-medium">
                {violation.gemini_reasoning}
              </p>
            )}
          </div>

          {/* Miniature v2 Forensic Bars */}
          {violation.visual_match_score !== undefined && (
            <div className="flex items-center gap-4 pt-1">
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase tracking-tighter text-brand-muted">Visual Match</span>
                  <span className="text-[8px] font-black text-brand-text">{Math.round(violation.visual_match_score * 100)}%</span>
                </div>
                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${violation.visual_match_score * 100}%` }} />
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase tracking-tighter text-brand-muted">Context Match</span>
                  <span className="text-[8px] font-black text-brand-text">{Math.round((violation.contextual_match_score || 0) * 100)}%</span>
                </div>
                <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(violation.contextual_match_score || 0) * 100}%` }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {violation.status === 'open' && (
          <div className="flex items-center gap-4 pt-3 border-t border-brand-border">
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onResolve?.(violation.violation_id); }}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:opacity-80 transition-opacity"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Resolve
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDispute?.(violation.violation_id); }}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-700 hover:text-amber-800 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Dispute
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onFalsePositive?.(violation.violation_id); }}
              className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> False Positive
            </button>
          </div>
        )}
        {violation.status !== 'open' && (
          <div className="flex items-center justify-between pt-3 border-t border-brand-border">
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-muted">
              Status: <span className="text-brand-text capitalize">{violation.status}</span>
            </p>
            {violation.reviewed_by && (
              <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                Reviewer: {violation.reviewed_by}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

