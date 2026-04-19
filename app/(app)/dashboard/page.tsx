'use client';

import { Shield, AlertCircle, Search, CheckCircle, TrendingUp, Globe, BarChart3, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { SeverityChip } from '@/components/shared/SeverityChip';
import { Badge } from '@/components/ui/Badge';
import type { Violation } from '@/types';
import Link from 'next/link';

const recentViolations: Violation[] = [
  { violation_id: 'v1', asset_id: 'a1', asset_name: 'UCL Hero', detected_at: '2026-04-18T08:00:00Z', match_url: 'https://reddit.com/r/soccer/post/a1b2c3', match_type: 'full_match', gemini_class: 'UNAUTHORIZED', severity: 'CRITICAL', status: 'open', gemini_reasoning: 'Commercial usage without license on a monetized platform.' },
  { violation_id: 'v2', asset_id: 'a2', asset_name: 'Wimbledon', detected_at: '2026-04-18T07:30:00Z', match_url: 'https://espn.com/news/article-2', match_type: 'partial_match', gemini_class: 'EDITORIAL_FAIR_USE', severity: 'LOW', status: 'open', gemini_reasoning: 'News reporting context; editorial fair use likely applies.' },
  { violation_id: 'v3', asset_id: 'a1', asset_name: 'UCL Hero', detected_at: '2026-04-17T22:00:00Z', match_url: 'https://sportsblog.net/match-highlights', match_type: 'full_match', gemini_class: 'UNAUTHORIZED', severity: 'HIGH', status: 'open', gemini_reasoning: 'Unattributed repost on a sports aggregation site.' },
  { violation_id: 'v4', asset_id: 'a3', asset_name: 'IPL 2026', detected_at: '2026-04-17T18:15:00Z', match_url: 'https://twitter.com/user/status/xyz', match_type: 'visually_similar', gemini_class: 'NEEDS_REVIEW', severity: 'MEDIUM', status: 'open', gemini_reasoning: 'Visually similar but context is ambiguous.' },
];

const topDomains = [
  { domain: 'reddit.com', count: 22, pct: 85 },
  { domain: 'twitter.com', count: 18, pct: 70 },
  { domain: 'sportsblog.net', count: 11, pct: 42 },
  { domain: 'instagram.com', count: 8, pct: 30 },
  { domain: 'tiktok.com', count: 5, pct: 19 },
];

const severityBars = [
  { label: 'Critical', count: 2, pct: 33, color: 'bg-red-500' },
  { label: 'High', count: 2, pct: 33, color: 'bg-orange-400' },
  { label: 'Medium', count: 1, pct: 17, color: 'bg-amber-400' },
  { label: 'Low', count: 1, pct: 17, color: 'bg-zinc-400' },
];

const classConfig = {
  UNAUTHORIZED: { label: 'Unauthorized', classes: 'text-red-600 bg-red-50' },
  EDITORIAL_FAIR_USE: { label: 'Fair Use', classes: 'text-amber-700 bg-amber-50' },
  NEEDS_REVIEW: { label: 'NEEDS REVIEW', classes: 'text-blue-600 bg-blue-50' },
  AUTHORIZED: { label: 'Authorized', classes: 'text-green-700 bg-green-50' },
};

export default function DashboardPage() {
  return (
    <div className="space-y-16">
      <PageHeader
        title="Dashboard"
        subtitle="Your real-time IP intelligence overview."
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Assets Registered" value="1,284" icon={<Shield className="w-5 h-5" />} trend="+12%" trendUp />
        <StatCard label="Active Violations" value="6" icon={<AlertCircle className="w-5 h-5" />} trend="+3" trendUp={false} />
        <StatCard label="Scans This Week" value="308" icon={<Search className="w-5 h-5" />} trend="+24%" trendUp />
        <StatCard label="Resolved" value="196" icon={<CheckCircle className="w-5 h-5" />} trend="91%" trendUp />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Violations by Severity — CSS bar chart */}
        <div className="bento-card p-8 col-span-1 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black uppercase text-sm tracking-tight text-white/90">Historical Stats</h3>
            <BarChart3 className="w-4 h-4 text-white/40" />
          </div>
          <div className="space-y-4">
            {severityBars.map(({ label, count, pct, color }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">{label}</span>
                  <span className="text-sm font-display font-black">{count}</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Infringing Domains */}
        <div className="bento-card p-8 col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black uppercase text-sm tracking-tight">Top Infringing Domains</h3>
            <Link href="/violations" className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <Globe className="w-4 h-4 text-brand-muted" />
            </Link>
          </div>
          <div className="space-y-3">
            {topDomains.map(({ domain, count, pct }, i) => (
              <Link key={domain} href={`/violations?domain=${domain}`} className="flex items-center gap-4 group/domain p-1 rounded-lg hover:bg-zinc-50 transition-colors">
                <span className="text-[10px] font-black text-brand-muted w-4">{i + 1}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-text group-hover/domain:text-brand-accent transition-colors">{domain}</span>
                    <span className="text-xs font-black text-brand-muted">{count} hits</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-text/20 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Violations Feed */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black uppercase text-xl">Recent Activity</h2>
          <a href="/violations" className="flex items-center gap-1.5 text-meta hover:text-brand-text transition-colors group">
            View All <ArrowUpRight className="w-3.5 h-3.5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
        <div className="space-y-px rounded-xl overflow-hidden border border-brand-border">
          {recentViolations.map((v) => {
            const cls = classConfig[v.gemini_class];
            const domain = (() => { try { return new URL(v.match_url).hostname; } catch { return v.match_url; } })();
            return (
              <div key={v.violation_id} className="bg-brand-surface p-6 flex items-center gap-6 hover:bg-zinc-50 transition-colors cursor-pointer border-b border-brand-border last:border-b-0">
                <SeverityChip severity={v.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-brand-text truncate">{domain}</p>
                  <p className="text-[11px] text-brand-muted font-medium mt-0.5 truncate">{v.gemini_reasoning}</p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${cls.classes}`}>{cls.label}</span>
                <span className="text-[11px] text-brand-muted shrink-0">
                  {new Date(v.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
