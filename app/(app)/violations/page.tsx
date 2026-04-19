'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { ViolationCard } from '@/components/shared/ViolationCard';
import { FilterTabs } from '@/components/shared/FilterTabs';
import type { Severity, Violation } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';

export default function ViolationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'violations'), orderBy('detected_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vData = snapshot.docs.map(doc => doc.data() as Violation);
      setViolations(vData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching violations:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const ALL_TABS = [
    { key: 'all',      label: 'All',      count: violations.length },
    { key: 'CRITICAL', label: 'Critical', count: violations.filter(v => v.severity === 'CRITICAL').length },
    { key: 'HIGH',     label: 'High',     count: violations.filter(v => v.severity === 'HIGH').length },
    { key: 'MEDIUM',   label: 'Medium',   count: violations.filter(v => v.severity === 'MEDIUM').length },
    { key: 'LOW',      label: 'Low',      count: violations.filter(v => v.severity === 'LOW').length },
  ];

  const filtered = activeTab === 'all'
    ? violations
    : violations.filter(v => v.severity === (activeTab as Severity));

  const handleResolve = async (id: string) => {
    try { await updateDoc(doc(db, 'violations', id), { status: 'resolved' }); } catch (e) { console.error(e); }
  };

  const handleDispute = async (id: string) => {
    try { await updateDoc(doc(db, 'violations', id), { status: 'disputed' }); } catch (e) { console.error(e); }
  };

  const handleFalsePositive = async (id: string) => {
    try { await updateDoc(doc(db, 'violations', id), { status: 'false_positive' }); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-12">
      <PageHeader
        title="Violations"
        subtitle="All detected unauthorized uses of your registered assets."
      />

      <FilterTabs tabs={ALL_TABS} active={activeTab} onChange={setActiveTab} />

      {isLoading ? (
        <div className="space-y-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-brand-border rounded-2xl gap-4">
          <p className="font-display font-black text-3xl text-zinc-200 uppercase">No Violations</p>
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
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
