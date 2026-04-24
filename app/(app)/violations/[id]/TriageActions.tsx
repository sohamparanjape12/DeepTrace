'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { Violation } from '@/types';

interface TriageActionsProps {
  violationId: string;
}

export function TriageActions({ violationId }: TriageActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAction = async (status: Violation['status']) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/violations/${violationId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, reviewed_by: 'user' }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        console.error('Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-4">
      <button
        onClick={() => handleAction('resolved')}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-green-700 transition-colors shadow disabled:opacity-50"
      >
        <CheckCircle className="w-4 h-4" /> Mark Resolved
      </button>
      <button
        onClick={() => handleAction('disputed')}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors shadow disabled:opacity-50"
      >
        <AlertTriangle className="w-4 h-4" /> Dispute
      </button>
      <button
        onClick={() => handleAction('false_positive')}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 rounded-xl border border-brand-border bg-white text-zinc-700 text-[11px] font-black uppercase tracking-widest hover:border-zinc-400 hover:text-brand-text transition-all shadow disabled:opacity-50"
      >
        <XCircle className="w-4 h-4" /> False Positive
      </button>
    </div>
  );
}
