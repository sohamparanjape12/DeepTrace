import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon, trend, trendUp, className }: StatCardProps) {
  return (
    <div className={clsx(
      'bento-card p-8 flex flex-col justify-between gap-8 group',
      className,
    )}>
      <div className="flex items-start justify-between">
        {icon && (
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 group-hover:border-zinc-200 transition-colors text-brand-muted">
            {icon}
          </div>
        )}
        {trend && (
          <span className={clsx(
            'text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full',
            trendUp ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50',
          )}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-5xl font-display font-black tracking-tighter">{value}</p>
        <p className="text-meta">{label}</p>
      </div>
    </div>
  );
}
