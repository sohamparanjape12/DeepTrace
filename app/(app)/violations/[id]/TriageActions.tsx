'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, RotateCcw } from 'lucide-react';
import type { Violation, ViolationStatus } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';

interface TriageActionsProps {
  violation: Violation;
  onUpdate?: (violation: Violation) => void;
}

type ActionKey = 'resolved' | 'disputed' | 'false_positive';

interface ActionDef {
  key: ActionKey;
  label: string;
  icon: React.ReactNode;
  // CSS classes for each state — uses only brand tokens
  idle: string;
  busy: string;
  done: string;
  doneBg: string;   // background chip shown in the confirmed banner
  doneText: string; // text label inside the banner
}

const ACTIONS: ActionDef[] = [
  {
    key: 'resolved',
    label: 'Mark Resolved',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    idle: 'border-brand-green-text/20 bg-brand-green-muted text-brand-green-text hover:border-brand-green-text/50 hover:bg-brand-green-muted/80',
    busy: 'border-brand-green-text/10 bg-brand-green-muted/40 text-brand-green-text/60 cursor-wait',
    done: 'border-brand-green-text/30 bg-brand-green-muted text-brand-green-text',
    doneBg: 'bg-brand-green-muted border border-brand-green-text/20 text-brand-green-text',
    doneText: 'Marked as Resolved',
  },
  {
    key: 'disputed',
    label: 'Raise Dispute',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    idle: 'border-brand-amber-text/20 bg-brand-amber-muted text-brand-amber-text hover:border-brand-amber-text/50 hover:bg-brand-amber-muted/80',
    busy: 'border-brand-amber-text/10 bg-brand-amber-muted/40 text-brand-amber-text/60 cursor-wait',
    done: 'border-brand-amber-text/30 bg-brand-amber-muted text-brand-amber-text',
    doneBg: 'bg-brand-amber-muted border border-brand-amber-text/20 text-brand-amber-text',
    doneText: 'Dispute Raised — Manual Override Enabled',
  },
  {
    key: 'false_positive',
    label: 'False Positive',
    icon: <XCircle className="w-3.5 h-3.5" />,
    idle: 'border-brand-red-text/20 bg-brand-red-muted text-brand-red-text hover:border-brand-red-text/50 hover:bg-brand-red-muted/80',
    busy: 'border-brand-red-text/10 bg-brand-red-muted/40 text-brand-red-text/60 cursor-wait',
    done: 'border-brand-red-text/30 bg-brand-red-muted text-brand-red-text',
    doneBg: 'bg-brand-red-muted border border-brand-red-text/20 text-brand-red-text',
    doneText: 'Flagged as False Positive',
  },
];

async function postStatus(
  violationId: string,
  status: string,
  reviewedBy: string
) {
  const res = await fetch(`/api/violations/${violationId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reviewed_by: reviewedBy }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Status update failed');
  return data;
}

export function TriageActions({ violation, onUpdate }: TriageActionsProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Which button is currently in-flight
  const [loadingKey, setLoadingKey] = useState<ActionKey | null>(null);
  // Dedicated flags for flow control
  const [isReopening, setIsReopening] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  // Inline error message
  const [error, setError] = useState<string | null>(null);

  const isReady = !authLoading && !!user && !!auth.currentUser;
  const reviewedBy = user?.email || user?.uid || 'unknown';

  // Derive the committed action from the violation's current status
  const currentStatus = violation.status as ViolationStatus;
  const committedAction = currentStatus !== 'open'
    ? ACTIONS.find(a => a.key === currentStatus) ?? null
    : null;

  // ── Handle a triage action ───────────────────────────────────────────────
  const handleAction = async (action: ActionDef) => {
    if (!isReady || loadingKey || isReopening || isRescanning) return;
    setError(null);
    setLoadingKey(action.key);
    try {
      await postStatus(violation.violation_id, action.key, reviewedBy);
      onUpdate?.({ ...violation, status: action.key as ViolationStatus });
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Could not connect to server');
    } finally {
      setLoadingKey(null);
    }
  };

  // ── Handle reopen ────────────────────────────────────────────────────────
  const handleReopen = async () => {
    if (!isReady || isReopening || loadingKey) return;
    setError(null);
    setIsReopening(true);
    try {
      await postStatus(violation.violation_id, 'open', reviewedBy);
      onUpdate?.({ ...violation, status: 'open' });
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Could not reopen violation');
    } finally {
      setIsReopening(false);
    }
  };

  // ── Confirmed / already-actioned state ───────────────────────────────────
  if (committedAction) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {/* Status chip */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest ${committedAction.doneBg}`}>
          {committedAction.icon}
          {committedAction.doneText}
        </div>

        {/* Reopen button — secondary, compact */}
        <button
          onClick={handleReopen}
          disabled={isReopening || !isReady}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-brand-border bg-brand-surface text-brand-muted text-[10px] font-black uppercase tracking-widest hover:border-brand-muted hover:text-brand-text transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isReopening
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <RotateCcw className="w-3 h-3" />
          }
          Reopen
        </button>

        {/* Inline error for reopen failure */}
        {error && (
          <p className="w-full text-[10px] font-bold text-brand-red-text mt-1">{error}</p>
        )}
      </div>
    );
  }

  // ── Default triage buttons ───────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {ACTIONS.map((action) => {
          const isLoading = loadingKey === action.key;
          const isDisabled = !!loadingKey || isReopening || !isReady;

          return (
            <button
              key={action.key}
              onClick={() => handleAction(action)}
              disabled={isDisabled}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md border
                text-[10px] font-black uppercase tracking-widest
                transition-all duration-150 select-none
                disabled:opacity-40 disabled:cursor-not-allowed
                ${isLoading ? action.busy : action.idle}
              `}
            >
              {isLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : action.icon
              }
              {isLoading ? 'Processing…' : action.label}
            </button>
          );
        })}
      </div>

      {/* Inline error */}
      {error && (
        <p className="text-[10px] font-bold text-brand-red-text">{error}</p>
      )}
    </div>
  );
}
