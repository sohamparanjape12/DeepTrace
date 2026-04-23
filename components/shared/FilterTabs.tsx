'use client';

import { clsx } from 'clsx';

interface FilterTab {
  key: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function FilterTabs({ tabs, active, onChange, className }: FilterTabsProps) {
  return (
    <div className={clsx('flex items-center gap-1 p-1 bg-brand-bg rounded-xl w-fit', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={clsx(
            'px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-2',
            active === tab.key
              ? 'bg-brand-surface text-brand-text shadow-soft'
              : 'text-brand-muted hover:text-brand-text',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={clsx(
              'inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black',
              active === tab.key ? 'bg-brand-bg text-brand-text' : 'bg-brand-border text-brand-muted',
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
