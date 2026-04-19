'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Calendar, Tag, Scan, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ViolationCard } from '@/components/shared/ViolationCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Asset, Violation } from '@/types';

// Mock data — swap with Firestore reads when keys are live
const MOCK_ASSET: Asset & { last_scanned_at: string } = {
  asset_id: 'a1',
  name: 'Champions League Final — Hero Shot',
  owner_org: 'UEFA Media',
  uploaded_at: '2026-04-15T10:00:00Z',
  last_scanned_at: '2026-04-18T20:45:00Z',
  rights_tier: 'commercial',
  tags: ['Football', 'UCL', 'Final'],
  scan_status: 'violations_found',
  thumbnailUrl: 'https://picsum.photos/seed/ucl/1200/750',
};

const MOCK_SCANS = [
  { id: 's3', timestamp: '2026-04-18T20:45:00Z', status: 'violations_found', results: '2 violations detected' },
  { id: 's2', timestamp: '2026-04-17T21:10:00Z', status: 'violations_found', results: '1 violation detected' },
  { id: 's1', timestamp: '2026-04-16T19:00:00Z', status: 'clean',            results: '0 violations detected' },
];

const MOCK_VIOLATIONS: Violation[] = [
  {
    violation_id: 'v1', asset_id: 'a1', detected_at: '2026-04-18T08:12:00Z',
    match_url: 'https://reddit.com/r/soccer/post/a1b2c3',
    match_type: 'full_match', gemini_class: 'UNAUTHORIZED', severity: 'CRITICAL', status: 'open',
    gemini_reasoning: 'Full-resolution match uploaded commercially on Reddit without license. Rights tier is commercial — unauthorized use confirmed.',
    assetThumbnailUrl: 'https://picsum.photos/seed/ucl/400/250',
  },
  {
    violation_id: 'v3', asset_id: 'a1', detected_at: '2026-04-17T22:00:00Z',
    match_url: 'https://sportsblog.net/match-highlights-embed',
    match_type: 'full_match', gemini_class: 'UNAUTHORIZED', severity: 'HIGH', status: 'open',
    gemini_reasoning: 'Unattributed full repost on a for-profit sports aggregator site.',
    assetThumbnailUrl: 'https://picsum.photos/seed/ucl/400/250',
  },
];

const scanStatusConfig = {
  pending:          { label: 'Pending',           variant: 'default' as const },
  scanning:         { label: 'Scanning…',         variant: 'info'    as const },
  clean:            { label: 'Clean',             variant: 'success' as const },
  violations_found: { label: 'Violations Found',  variant: 'error'   as const },
};

const rightsTierLabels: Record<string, string> = {
  editorial:  'Editorial',
  commercial: 'Commercial',
  all_rights: 'All Rights Reserved',
  no_reuse:   'No Reuse',
};

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const asset = MOCK_ASSET; // In production: fetch from Firestore by id
  const statusCfg = scanStatusConfig[asset.scan_status];

  return (
    <div className="space-y-12">
      {/* Back + Title */}
      <div className="flex items-start gap-6">
        <Link href="/assets" className="mt-2 shrink-0">
          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Assets
          </Button>
        </Link>
        <PageHeader title={asset.name} className="mb-0 flex-1" />
      </div>

      {/* Asset Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Thumbnail */}
        <div className="lg:col-span-3 aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-brand-border relative group">
          <img
            src={asset.thumbnailUrl}
            alt={asset.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6">
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          </div>
        </div>

        {/* Meta Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bento-card p-8 space-y-6">
            <h3 className="font-display font-black uppercase text-xs tracking-widest text-brand-muted">Asset Metadata</h3>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-meta mb-1">Organization</p>
                  <p className="text-sm font-bold text-brand-text">{asset.owner_org}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-meta mb-1">Uploaded</p>
                  <p className="text-sm font-bold text-brand-text">
                    {new Date(asset.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Scan className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-meta mb-1">Last Scanned</p>
                  <p className="text-sm font-bold text-brand-text">
                    {new Date(asset.last_scanned_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Scan className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-meta mb-1">Rights Tier</p>
                  <p className="text-sm font-bold text-brand-text">{rightsTierLabels[asset.rights_tier]}</p>
                </div>
              </div>
              {asset.tags?.length > 0 && (
                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
                  <div>
                    <p className="text-meta mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {asset.tags.map(t => (
                        <span key={t} className="px-2.5 py-1 rounded-full bg-zinc-100 text-[10px] font-black uppercase tracking-widest text-brand-muted">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bento-card p-8 space-y-4">
            <h3 className="font-display font-black uppercase text-xs tracking-widest text-brand-muted">Scan Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-display font-black text-brand-accent">{MOCK_VIOLATIONS.length}</p>
                <p className="text-meta mt-1">Open</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-display font-black">1</p>
                <p className="text-meta mt-1">Critical</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-display font-black text-green-600">0</p>
                <p className="text-meta mt-1">Resolved</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scan History and Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Violations for this asset */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="font-display font-black uppercase text-xl text-white">
            Violations <span className="opacity-40">({MOCK_VIOLATIONS.length})</span>
          </h2>
          {MOCK_VIOLATIONS.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-brand-border rounded-2xl gap-4">
              <p className="font-display font-black text-3xl text-zinc-200 uppercase">Clean</p>
              <p className="text-brand-muted text-sm">No violations detected for this asset.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {MOCK_VIOLATIONS.map(v => (
                <Link key={v.violation_id} href={`/violations/${v.violation_id}`}>
                  <ViolationCard violation={v} className="hover:shadow-soft-lg transition-shadow" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Scan Timeline */}
        <div className="space-y-6">
          <h2 className="font-display font-black uppercase text-xl text-white">Scan History</h2>
          <div className="bento-card overflow-hidden divide-y divide-brand-border">
            {MOCK_SCANS.map((scan) => (
              <div key={scan.id} className="p-4 flex gap-4 hover:bg-zinc-50 transition-colors group">
                <div className="mt-1 flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${scan.status === 'clean' ? 'bg-green-500' : 'bg-brand-accent'}`} />
                  <div className="w-px flex-1 bg-brand-border my-1" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                      {new Date(scan.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                    <Badge variant={scan.status === 'clean' ? 'success' : 'error'} className="scale-75 origin-right">
                      {scan.status === 'clean' ? 'Clean' : 'Alert'}
                    </Badge>
                  </div>
                  <p className="text-xs font-bold text-brand-text">{scan.results}</p>
                </div>
              </div>
            ))}
            <div className="p-4 bg-zinc-50 border-t border-brand-border">
              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest text-center">Scan Frequency: Every 24 Hours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
