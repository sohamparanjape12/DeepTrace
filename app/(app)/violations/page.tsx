'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { ViolationCard } from '@/components/shared/ViolationCard';
import { FilterTabs } from '@/components/shared/FilterTabs';
import type { Severity, Violation } from '@/types';

const MOCK_VIOLATIONS: Violation[] = [
  {
    violation_id: 'v1', asset_id: 'a1', asset_name: 'UCL Hero', detected_at: '2026-04-18T08:12:00Z',
    match_url:  'https://reddit.com/r/soccer/post/a1b2c3',
    match_type: 'full_match', gemini_class: 'UNAUTHORIZED', severity: 'CRITICAL', status: 'open',
    gemini_reasoning: 'Full-resolution match uploaded commercially on Reddit without license. Rights tier is commercial — unauthorized use confirmed.',
    assetThumbnailUrl: 'https://picsum.photos/seed/ucl/400/250',
  },
  {
    violation_id: 'v2', asset_id: 'a2', asset_name: 'Wimbledon', detected_at: '2026-04-18T07:30:00Z',
    match_url: 'https://theguardian.com/sport/2026/article',
    match_type: 'partial_match', gemini_class: 'EDITORIAL_FAIR_USE', severity: 'LOW', status: 'open',
    gemini_reasoning: 'News article clearly within editorial fair use guidelines.',
    assetThumbnailUrl: 'https://picsum.photos/seed/tennis/400/250',
  },
  {
    violation_id: 'v3', asset_id: 'a1', asset_name: 'UCL Hero', detected_at: '2026-04-17T22:00:00Z',
    match_url: 'https://sportsblog.net/match-highlights-embed',
    match_type: 'full_match', gemini_class: 'UNAUTHORIZED', severity: 'HIGH', status: 'open',
    gemini_reasoning: 'Unattributed full repost on a for-profit aggregator site.',
    assetThumbnailUrl: 'https://picsum.photos/seed/ucl/400/250',
  },
  {
    violation_id: 'v4', asset_id: 'a3', asset_name: 'IPL 2026', detected_at: '2026-04-17T18:15:00Z',
    match_url: 'https://twitter.com/user/status/xyzabc',
    match_type: 'visually_similar', gemini_class: 'NEEDS_REVIEW', severity: 'MEDIUM', status: 'open',
    gemini_reasoning: 'Visually similar crop; context is promotional but ambiguous licensing.',
    assetThumbnailUrl: 'https://picsum.photos/seed/cricket/400/250',
  },
  {
    violation_id: 'v5', asset_id: 'a5', asset_name: 'Monaco Pit', detected_at: '2026-04-17T10:00:00Z',
    match_url: 'https://motorsportweek.com/article/monaco-pit-analysis',
    match_type: 'full_match', gemini_class: 'UNAUTHORIZED', severity: 'CRITICAL', status: 'resolved',
    gemini_reasoning: 'Full-res commercial usage confirmed; marked resolved after takedown.',
    assetThumbnailUrl: 'https://picsum.photos/seed/f1/400/250',
  },
  {
    violation_id: 'v6', asset_id: 'a4', asset_name: 'NBA Dunk', detected_at: '2026-04-16T08:40:00Z',
    match_url: 'https://instagram.com/p/abcdefxyz',
    match_type: 'full_match', gemini_class: 'UNAUTHORIZED', severity: 'HIGH', status: 'disputed',
    gemini_reasoning: 'Possible influencer partnership post; awaiting contract verification.',
    assetThumbnailUrl: 'https://picsum.photos/seed/nba/400/250',
  },
];

const ALL_TABS = [
  { key: 'all',      label: 'All',      count: MOCK_VIOLATIONS.length },
  { key: 'CRITICAL', label: 'Critical', count: MOCK_VIOLATIONS.filter(v => v.severity === 'CRITICAL').length },
  { key: 'HIGH',     label: 'High',     count: MOCK_VIOLATIONS.filter(v => v.severity === 'HIGH').length },
  { key: 'MEDIUM',   label: 'Medium',   count: MOCK_VIOLATIONS.filter(v => v.severity === 'MEDIUM').length },
  { key: 'LOW',      label: 'Low',      count: MOCK_VIOLATIONS.filter(v => v.severity === 'LOW').length },
];

export default function ViolationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [violations, setViolations] = useState(MOCK_VIOLATIONS);

  const filtered = activeTab === 'all'
    ? violations
    : violations.filter(v => v.severity === (activeTab as Severity));

  const handleResolve = (id: string) =>
    setViolations(prev => prev.map(v => v.violation_id === id ? { ...v, status: 'resolved' as const } : v));

  const handleDispute = (id: string) =>
    setViolations(prev => prev.map(v => v.violation_id === id ? { ...v, status: 'disputed' as const } : v));

  const handleFalsePositive = (id: string) =>
    setViolations(prev => prev.map(v => v.violation_id === id ? { ...v, status: 'false_positive' as const } : v));

  return (
    <div className="space-y-12">
      <PageHeader
        title="Violations"
        subtitle="All detected unauthorized uses of your registered assets."
      />

      <FilterTabs tabs={ALL_TABS} active={activeTab} onChange={setActiveTab} />

      {filtered.length === 0 ? (
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
