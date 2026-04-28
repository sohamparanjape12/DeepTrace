'use client';

import { AssetStage } from '@/lib/types/pipeline';
import { Button } from '@/components/ui/Button';
import React, { useState, useEffect, useRef } from 'react';
import { Asset } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PipelineProgressProps {
  asset: Asset;
}

const STAGES: { key: AssetStage; label: string }[] = [
  { key: 'uploaded', label: 'Ingestion' },
  { key: 'reverse_searched', label: 'Discovery' },
  { key: 'gated', label: 'Filtering' },
  { key: 'analyzing', label: 'Forensic Review' },
  { key: 'complete', label: 'Complete' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function computePercent(asset: Asset): number {
  const totals = asset.totals || {
    reverse_hits: 0, gated_pending: 0, gate_dropped: 0,
    gate_passed: 0, scraped: 0, classified: 0,
    failed_retryable: 0, failed_permanent: 0,
  };
  const total = totals.reverse_hits || 0;
  if (asset.stage === 'complete') return 100;
  if (total === 0) return 0;
  const weighted =
    (totals.classified * 1.0) +
    (totals.gate_dropped * 1.0) +
    (totals.failed_permanent * 1.0) +
    (totals.scraped * 0.7) +
    (totals.gate_passed * 0.4) +
    (totals.gated_pending * 0.1);
  return Math.min(99, Math.round((weighted / total) * 100));
}

// ── Auto-Retry Hook ───────────────────────────────────────────────────────────
// Silently fires a force-resume after STALL_TIMEOUT_MS of being stalled.
const STALL_TIMEOUT_MS = 45_000; // 45 seconds

function useAutoRetry(assetId: string | undefined, isStalled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [retrying, setRetrying] = useState(false);

  const fireRetry = async () => {
    if (!assetId) return;
    setRetrying(true);
    try {
      await fetch(`/api/resume/${assetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
    } catch (e) {
      console.error('[AutoRetry] Failed:', e);
    } finally {
      setTimeout(() => setRetrying(false), 3000);
    }
  };

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isStalled) {
      timerRef.current = setTimeout(fireRetry, STALL_TIMEOUT_MS);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isStalled, assetId]);

  return { retrying };
}

// ── Live Dot ──────────────────────────────────────────────────────────────────
function PulseDot({ active, stalled }: { active: boolean; stalled: boolean }) {
  if (!active) return null;
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${stalled ? 'bg-amber-400' : 'bg-zinc-500'}`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${stalled ? 'bg-amber-500' : 'bg-zinc-700'}`} />
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function PipelineProgress({ asset }: PipelineProgressProps) {
  const [isCollapsed, setIsCollapsed] = useState(asset.stage === 'complete');

  const totals: NonNullable<Asset['totals']> = asset.totals || {
    reverse_hits: 0, gated_pending: 0, gate_dropped: 0,
    gate_passed: 0, scraped: 0, classified: 0,
    failed_retryable: 0, failed_permanent: 0,
  };

  const percent = computePercent(asset);
  const totalViolations = totals.reverse_hits || 0;
  const processedViolations = totals.classified + totals.gate_dropped + totals.failed_permanent;
  const isStalled =
    asset.stage === 'analyzing' &&
    processedViolations < totalViolations &&
    totals.failed_retryable > 0;

  const { retrying } = useAutoRetry(asset.asset_id, isStalled);

  const currentStageIndex = STAGES.findIndex(s => s.key === asset.stage);
  const stageName = STAGES.find(s => s.key === asset.stage)?.label ?? asset.stage?.replace(/_/g, ' ') ?? '—';

  // ── Collapsed View (Only when complete) ───────────────────────────────────
  if (asset.stage === 'complete' && isCollapsed) {
    return (
      <div className="bento-card px-6 py-4 flex items-center justify-between gap-4 bg-brand-green-muted/30 border-brand-green-text/10 group transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-brand-green-text flex items-center justify-center text-white shrink-0 shadow-soft">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-black uppercase tracking-widest text-brand-green-text">Forensic Audit Complete</h3>
            <p className="text-[10px] text-brand-muted font-bold">
              {totalViolations} suspects analyzed · 100% calibration achieved
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="bg-brand-surface border-brand-border text-[9px] font-black uppercase tracking-widest h-8"
        >
          View Audit Registry
        </Button>
      </div>
    );
  }

  // ── Full card ──────────────────────────────────────────────────────────────
  return (
    <div className="bento-card p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-500">

      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Scan Status</p>
            <PulseDot active={asset.stage !== 'complete'} stalled={isStalled} />
            {isStalled && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600">
                {retrying ? '· Retrying…' : '· Paused'}
              </span>
            )}
            {asset.stage === 'complete' && (
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-green-text">
                · Verified
              </span>
            )}
          </div>
          <h3 className="text-sm font-black text-brand-text">{stageName}</h3>
          {totalViolations > 0 && (
            <p className="text-[11px] text-brand-muted">
              {processedViolations} of {totalViolations} suspects resolved
              {totals.failed_retryable > 0 && (
                <span className="text-amber-600"> · {totals.failed_retryable} queued</span>
              )}
            </p>
          )}
        </div>

        {/* Large percent / Collapse toggle */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <span className="text-2xl font-black text-brand-text tabular-nums leading-none">
            {percent}
            <span className="text-sm font-bold text-brand-muted ml-0.5">%</span>
          </span>
          {asset.stage === 'complete' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCollapsed(true)}
              className="text-[9px] font-black uppercase tracking-widest h-8 px-4"
            >
              Collapse Registry
            </Button>
          )}
        </div>
      </div>

      {/* Segmented stage track */}
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-1.5">
          {STAGES.map((stage, idx) => {
            const isActive = idx <= currentStageIndex;
            const isCurrent = idx === currentStageIndex && asset.stage !== 'complete';
            return (
              <div key={stage.key} className="flex flex-col items-center gap-1.5">
                <div className={`h-1 w-full rounded-full transition-all duration-700 overflow-hidden ${isActive ? 'bg-brand-text' : 'bg-brand-border'}`}>
                  {isCurrent && (
                    <div className="h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
                  )}
                </div>
                <p className={`text-[9px] font-black uppercase tracking-tight text-center leading-tight transition-colors ${isActive ? 'text-brand-text' : 'text-brand-muted opacity-30'
                  } ${isCurrent ? 'animate-pulse' : ''}`}>
                  {stage.label}
                </p>
                {stage.key === 'analyzing' && totalViolations > 0 && (
                  <p className="text-[8px] font-bold text-brand-muted text-center tabular-nums">
                    {totals.classified}/{totalViolations}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Continuous bar */}
        <div className="relative h-1.5 w-full bg-brand-border rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-brand-text rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Live counters */}
      {totalViolations > 0 && (
        <div className="grid grid-cols-4 divide-x divide-brand-border border border-brand-border rounded-lg overflow-hidden">
          {[
            { label: 'Suspects', value: totalViolations },
            { label: 'Cleared', value: totals.gate_dropped },
            { label: 'Classified', value: totals.classified },
            { label: 'Queued', value: totals.failed_retryable },
          ].map(({ label, value }) => (
            <div key={label} className="py-2.5 px-3 text-center">
              <p className="text-base font-black text-brand-text tabular-nums leading-none">{value}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-brand-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stalled indicator — no user action required */}
      {isStalled && (
        <div className="rounded-lg px-4 py-3 flex items-center gap-3 bg-amber-50 border border-amber-100">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <p className="text-[10px] font-bold text-amber-800 flex-1">
            {retrying
              ? `Resuming analysis for ${totals.failed_retryable} suspect${totals.failed_retryable !== 1 ? 's' : ''}…`
              : `Analysis for ${totals.failed_retryable} suspect${totals.failed_retryable !== 1 ? 's' : ''} paused. Pipeline will auto-retry shortly.`}
          </p>
          {retrying && (
            <svg className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

