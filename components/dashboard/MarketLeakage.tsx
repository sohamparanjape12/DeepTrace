'use client';

import { Globe, AlertTriangle, ShieldCheck, Database } from 'lucide-react';
import { clsx } from 'clsx';

export interface RegionData {
  name: string;
  leakage: number;
  risk: string;
  color: string;
}

export function MarketLeakage({ regions }: { regions?: RegionData[] }) {
  const displayRegions = regions && regions.length > 0 ? regions : [];
  
  const unknownData = displayRegions.find(r => r.name === 'Unknown');
  const isDataPoor = unknownData && unknownData.leakage > 50;

  const highestRiskRegion = displayRegions.length > 0 
    ? displayRegions.reduce((prev, current) => (prev.leakage > current.leakage) ? prev : current)
    : null;

  return (
    <div className="bento-card p-8 space-y-6 flex flex-col justify-between h-full relative overflow-hidden">
      {/* Visual Background Globe Deco */}
      <div className="absolute -top-10 -right-10 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <Globe className="w-64 h-64" />
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Market Leakage</h3>
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Global Exposure Map</p>
        </div>
        <Globe className="w-4 h-4 text-brand-muted" />
      </div>

      <div className="space-y-5 relative z-10">
        {displayRegions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-brand-border rounded-xl">
            <ShieldCheck className="w-8 h-8 text-emerald-500/20 mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">No regional risk detected</p>
          </div>
        ) : (
          displayRegions.map((region) => (
            <div key={region.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-text">{region.name}</span>
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                    region.risk === 'High' ? "bg-red-500/10 text-red-500" : 
                    region.risk === 'Medium' ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {region.risk}
                  </span>
                  <span className="text-xs font-black text-brand-text tabular-nums">{region.leakage}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                <div 
                  className={clsx("h-full rounded-full transition-all duration-1000", region.color)} 
                  style={{ width: `${region.leakage}%` }} 
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="pt-4 border-t border-brand-border relative z-10">
        {isDataPoor ? (
          <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-3.5 h-3.5" />
              <p className="text-[10px] font-black uppercase tracking-widest">Poor Data Quality</p>
            </div>
            <p className="text-[10px] font-bold text-brand-muted leading-tight">
              {unknownData.leakage}% of detections are untracked. Enable <span className="text-brand-text">Advanced DNS Triage</span> to improve regional attribution.
            </p>
          </div>
        ) : highestRiskRegion ? (
          <p className="text-[10px] font-bold text-brand-muted leading-relaxed">
            Highest commercial leakage detected in <span className={clsx("font-black", highestRiskRegion.color.replace('bg-', 'text-'))}>{highestRiskRegion.name}</span>. Targeted enforcement recommended.
          </p>
        ) : (
          <div className="flex items-center gap-2 text-brand-muted">
            <Database className="w-3 h-3" />
            <p className="text-[10px] font-bold">Awaiting more forensic telemetry...</p>
          </div>
        )}
      </div>
    </div>
  );
}
