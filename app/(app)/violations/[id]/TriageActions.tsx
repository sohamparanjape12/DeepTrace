'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import type { Violation } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';

interface TriageActionsProps {
  violation: Violation;
  onUpdate?: (violation: Violation) => void;
}

export function TriageActions({ violation, onUpdate }: TriageActionsProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleAction = async (status: Violation['status']) => {
    // Auth State Check: Confirm auth is loaded and user is present before executing
    if (authLoading || !user || !auth.currentUser) {
      console.error('Action blocked: Firebase auth not fully loaded or user not authenticated.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/violations/${violation.violation_id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status, 
          reviewed_by: user.email || user.uid 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Notify parent of the status update for instant UI feedback
        onUpdate?.({ ...violation, status });
        router.refresh();
      } else {
        // Error Handling: Surface the specific Firebase/API response payload
        const errorMsg = data.error || data.message || 'Failed to update status';
        console.error('Firebase/API Error Payload:', data);
        alert(`Status Update Failed: ${errorMsg}`);
      }
    } catch (err: any) {
      // Catch network errors or unexpected SDK errors
      console.error('Failed to update status:', err);
      alert(`Network Error: ${err.message || 'Could not connect to server'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-4">
      <button
        onClick={() => handleAction('resolved')}
        disabled={loading || authLoading}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-green-700 transition-colors shadow disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        Mark Resolved
      </button>
      <button
        onClick={() => handleAction('disputed')}
        disabled={loading || authLoading}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors shadow disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
        Dispute
      </button>
      <button
        onClick={() => handleAction('false_positive')}
        disabled={loading || authLoading}
        className="flex items-center gap-2 px-6 py-3 rounded-xl border border-brand-border bg-brand-surface text-brand-text text-[11px] font-black uppercase tracking-widest hover:border-brand-muted transition-all shadow disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
        False Positive
      </button>
    </div>
  );
}
