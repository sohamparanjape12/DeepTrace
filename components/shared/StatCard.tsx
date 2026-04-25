import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: string;
  trendUp?: boolean;
  isNegative?: boolean; // If true, Up = Red, Down = Green
  className?: string;
}

export function StatCard({ label, value, icon, trend, trendUp, isNegative, className }: StatCardProps) {
  const isRed = isNegative ? trendUp : !trendUp;
  const isUp = trendUp;

  return (
    <div className={clsx(
      'bento-card p-8 flex flex-col justify-between gap-8 group',
      className,
    )}>
      <div className="flex items-start justify-between">
        {icon && (
          <div className="p-3 rounded-xl bg-brand-bg border border-brand-border group-hover:border-brand-muted/30 transition-colors text-brand-muted">
            {icon}
          </div>
        )}
        {trend && (
          <span className={clsx(
            'text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full',
            isRed ? 'text-brand-red-text bg-brand-red-muted' : 'text-brand-green-text bg-brand-green-muted',
          )}>
            {isUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-5xl font-display font-black tracking-tighter text-brand-text">{value}</p>
        <p className="text-brand-muted">{label}</p>
      </div>
    </div>
  );
}
