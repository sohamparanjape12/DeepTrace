'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Info, Library, ShieldAlert, Loader2, CheckCircle, Clock, ChevronDown, ChevronUp, Search, Brain, Zap, Trash2, Download } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AssetCard } from '@/components/shared/AssetCard';
import { FilterTabs } from '@/components/shared/FilterTabs';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';
import type { Asset } from '@/types';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth } from '@/lib/firebase';

export default function AssetsPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  useEffect(() => {
    // Auth State Check: Ensure listener only starts after user is fully authenticated
    if (authLoading || !user || !auth.currentUser) return;

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
      console.error(`[FirebaseError] Permission denied or listener failed at /assets for user ${user.uid}:`, err.code, err.message);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, sortOrder, authLoading]);

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(a => a.asset_id || a.id)));
    }
  };

  const bulkDelete = async () => {
    if (!user || selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} assets?`)) return;

    setIsBulkLoading(true);
    try {
      await Promise.all(Array.from(selectedIds).map(id =>
        fetch(`/api/assets/${id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid })
        })
      ));
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
      alert('Failed to delete some assets');
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleExport = () => {
    if (selectedIds.size === 0) return;
    
    const selectedAssets = assets.filter(a => selectedIds.has(a.asset_id || a.id));
    
    // CSV Header
    const headers = ['Asset ID', 'Name', 'Status', 'Rights Tier', 'Violations', 'Uploaded At', 'Storage URL'];
    
    // CSV Content
    const rows = selectedAssets.map(a => [
      a.asset_id || a.id,
      `"${a.name?.replace(/"/g, '""') || 'Untitled'}"`,
      a.scan_status || 'pending',
      a.rights_tier || 'editorial',
      a.totals?.classified ?? a.totals?.reverse_hits ?? 0,
      a.uploaded_at ? new Date(a.uploaded_at).toISOString() : '',
      a.storageUrl || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `deeptrace_assets_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSelectedIds(new Set());
  };

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
    <div className="space-y-12 pb-24 relative">
      <PageHeader
        title="Asset Library"
        size="xl"
        subtitle="All registered media assets and their current scan status."
        actions={
          <Link href="/assets/upload">
            <Button size="lg" className="flex items-center gap-2 shadow-lg shadow-brand-accent/20">
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
        <div className="flex items-center gap-6">
          <FilterTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
          {filtered.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-[10px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors"
            >
              {selectedIds.size === filtered.length ? 'Deselect All' : `Select All (${filtered.length})`}
            </button>
          )}
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-5 gap-y-8">
          {filtered.map((asset) => (
            <AssetCard
              key={asset.asset_id || asset.id}
              asset={asset}
              isSelected={selectedIds.has(asset.asset_id || asset.id)}
              onSelect={handleSelect}
              onClick={() => !isBulkLoading && window.location.assign(`/assets/${asset.asset_id || asset.id}`)}
            />
          ))}
        </div>
      )}

      {/* ─── Bulk Actions ─── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-neutral-900/90 dark:bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-6">
            <div className="flex items-center gap-3 pr-6 border-r border-white/10">
              <div className="w-8 h-8 rounded-full bg-brand-text flex items-center justify-center text-brand-bg font-black text-xs">
                {selectedIds.size}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Assets Selected</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleExport}
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/5 rounded-full px-4 gap-2 h-9 border border-white/5"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="text-[11px] font-black uppercase tracking-tight">Export Forensic CSV</span>
              </Button>
              
              <Button 
                onClick={bulkDelete}
                disabled={isBulkLoading}
                variant="ghost" 
                size="sm" 
                className="text-red-400 hover:bg-red-500/10 rounded-full px-4 gap-2 h-9 border border-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[11px] font-black uppercase tracking-tight">Bulk Delete</span>
              </Button>
            </div>

            <div className="h-4 w-px bg-white/10 mx-2" />

            <button 
              onClick={() => setSelectedIds(new Set())}
              className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
