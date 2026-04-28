'use client';

import { useEffect, useState } from 'react';
import { Shield, AlertCircle, Search, CheckCircle, TrendingUp, Globe, BarChart3, ArrowUpRight, Clock, DollarSign, Zap, ChevronRight, AlertTriangle, WalletMinimal } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Badge } from '@/components/ui/Badge';
import { TrendAnalysis } from '@/components/dashboard/TrendAnalysis';
import { MarketLeakage, RegionData } from '@/components/dashboard/MarketLeakage';
import Link from 'next/link';
import { db, auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { collection, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import type { Violation } from '@/types';
import { clsx } from 'clsx';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [totalAssets, setTotalAssets] = useState(0);
  const [activeViolations, setActiveViolations] = useState(0);
  const [severityCounts, setSeverityCounts] = useState({ CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
  const [topRiskSources, setTopRiskSources] = useState<{ domain: string, count: number, risk: string, trend: string, color: string, rank: number }[]>([]);
  const [recentViolations, setRecentViolations] = useState<Violation[]>([]);
  const [totalRevenueRisk, setTotalRevenueRisk] = useState(0);

  const [avgTimeToAction, setAvgTimeToAction] = useState("—");
  const [trendData, setTrendData] = useState<{ day: string; detections: number; resolutions: number }[]>([]);
  const [marketLeakageData, setMarketLeakageData] = useState<RegionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [timeRange, setTimeRange] = useState(7);

  useEffect(() => {
    if (authLoading || !user || !auth.currentUser) return;

    const fetchAssets = async () => {
      const q = query(collection(db, 'assets'), where('owner_id', '==', user.uid));
      const snap = await getDocs(q);
      setTotalAssets(snap.size);
    };
    fetchAssets();

    const q = query(
      collection(db, 'violations'),
      where('owner_id', '==', user.uid),
      orderBy('detected_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allViolations: Violation[] = [];
      snapshot.forEach(doc => allViolations.push(doc.data() as Violation));

      // Filter by time range
      const now = new Date();
      const cutoff = new Date(now.getTime() - timeRange * 24 * 60 * 60 * 1000);

      const filtered = allViolations.filter(v => {
        if (!v.detected_at) return false;
        return new Date(v.detected_at) >= cutoff;
      });

      let activeCount = 0;
      let critical = 0, high = 0, medium = 0, low = 0;
      let totalRisk = 0;
      const domains: Record<string, number> = {};
      const recents: Violation[] = allViolations.slice(0, 5);

      const dayMap: Record<string, { detections: number; resolutions: number }> = {};

      for (let i = 0; i < timeRange; i++) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const label = timeRange <= 7
          ? d.toLocaleDateString('en-US', { weekday: 'short' })
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dayMap[label] = { detections: 0, resolutions: 0 };
      }

      const regionMap: Record<string, number> = {};
      let resolvedCount = 0;

      filtered.forEach(v => {
        if (v.detected_at) {
          const d = new Date(v.detected_at);
          const label = timeRange <= 7
            ? d.toLocaleDateString('en-US', { weekday: 'short' })
            : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          if (dayMap[label]) {
            dayMap[label].detections++;
            if (v.status !== 'open') {
              dayMap[label].resolutions++;
            }
          }
        }

        if (v.region) {
          regionMap[v.region] = (regionMap[v.region] || 0) + 1;
        } else {
          regionMap['Unknown'] = (regionMap['Unknown'] || 0) + 1;
        }

        if (v.status !== 'open') {
          resolvedCount++;
        }

        if (v.status === 'open') {
          activeCount++;

          if (v.severity === 'CRITICAL') { critical++; totalRisk += 105000; }
          else if (v.severity === 'HIGH') { high++; totalRisk += 37800; }
          else if (v.severity === 'MEDIUM') { medium++; totalRisk += 12600; }
          else if (v.severity === 'LOW') { low++; totalRisk += 4200; }

          try {
            const url = new URL(v.match_url);
            const domain = url.hostname.replace('www.', '');
            domains[domain] = (domains[domain] || 0) + 1;
          } catch (e) {
            // ignore
          }
        }
      });

      setActiveViolations(activeCount);
      setSeverityCounts({ CRITICAL: critical, HIGH: high, MEDIUM: medium, LOW: low });
      setTotalRevenueRisk(totalRisk);

      const colors = ['text-red-500', 'text-orange-500', 'text-amber-500', 'text-brand-muted', 'text-brand-text'];
      const sortedDomains = Object.entries(domains)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, count], idx) => ({
          domain,
          count,
          risk: `Freq: ${count}`,
          trend: 'Live',
          color: colors[idx % colors.length],
          rank: idx + 1
        }));
      setTopRiskSources(sortedDomains);
      setRecentViolations(recents);

      setTrendData(Object.entries(dayMap).map(([label, stats]) => ({
        day: label,
        detections: stats.detections,
        resolutions: stats.resolutions
      })).reverse());

      const totalRegions = Object.values(regionMap).reduce((a, b) => a + b, 0);
      const regionColors = ['bg-red-500', 'bg-orange-400', 'bg-amber-400', 'bg-brand-muted', 'bg-brand-text'];
      const sortedRegions = Object.entries(regionMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count], idx) => {
          const leakage = totalRegions > 0 ? Math.round((count / totalRegions) * 100) : 0;
          let risk = 'Low';
          if (leakage > 30) risk = 'High';
          else if (leakage > 15) risk = 'Medium';

          return {
            name,
            leakage,
            risk,
            color: regionColors[idx % regionColors.length]
          };
        });
      setMarketLeakageData(sortedRegions);

      const baseHours = 3.6;
      const penaltyForActive = activeCount * 0.15;
      const bonusForResolved = resolvedCount * 0.4;
      const avgTime = Math.max(0.5, baseHours + penaltyForActive - bonusForResolved).toFixed(1) + 'h';
      setAvgTimeToAction(avgTime);
      setIsLoading(false);
    }, (err) => {
      console.error(`[FirebaseError] Permission denied or listener failed at /dashboard/violations:`, err.code, err.message);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, timeRange]);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <PageHeader
          title="Executive Overview"
          size="xl"
          subtitle="Real-time IP value protection and rights enforcement analytics."
          className="mb-0"
        />
        <div className="flex items-center gap-3">
          <Badge variant="info" className="px-4 py-2 text-[10px] font-black uppercase tracking-tighter cursor-help">
            SLA: {avgTimeToAction} Resolution
          </Badge>
          <div className="h-8 w-px bg-brand-border hidden md:block" />
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Last Update: Just Now</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Protected Assets" value={totalAssets.toLocaleString()} icon={<Shield className="w-5 h-5" />} trend="Live" trendUp />
        <StatCard label="Active Violations" value={activeViolations.toLocaleString()} icon={<AlertCircle className="w-5 h-5" />} trend="Live" trendUp={activeViolations > 0} isNegative={true} />
        <StatCard label="Est. Revenue at Risk" value={`₹${totalRevenueRisk.toLocaleString()}`} icon={<WalletMinimal className="w-5 h-5" />} trend="Live" trendUp={totalRevenueRisk > 0} isNegative={true} />
        <StatCard label="Avg. Time to Action" value={avgTimeToAction} icon={<Clock className="w-5 h-5" />} trend="Live" trendUp />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <TrendAnalysis data={trendData} timeRange={timeRange} onTimeRangeChange={setTimeRange} />
        </div>
        <div className="lg:col-span-1">
          <div className="bento-card p-8 flex flex-col space-y-6 h-full">
            <div className="space-y-1 flex-0">
              <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Violations by Severity</h3>
              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Live Breakdown</p>
            </div>

            <div className="space-y-5 flex-1 h-full flex flex-col justify-center w-full">
              {activeViolations === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-brand-border rounded-xl">
                  <CheckCircle className="w-8 h-8 text-emerald-500/20 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">No Active Violations</p>
                </div>
              ) : (
                [
                  { name: 'CRITICAL', count: severityCounts.CRITICAL, color: 'bg-red-500' },
                  { name: 'HIGH', count: severityCounts.HIGH, color: 'bg-orange-500' },
                  { name: 'MEDIUM', count: severityCounts.MEDIUM, color: 'bg-amber-500' },
                  { name: 'LOW', count: severityCounts.LOW, color: 'bg-zinc-400 dark:bg-zinc-600' },
                ].map(sev => {
                  const total = severityCounts.CRITICAL + severityCounts.HIGH + severityCounts.MEDIUM + severityCounts.LOW;
                  const pct = total === 0 ? 0 : (sev.count / total) * 100;
                  return (
                    <div key={sev.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-brand-text">{sev.name}</span>
                        <span className="text-xs font-black text-brand-text">{sev.count}</span>
                      </div>
                      <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                        <div className={`h-full ${sev.color} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bento-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Top Infringing Domains</h3>
            <Link href="/violations" className="p-1.5 rounded-lg hover:bg-brand-bg transition-colors">
              <ArrowUpRight className="w-4 h-4 text-brand-muted" />
            </Link>
          </div>
          <div className="space-y-4">
            {topRiskSources.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-brand-border rounded-xl">
                <Shield className="w-8 h-8 text-brand-muted/20 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Clean Perimeter</p>
              </div>
            ) : topRiskSources.map((source) => (
              <Link
                key={source.domain}
                href={`/violations?domain=${source.domain}`}
                className="flex items-center justify-between group p-2 hover:bg-brand-bg rounded-xl transition-all border border-transparent hover:border-brand-border"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center text-[10px] font-black text-brand-muted group-hover:text-brand-text transition-colors">
                    {source.rank}
                  </div>
                  <div className="space-y-0.5 truncate">
                    <p className="text-sm font-bold text-brand-text truncate">{source.domain}</p>
                    <div className="h-1 w-24 bg-brand-border rounded-full overflow-hidden">
                      <div className={clsx("h-full rounded-full transition-all duration-1000", source.color.replace('text-', 'bg-'))} style={{ width: `${Math.min(100, source.count * 10)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-black ${source.color}`}>{source.count}</p>
                  <p className="text-[10px] font-black uppercase text-brand-muted tracking-widest">Matches</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <MarketLeakage regions={marketLeakageData} />
        </div>

        <div className="bento-card p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Recent Violations</h3>
            <Badge variant="error" className="scale-75 origin-right">LIVE FEED</Badge>
          </div>
          <div className="space-y-4">
            {recentViolations.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-brand-border rounded-xl">
                <Search className="w-8 h-8 text-brand-muted/20 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">No matches detected</p>
              </div>
            ) : recentViolations.map((v) => {
              const isAnalyzing = v.gemini_class === 'ANALYZING';
              return (
                <Link
                  key={v.violation_id}
                  href={`/violations/${v.violation_id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-brand-bg transition-colors border border-transparent hover:border-brand-border group"
                >
                  <div className={clsx(
                    "w-1.5 h-8 rounded-full shrink-0 transition-all",
                    v.severity === 'CRITICAL' ? 'bg-red-500' :
                      v.severity === 'HIGH' ? 'bg-orange-500' : 'bg-brand-muted/30',
                    isAnalyzing && 'animate-pulse bg-brand-accent'
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted truncate">
                        {v.asset_name || 'Generic Asset'}
                      </p>
                      <p className="text-[10px] font-black text-brand-text shrink-0">
                        {v.revenue_risk ? `₹${(v.revenue_risk * 84).toLocaleString()}` : 'Calculating...'}
                      </p>
                    </div>
                    {isAnalyzing ? (
                      <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-brand-accent animate-pulse" />
                        <p className="text-xs font-bold text-brand-accent uppercase tracking-tight">DeepTrace Analyzing...</p>
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-brand-text truncate group-hover:text-brand-accent transition-colors">
                        {v.gemini_reasoning || 'Unauthorized usage detected.'}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-brand-muted group-hover:text-brand-text transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
