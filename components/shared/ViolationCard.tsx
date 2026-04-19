import { clsx } from 'clsx';
import { ExternalLink, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { SeverityChip } from './SeverityChip';
import type { Violation } from '@/types';

interface ViolationCardProps {
  violation: Violation;
  className?: string;
  onResolve?: (id: string) => void;
  onDispute?: (id: string) => void;
  onFalsePositive?: (id: string) => void;
}

const classConfig = {
  UNAUTHORIZED:       { label: 'Unauthorized',       classes: 'text-red-600 bg-red-50' },
  EDITORIAL_FAIR_USE: { label: 'Fair Use',           classes: 'text-amber-700 bg-amber-50' },
  NEEDS_REVIEW:       { label: 'NEEDS REVIEW',       classes: 'text-blue-600 bg-blue-50' },
  AUTHORIZED:         { label: 'Authorized',         classes: 'text-green-700 bg-green-50' },
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
      <div className="w-full md:w-40 md:shrink-0 aspect-video md:aspect-auto bg-zinc-100 relative overflow-hidden">
        {violation.assetThumbnailUrl ? (
          <img
            src={violation.assetThumbnailUrl}
            alt="Asset"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-100">
            <span className="text-2xl font-display font-black text-zinc-300">DT</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5" />
      </div>

      {/* Content */}
      <div className="flex-1 p-6 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <SeverityChip severity={violation.severity} />
            <span className={clsx('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full', cls.classes)}>
              {cls.label}
            </span>
            {violation.asset_name && (
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border border-brand-border px-2 py-0.5 rounded ml-1">
                {violation.asset_name}
              </span>
            )}
            <span className="text-[11px] text-brand-muted ml-auto">
              {new Date(violation.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
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

        {/* Actions */}
        {violation.status === 'open' && (
          <div className="flex items-center gap-3 pt-2 border-t border-zinc-50">
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onResolve?.(violation.violation_id); }}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-700 hover:text-green-800 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Resolve
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDispute?.(violation.violation_id); }}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700 hover:text-amber-800 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Dispute
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onFalsePositive?.(violation.violation_id); }}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> False Positive
            </button>
          </div>
        )}
        {violation.status !== 'open' && (
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted capitalize pt-2 border-t border-zinc-50">
            Status: {violation.status}
          </p>
        )}
      </div>
    </div>
  );
}
