'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Info, Library, ShieldAlert, Loader2, CheckCircle, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AssetCard } from '@/components/shared/AssetCard';
import { FilterTabs } from '@/components/shared/FilterTabs';
import { Button } from '@/components/ui/Button';
import type { Asset } from '@/types';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function AssetsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAssets() {
      if (!user) return;
      try {
        const q = query(collection(db, 'assets'), where('owner_id', '==', user.uid));
        const snapshot = await getDocs(q);
        const assetsData = snapshot.docs.map(doc => doc.data() as Asset);
        setAssets(assetsData);
      } catch (err) {
        console.error('Failed to fetch assets:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssets();
  }, [user]);

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
        subtitle="All registered media assets and their current scan status."
        actions={
          <Link href="/assets/upload">
            <Button size="lg" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Register New Asset
            </Button>
          </Link>
        }
      />

      {/* ─── Dry-Run Explainer Panel ─── */}
      <div className="bento-card p-6 space-y-4 border-l-4 border-l-blue-400">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-blue-50 shrink-0">
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-brand-text">How This Page Works</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-brand-muted leading-relaxed">
              <div className="flex items-start gap-2">
                <Plus className="w-3.5 h-3.5 text-brand-text mt-0.5 shrink-0" />
                <p><strong className="text-brand-text">Register New Asset</strong> — Opens the 4-step wizard: upload your image → SerpAPI scans the web for copies → you provide context → Gemini AI runs forensic analysis.</p>
              </div>
              <div className="flex items-start gap-2">
                <Library className="w-3.5 h-3.5 text-brand-text mt-0.5 shrink-0" />
                <p><strong className="text-brand-text">Asset Cards</strong> — Each card shows an uploaded asset with its name, organization, rights tier, and current scan status. Click to view details and violations.</p>
              </div>
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <p><strong className="text-brand-text">Filter Tabs</strong> — Filter by scan status: <em>Violations</em> = copies found, <em>Scanning</em> = in progress, <em>Clean</em> = no matches, <em>Pending</em> = awaiting scan.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                <p><strong className="text-brand-text">Status Badges</strong> — Each asset card shows a colored badge indicating the scan result. Red = violations found, Green = clean, Blue = scanning, Gray = pending.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FilterTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

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

