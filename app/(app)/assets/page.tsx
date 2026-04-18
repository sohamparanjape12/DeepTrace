'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { AssetCard } from '@/components/shared/AssetCard';
import { FilterTabs } from '@/components/shared/FilterTabs';
import { Button } from '@/components/ui/Button';
import type { Asset } from '@/types';

const MOCK_ASSETS: Asset[] = [
  { asset_id: 'a1', name: 'Champions League Final — Hero Shot',  owner_org: 'UEFA Media', uploaded_at: '2026-04-15T10:00:00Z', rights_tier: 'commercial',  tags: ['Football', 'UCL', 'Final'],    scan_status: 'violations_found', thumbnailUrl: 'https://picsum.photos/seed/ucl/800/500' },
  { asset_id: 'a2', name: 'Wimbledon 2026 — Centre Court Serve', owner_org: 'AEW Media',  uploaded_at: '2026-04-14T09:30:00Z', rights_tier: 'editorial',    tags: ['Tennis', 'Wimbledon'],         scan_status: 'clean',            thumbnailUrl: 'https://picsum.photos/seed/tennis/800/500' },
  { asset_id: 'a3', name: 'IPL 2026 — Match Winner Celebration',  owner_org: 'BCCI',       uploaded_at: '2026-04-13T14:00:00Z', rights_tier: 'all_rights',   tags: ['Cricket', 'IPL', '2026'],      scan_status: 'scanning',         thumbnailUrl: 'https://picsum.photos/seed/cricket/800/500' },
  { asset_id: 'a4', name: 'NBA Playoffs — Slam Dunk',             owner_org: 'NBA Media',  uploaded_at: '2026-04-12T08:00:00Z', rights_tier: 'commercial',   tags: ['Basketball', 'NBA'],           scan_status: 'clean',            thumbnailUrl: 'https://picsum.photos/seed/nba/800/500' },
  { asset_id: 'a5', name: 'Formula 1 Monaco — Pit Stop',          owner_org: 'FOM',        uploaded_at: '2026-04-11T17:00:00Z', rights_tier: 'commercial',   tags: ['F1', 'Monaco', 'Pit'],         scan_status: 'violations_found', thumbnailUrl: 'https://picsum.photos/seed/f1/800/500' },
  { asset_id: 'a6', name: 'Cycling Tour — Mountain Stage',        owner_org: 'ASO',        uploaded_at: '2026-04-10T11:00:00Z', rights_tier: 'no_reuse',     tags: ['Cycling', 'TdF'],              scan_status: 'pending',          thumbnailUrl: 'https://picsum.photos/seed/cycling/800/500' },
];

const TABS = [
  { key: 'all',              label: 'All',       count: MOCK_ASSETS.length },
  { key: 'violations_found', label: 'Violations', count: MOCK_ASSETS.filter(a => a.scan_status === 'violations_found').length },
  { key: 'scanning',         label: 'Scanning',  count: MOCK_ASSETS.filter(a => a.scan_status === 'scanning').length },
  { key: 'clean',            label: 'Clean',     count: MOCK_ASSETS.filter(a => a.scan_status === 'clean').length },
  { key: 'pending',          label: 'Pending',   count: MOCK_ASSETS.filter(a => a.scan_status === 'pending').length },
];

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState('all');

  const filtered = activeTab === 'all'
    ? MOCK_ASSETS
    : MOCK_ASSETS.filter(a => a.scan_status === activeTab);

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

      {filtered.length === 0 ? (
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
