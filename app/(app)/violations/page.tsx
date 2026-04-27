'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { ViolationCard } from '@/components/shared/ViolationCard';
import { FilterTabs } from '@/components/shared/FilterTabs';
import type { Severity, Violation } from '@/types';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { auth } from '@/lib/firebase';

export default function ViolationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    // Auth State Check: Confirm auth is fully loaded before executing query
    if (authLoading || !user || !auth.currentUser) return;
    const q = query(
      collection(db, 'violations'),
      where('owner_id', '==', user.uid),
      orderBy('detected_at', sortOrder)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vData = snapshot.docs
        .map(doc => doc.data() as Violation)
        .filter(v => (v.stage as string) !== 'ignored');
      setViolations(vData);
      setIsLoading(false);
    }, (err) => {
      console.error(`[FirebaseError] Permission denied or listener failed at /violations for user ${user.uid}:`, err.code, err.message);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, sortOrder, authLoading]);

  const ALL_TABS = [
    { key: 'all', label: 'All', count: violations.length },
    { key: 'CRITICAL', label: 'Critical', count: violations.filter(v => v.severity === 'CRITICAL').length },
    { key: 'HIGH', label: 'High', count: violations.filter(v => v.severity === 'HIGH').length },
    { key: 'MEDIUM', label: 'Medium', count: violations.filter(v => v.severity === 'MEDIUM').length },
    { key: 'LOW', label: 'Low', count: violations.filter(v => v.severity === 'LOW').length },
  ];

  const filtered = activeTab === 'all'
    ? violations
    : violations.filter(v => v.severity === (activeTab as Severity));

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`/api/violations/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewed_by: 'user' }),
      });
    } catch (err) {
      console.error('Failed to update violation status:', err);
    }
  };

  const handleResolve = (id: string) => handleStatusChange(id, 'resolved');
  const handleDispute = (id: string) => handleStatusChange(id, 'disputed');
  const handleFalsePositive = (id: string) => handleStatusChange(id, 'false_positive');

  return (
    <div className="space-y-12">
      <PageHeader
        title="Violations"
        size="xl"
        subtitle="All detected unauthorized uses of your registered assets."
      />

      <div className="flex items-center justify-between">
        <FilterTabs tabs={ALL_TABS} active={activeTab} onChange={setActiveTab} />
        <div className="flex items-center gap-2 bg-brand-surface border border-brand-border px-3 py-1.5 rounded-lg">
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Sort</span>
          <select
            className="bg-transparent text-xs font-bold focus:outline-none"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-brand-bg rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-brand-border rounded-2xl gap-4">
          <p className="font-display font-black text-3xl text-brand-muted/30 uppercase">No Violations Found</p>
          <p className="text-brand-muted text-sm">No violations match this filter.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(v => (
            <Link key={v.violation_id} href={`/violations/${v.violation_id}`} className="block">
              <ViolationCard
                violation={v}
                onResolve={(id) => { handleResolve(id); }}
                onDispute={(id) => { handleDispute(id); }}
                onFalsePositive={(id) => { handleFalsePositive(id); }}
                onDMCA={(id) => { router.push(`/violations/${id}?action=dmca`); }}
                onViewDMCA={(noticeId) => { router.push(`/dmca/${noticeId}`); }}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
