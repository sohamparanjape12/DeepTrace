'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AssetCard } from '@/components/shared/AssetCard';
import { FilterTabs } from '@/components/shared/FilterTabs';
import { Button } from '@/components/ui/Button';
import type { Asset } from '@/types';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAssets() {
      try {
        const snapshot = await getDocs(collection(db, 'assets'));
        const assetsData = snapshot.docs.map(doc => doc.data() as Asset);
        setAssets(assetsData);
      } catch (err) {
        console.error('Failed to fetch assets:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssets();
  }, []);

  const TABS = [
    { key: 'all',              label: 'All',       count: assets.length },
    { key: 'violations_found', label: 'Violations', count: assets.filter(a => a.scan_status === 'violations_found').length },
    { key: 'scanning',         label: 'Scanning',  count: assets.filter(a => a.scan_status === 'scanning').length },
    { key: 'clean',            label: 'Clean',     count: assets.filter(a => a.scan_status === 'clean').length },
    { key: 'pending',          label: 'Pending',   count: assets.filter(a => a.scan_status === 'pending').length },
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

      <FilterTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[280px] bg-zinc-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-6 text-center border border-dashed border-brand-border rounded-2xl">
          <p className="font-display font-black text-3xl text-zinc-200 uppercase">No Assets Found</p>
          <p className="text-brand-muted text-sm">Register your first media asset to start scanning.</p>
          <Link href="/assets/upload">
            <Button>Register Asset</Button>
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
