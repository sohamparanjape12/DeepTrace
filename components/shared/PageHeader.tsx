import { clsx } from 'clsx';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={clsx('flex flex-col gap-6 mb-12', className)}>
      <div className="space-y-4 max-w-5xl">
        <h1 className="text-6xl md:text-8xl font-display tracking-tight text-brand-text" style={{ lineHeight: '0.9' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-brand-muted text-xl md:text-2xl max-w-[45ch] leading-relaxed font-sans font-medium">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-4 pt-4">{actions}</div>}
    </div>
  );
}
