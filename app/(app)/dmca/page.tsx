'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { DMCANotice } from '@/lib/dmca/types';
import { Shield, Clock, ExternalLink, ChevronRight, FileText } from 'lucide-react';
import { clsx } from 'clsx';

export default function DMCADashboard() {
  const { user } = useAuth();
  const [notices, setNotices] = useState<DMCANotice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'dmca_notices'),
      where('customer_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: DMCANotice[] = [];
      snapshot.forEach(doc => results.push({ ...doc.data() as DMCANotice, id: doc.id }));
      setNotices(results.sort((a, b) => new Date(b.draft?.generated_at || 0).getTime() - new Date(a.draft?.generated_at || 0).getTime()));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const statusColors: Record<string, string> = {
    drafting: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
    pending_review: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    sent: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400',
    acknowledged: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400',
    removed: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
    counter_notice: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
    escalated: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    withdrawn: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400',
  };

  return (
    <div className="space-y-8 pb-24">
      <PageHeader
        title="DMCA Takedowns"
        subtitle="Manage copyright infringement notices and track their lifecycle."
      />

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-brand-text border-t-transparent animate-spin" />
        </div>
      ) : notices.length === 0 ? (
        <div className="bento-card p-16 text-center space-y-4">
          <Shield className="w-12 h-12 text-brand-muted/30 mx-auto" />
          <p className="font-display font-black text-xl text-brand-muted uppercase">No DMCA Notices</p>
          <p className="text-sm text-brand-muted max-w-md mx-auto">
            You haven't generated any DMCA takedown notices yet. You can generate them from any eligible violation.
          </p>
        </div>
      ) : (
        <div className="bento-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-brand-surface/50 text-[10px] font-black uppercase tracking-widest text-brand-muted">
                <th className="p-4 font-bold">Target Domain</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Generated</th>
                <th className="p-4 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {notices.map((notice) => (
                <tr key={notice.id} className="hover:bg-brand-surface/30 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-brand-bg border border-brand-border flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-brand-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-brand-text">{notice.host.domain}</p>
                        <p className="text-xs text-brand-muted font-mono">{notice.id.split('-')[0]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={clsx("px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border", statusColors[notice.status])}>
                      {notice.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-brand-text flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-brand-muted" />
                      {new Date(notice.draft?.generated_at || 0).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="p-4">
                    <Link href={`/dmca/${notice.id}`}>
                      <button className="flex items-center justify-center w-8 h-8 rounded-full border border-brand-border bg-brand-bg hover:border-brand-text transition-colors">
                        <ChevronRight className="w-4 h-4 text-brand-text" />
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
