'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { Asset } from '@/types';
import { Brain, ChevronRight } from 'lucide-react';
import Link from 'next/link';

// Shared weighted formula — must match PipelineProgress.tsx
function computePercent(asset: Asset): number {
  const t = asset.totals;
  if (!t) return 0;
  if (asset.stage === 'complete') return 100;
  const total = t.reverse_hits || 0;
  if (total === 0) return 0;
  const weighted =
    (t.classified * 1.0) +
    (t.gate_dropped * 1.0) +
    ((t.failed_permanent ?? 0) * 1.0) +
    (t.scraped * 0.7) +
    (t.gate_passed * 0.4) +
    (t.gated_pending * 0.1);
  return Math.min(99, Math.round((weighted / total) * 100));
}

const STALL_TIMEOUT_MS = 45_000;
const SVG_R = 24;
const SVG_CIRC = 2 * Math.PI * SVG_R; // ≈ 150.8

export function GlobalProgressBanner() {
  const { user, loading: authLoading } = useAuth();
  const [completedAssets, setCompletedAssets] = useState<Set<string>>(new Set());
  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);
  const isFirstLoadRef = useRef(true);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // Auth State Check: Ensure listener only starts after user is fully authenticated
    if (authLoading || !user || !auth.currentUser) return;

    const q = query(
      collection(db, 'assets'),
      where('owner_id', '==', user.uid),
      where('stage', 'in', ['uploaded', 'reverse_searched', 'gated', 'analyzing', 'complete', 'failed']),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const assets = snap.docs
        .map(d => ({ ...d.data(), asset_id: d.id } as Asset))
        .sort((a, b) => {
          const tA = a.stage_updated_at?.toMillis?.() || a.stage_updated_at?.seconds * 1000 || 0;
          const tB = b.stage_updated_at?.toMillis?.() || b.stage_updated_at?.seconds * 1000 || 0;
          return tB - tA;
        });
      
      // On mount, initialize completedAssets so we don't cycle through history
      if (isFirstLoadRef.current) {
        const initialCompleted = new Set(
          assets
            .filter(a => a.asset_id && (a.stage === 'complete' || a.stage === 'failed'))
            .map(a => a.asset_id!)
        );
        setCompletedAssets(initialCompleted);
        isFirstLoadRef.current = false;
      }

      const active = assets.find(a => a.stage && ['uploaded', 'reverse_searched', 'gated', 'analyzing'].includes(a.stage));
      
      if (active) {
        setActiveAsset(active);
      } else {
        const recent = assets.find(a => a.asset_id && (a.stage === 'complete' || a.stage === 'failed') && !completedAssets.has(a.asset_id));
        if (recent) {
          setActiveAsset(recent);
          setTimeout(() => {
            setCompletedAssets(prev => new Set(prev).add(recent.asset_id!));
            setActiveAsset(current => current?.asset_id === recent.asset_id ? null : current);
          }, 5000);
        } else {
          setActiveAsset(null);
        }
      }
    }, (err) => {
      console.error(`[FirebaseError] Permission denied or listener failed at /GlobalProgressBanner for user ${user.uid}:`, err.code, err.message);
    });
    return () => unsubscribe();
  }, [user, authLoading, completedAssets]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const totals = activeAsset?.totals;
  const processed = (totals?.classified ?? 0) + (totals?.gate_dropped ?? 0) + (totals?.failed_permanent ?? 0);
  const total = totals?.reverse_hits ?? 0;
  const isStalled =
    activeAsset?.stage === 'analyzing' &&
    processed < total &&
    (totals?.failed_retryable ?? 0) > 0;

  // ── Auto-retry ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (!isStalled || !activeAsset?.asset_id) return;
    retryTimerRef.current = setTimeout(async () => {
      setRetrying(true);
      try {
        await fetch(`/api/resume/${activeAsset.asset_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true }),
        });
      } catch (e) {
        console.error('[GlobalBanner] Auto-retry failed:', e);
      } finally {
        setTimeout(() => setRetrying(false), 4000);
      }
    }, STALL_TIMEOUT_MS);
    return () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); };
  }, [isStalled, activeAsset?.asset_id]);

  if (!activeAsset) return null;

  const percent = computePercent(activeAsset);
  const dashOffset = SVG_CIRC - (percent / 100) * SVG_CIRC;

  const statusLabel = retrying ? 'Resuming…' : isStalled ? 'Paused' : 'Scan Active';

  return (
    <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-500">
      <Link href={`/assets/${activeAsset.asset_id!}`}>
        <div className="
          bg-white dark:bg-zinc-900
          border border-zinc-200 dark:border-zinc-800
          text-zinc-900 dark:text-white
          p-1 rounded-2xl
          shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)]
          flex items-center gap-0
          hover:scale-[1.02] active:scale-[0.98]
          transition-all duration-200
          group cursor-pointer overflow-hidden min-w-[300px]
        ">
          {/* Icon + circular ring */}
          <div className="relative w-[58px] h-[58px] rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center shrink-0 overflow-hidden m-0.5">
            <Brain
              className={`w-5 h-5 relative z-10 transition-colors ${retrying ? 'text-amber-500 animate-pulse' :
                isStalled ? 'text-amber-500' :
                  'text-zinc-700 dark:text-white/80'
                }`}
            />
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
              {/* Track */}
              <circle
                cx="28" cy="28" r={SVG_R}
                stroke="currentColor" strokeWidth="2" fill="transparent"
                className="text-zinc-200 dark:text-white/5"
              />
              {/* Progress */}
              <circle
                cx="28" cy="28" r={SVG_R}
                stroke="currentColor" strokeWidth="2.5" fill="transparent"
                strokeDasharray={SVG_CIRC}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${isStalled ? 'text-amber-500' : 'text-zinc-700 dark:text-white/70'
                  }`}
              />
            </svg>
          </div>

          {/* Text */}
          <div className="flex-1 px-4 py-2.5 space-y-0.5">
            {/* Top row: status label + percent */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${retrying ? 'bg-amber-500 animate-pulse' :
                  isStalled ? 'bg-amber-500' :
                    'bg-zinc-400 dark:bg-white/40 animate-pulse'
                  }`} />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-white/40">
                  {statusLabel}
                </p>
              </div>
              <span className="text-[10px] font-black text-zinc-700 dark:text-white/70 tabular-nums">
                {percent}%
              </span>
            </div>

            {/* Asset name */}
            <p className="text-[12px] font-bold truncate max-w-[170px] tracking-tight text-zinc-900 dark:text-white">
              {activeAsset.name}
            </p>

            {/* Bottom row: count + cta */}
            <div className="flex items-center justify-between pt-0.5">
              <p className="text-[9px] font-bold text-zinc-400 dark:text-white/30 uppercase tracking-wider tabular-nums">
                {processed} / {total} resolved
              </p>
              <div className="flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform duration-150">
                <span className="text-[9px] font-black uppercase text-zinc-500 dark:text-white/50">View</span>
                <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-white/40" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
