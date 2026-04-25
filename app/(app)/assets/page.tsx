'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Info, Library, ShieldAlert, Loader2, CheckCircle, Clock, ChevronDown, ChevronUp, Search, Brain, Zap } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AssetCard } from '@/components/shared/AssetCard';
import { FilterTabs } from '@/components/shared/FilterTabs';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';
import type { Asset } from '@/types';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export default function AssetsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'assets'),
      where('owner_id', '==', user.uid),
      orderBy('uploaded_at', sortOrder)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        asset_id: doc.id
      } as Asset));
      setAssets(assetsData);
      setIsLoading(false);
    }, (err) => {
      console.error('Failed to listen to assets:', err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, sortOrder]);

  const TABS = [
    { key: 'all', label: 'All', count: assets.length },
    { key: 'violations_found', label: 'Violations', count: assets.filter(a => a.scan_status === 'violations_found').length },
    { key: 'scanning', label: 'Scanning', count: assets.filter(a => a.scan_status === 'scanning').length },
    { key: 'clean', label: 'Clean', count: assets.filter(a => a.scan_status === 'clean').length },
    { key: 'pending', label: 'Pending', count: assets.filter(a => a.scan_status === 'pending').length },
  ];

  const filtered = activeTab === 'all'
    ? assets
    : assets.filter(a => a.scan_status === activeTab);

  return (
    <div className="space-y-12">
      <PageHeader
        title="Asset Library"
        size="xl"
        subtitle="All registered media assets and their current scan status."
        actions={
          <Link href="/assets/upload">
            <Button size="lg" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Register New Asset
            </Button>
          </Link>
        }
      />

      {/* ─── Premium Forensic Guide ─── */}
      <div className={clsx(
        "group border rounded-3xl transition-all duration-500 ease-in-out overflow-hidden",
        isGuideOpen
          ? "bg-brand-surface border-brand-border shadow-2xl shadow-brand-text/5 p-8"
          : "bg-brand-surface border-neutral-200 dark:border-neutral-800 hover:border-brand-border p-4 cursor-pointer"
      )}
        onClick={() => !isGuideOpen && setIsGuideOpen(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              isGuideOpen ? "bg-brand-text text-brand-bg" : "bg-brand-bg text-brand-muted"
            )}>
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tighter">Platform Forensic Guide</h3>
              {!isGuideOpen && <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest mt-0.5">Learn how to register assets and audit violations</p>}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsGuideOpen(!isGuideOpen);
            }}
            className="rounded-full w-8 h-8 p-0"
          >
            {isGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {isGuideOpen && (
          <div className="mt-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest">01. Registration</h4>
                </div>
                <p className="text-sm text-brand-muted leading-relaxed font-medium">
                  Register your original media assets with metadata. This creates a digital fingerprint used for global cross-referencing.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Search className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest">02. Discovery</h4>
                </div>
                <p className="text-sm text-brand-muted leading-relaxed font-medium">
                  Our discovery engine continuously scans global indexing services to identify potential visual matches and unauthorized mirrors.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Brain className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-black uppercase tracking-widest">03. Forensic Audit</h4>
                </div>
                <p className="text-sm text-brand-muted leading-relaxed font-medium">
                  Matches are processed by the Forensic Content Auditor, evaluating commercial intent, fair use context, and reliability scores.
                </p>
              </div>
            </div>

            <div className="mt-12 pt-12 border-t border-brand-border grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex gap-4 p-4 rounded-2xl bg-brand-bg/50">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-1">Violation Management</p>
                  <p className="text-xs text-brand-muted leading-relaxed font-medium">
                    Filter assets by <span className="text-brand-text">Violations Found</span> to prioritize high-risk infringements requiring immediate triage.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-2xl bg-brand-bg/50">
                <Zap className="w-5 h-5 text-brand-accent shrink-0" />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest mb-1">Real-time Updates</p>
                  <p className="text-xs text-brand-muted leading-relaxed font-medium">
                    The Asset Library reflects live scan statuses. Use the sort toggles to monitor the latest detections across your portfolio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <FilterTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[280px] bg-brand-bg rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center border border-dashed border-brand-border rounded-2xl gap-4">
          <p className="font-display font-black text-3xl text-brand-muted/30 uppercase">No Assets Found</p>
          <p className="text-brand-muted text-sm">Register your first media asset to start scanning.</p>
          <Link href="/assets/upload">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Register Your First Asset
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((asset) => (
            <Link key={asset.asset_id} href={`/assets/${asset.asset_id}`} className="block">
              <AssetCard asset={asset} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

