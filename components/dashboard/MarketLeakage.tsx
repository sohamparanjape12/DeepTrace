'use client';

import { Globe } from 'lucide-react';

export interface RegionData {
  name: string;
  leakage: number;
  risk: string;
  color: string;
}

export function MarketLeakage({ regions }: { regions?: RegionData[] }) {
  const displayRegions = regions && regions.length > 0 ? regions : [
    { name: 'Western Europe', leakage: 0, risk: 'Low', color: 'bg-zinc-400' },
  ];

  const highestRiskRegion = displayRegions.reduce((prev, current) => 
    (prev.leakage > current.leakage) ? prev : current
  );

  return (
    <div className="bento-card p-8 space-y-6 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Market Leakage</h3>
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Global Exposure by Region</p>
        </div>
        <Globe className="w-4 h-4 text-brand-muted" />
      </div>

      <div className="space-y-5">
        {displayRegions.map((region) => (
          <div key={region.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-text">{region.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-brand-muted">{region.risk}</span>
                <span className="text-xs font-black text-brand-text">{region.leakage}%</span>
              </div>
            </div>
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${region.color} rounded-full transition-all duration-1000`} 
                style={{ width: `${region.leakage}%` }} 
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-brand-border">
        {highestRiskRegion.leakage > 0 ? (
          <p className="text-[10px] font-bold text-brand-muted leading-relaxed">
            Highest commercial leakage detected in <span className={highestRiskRegion.color.replace('bg-', 'text-')}>{highestRiskRegion.name}</span> based on live detection data.
          </p>
        ) : (
          <p className="text-[10px] font-bold text-brand-muted leading-relaxed">
            No significant leakage detected currently.
          </p>
        )}
      </div>
    </div>
  );
}
