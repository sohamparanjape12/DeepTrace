'use client';

import { Shield, AlertCircle, Search, CheckCircle, TrendingUp, Globe, BarChart3, ArrowUpRight, Clock, DollarSign, Zap } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { SeverityChip } from '@/components/shared/SeverityChip';
import { Badge } from '@/components/ui/Badge';
import { TrendAnalysis } from '@/components/dashboard/TrendAnalysis';
import { MarketLeakage } from '@/components/dashboard/MarketLeakage';
import { RightsDistribution } from '@/components/dashboard/RightsDistribution';
import Link from 'next/link';
import type { Violation } from '@/types';

const recentViolations: Violation[] = [
  {
    violation_id: 'v1', asset_id: 'a1', asset_name: 'UCL Hero',
    detected_at: '2026-04-18T08:00:00Z', match_url: 'https://reddit.com/r/soccer/post/a1b2c3',
    match_type: 'full_match', gemini_class: 'UNAUTHORIZED', severity: 'CRITICAL', status: 'open',
    gemini_reasoning: 'Commercial usage without license on a monetized platform.',
    revenue_risk: 2500, estimated_reach: 45000, brand_sensitivity: 'high'
  },
  {
    violation_id: 'v3', asset_id: 'a1', asset_name: 'UCL Hero',
    detected_at: '2026-04-17T22:00:00Z', match_url: 'https://sportsblog.net/match-highlights',
    match_type: 'full_match', gemini_class: 'UNAUTHORIZED', severity: 'HIGH', status: 'open',
    gemini_reasoning: 'Unattributed repost on a sports aggregation site.',
    revenue_risk: 800, estimated_reach: 12000, brand_sensitivity: 'medium'
  },
  {
    violation_id: 'v4', asset_id: 'a3', asset_name: 'IPL 2026',
    detected_at: '2026-04-17T18:15:00Z', match_url: 'https://twitter.com/user/status/xyz',
    match_type: 'visually_similar', gemini_class: 'NEEDS_REVIEW', severity: 'MEDIUM', status: 'open',
    gemini_reasoning: 'Visually similar but context is ambiguous.',
    revenue_risk: 300, estimated_reach: 85000, brand_sensitivity: 'high'
  },
];

const topRiskSources = [
  { domain: 'reddit.com', risk: '$12.4k', reach: '1.2M', trend: '+12%', color: 'text-red-600' },
  { domain: 'twitter.com', risk: '$8.2k', reach: '5.4M', trend: '+8%', color: 'text-orange-500' },
  { domain: 'sportsblog.net', risk: '$4.1k', reach: '450k', trend: '-2%', color: 'text-amber-500' },
  { domain: 'instagram.com', risk: '$3.8k', reach: '8.1M', trend: '+15%', color: 'text-zinc-600' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <PageHeader
          title="Executive Overview"
          subtitle="Real-time IP value protection and rights enforcement analytics."
          className="mb-0"
        />
        <div className="flex items-center gap-3">
          <Badge variant="info" className="px-4 py-2 text-[10px] font-black uppercase tracking-tighter cursor-help">
            SLA: 4.2h Resolution
          </Badge>
          <div className="h-8 w-px bg-zinc-100 hidden md:block" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Last Update: Just Now</p>
        </div>
      </div>

      {/* Row 1: Core Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Rights Protected"
          value="1,284"
          icon={<Shield className="w-5 h-5" />}
          trend="+12%"
          trendUp
        />
        <StatCard
          label="Est. Revenue at Risk"
          value="$14,2k"
          icon={<DollarSign className="w-5 h-5" />}
          trend="+8%"
          trendUp={false}
          className="ring-1 ring-brand-accent/10"
        />
        <StatCard
          label="Resolution Rate"
          value="91.4%"
          icon={<Zap className="w-5 h-5" />}
          trend="+2.4%"
          trendUp
        />
        <StatCard
          label="Avg. Time to Action"
          value="4.2h"
          icon={<Clock className="w-5 h-5" />}
          trend="-15m"
          trendUp
        />
      </div>

      {/* Row 2: Deep Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <TrendAnalysis />
        </div>
        <div className="lg:col-span-1">
          <RightsDistribution />
        </div>
      </div>

      {/* Row 3: Exposure Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top Risk Sources */}
        <div className="bento-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Revenue-Risk Platforms</h3>
            <Link href="/violations" className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <ArrowUpRight className="w-4 h-4 text-brand-muted" />
            </Link>
          </div>
          <div className="space-y-4">
            {topRiskSources.map((source) => (
              <Link
                key={source.domain}
                href={`/violations?domain=${source.domain}`}
                className="flex items-center justify-between group p-1 transition-all"
              >
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-brand-text hover:text-brand-accent transition-colors">{source.domain}</p>
                  <p className="text-[10px] font-black uppercase text-brand-muted tracking-widest">{source.reach} Reach</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${source.color}`}>{source.risk}</p>
                  <p className="text-[10px] font-bold text-brand-muted tracking-widest">{source.trend}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <MarketLeakage />
        </div>

        {/* Action Priority Queue */}
        <div className="bento-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Priority Action Queue</h3>
            <Badge variant="error" className="scale-75 origin-right">ATTENTION REQUIRED</Badge>
          </div>
          <div className="space-y-4">
            {recentViolations.map((v) => (
              <Link
                key={v.violation_id}
                href={`/violations/${v.violation_id}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-brand-border"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${v.severity === 'CRITICAL' ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-widest text-brand-muted mb-0.5">
                    {v.asset_name} • ${v.revenue_risk} Risk
                  </p>
                  <p className="text-xs font-bold text-brand-text truncate">{v.gemini_reasoning}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-brand-muted shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

