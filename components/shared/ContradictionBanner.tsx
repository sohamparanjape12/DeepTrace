import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function ContradictionBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
      <p className="text-[11px] font-bold text-amber-900 leading-tight">
        Forensic signals are contradictory — verdict softened for safety. Manual reviewer attention is recommended.
      </p>
    </div>
  );
}
