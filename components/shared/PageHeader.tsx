import { clsx } from 'clsx';
import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Controls the visual weight of the heading */
  size?: 'xl' | 'lg' | 'md' | 'sm';
  className?: string;
}

const sizeMap = {
  // Landing / dashboard hero
  xl: {
    heading: 'text-5xl md:text-7xl',
    subtitle: 'text-lg md:text-xl',
    gap: 'mb-10',
  },
  // Section headings
  lg: {
    heading: 'text-3xl md:text-5xl',
    subtitle: 'text-base md:text-lg',
    gap: 'mb-8',
  },
  // Sub-section / detail pages
  md: {
    heading: 'text-2xl md:text-3xl',
    subtitle: 'text-sm md:text-base',
    gap: 'mb-6',
  },
  // Compact header inside cards or toolbars
  sm: {
    heading: 'text-lg md:text-xl',
    subtitle: 'text-xs md:text-sm',
    gap: 'mb-4',
  },
};

export function PageHeader({
  title,
  subtitle,
  actions,
  size = 'lg',
  className,
}: PageHeaderProps) {
  const s = sizeMap[size];

  return (
    <div className={clsx('flex flex-col gap-3', s.gap, className)}>
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2 flex-1 min-w-0">
          <h1
            className={clsx(
              'font-display font-black tracking-tight text-brand-text leading-[1.1] pb-1',
              s.heading,
            )}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={clsx(
                'text-brand-muted leading-relaxed font-medium max-w-[60ch]',
                s.subtitle,
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0 pt-1">{actions}</div>
        )}
      </div>
    </div>
  );
}
