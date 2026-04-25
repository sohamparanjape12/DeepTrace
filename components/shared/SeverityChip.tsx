import { clsx } from 'clsx';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'PENDING';

interface SeverityChipProps {
  severity: Severity;
  className?: string;
}

const config: Record<Severity, { label: string; classes: string }> = {
  CRITICAL: { label: 'Critical', classes: 'bg-brand-red-muted text-brand-red-text border-brand-red-text/20 ring-brand-red-text/10' },
  HIGH:     { label: 'High',     classes: 'bg-orange-500/10 text-orange-500 border-orange-500/20 ring-orange-500/10' },
  MEDIUM:   { label: 'Medium',   classes: 'bg-amber-500/10 text-amber-500 border-amber-500/20 ring-amber-500/10' },
  LOW:      { label: 'Low',      classes: 'bg-brand-bg text-brand-muted border-brand-border ring-brand-text/5' },
  PENDING:  { label: 'Pending',  classes: 'bg-zinc-100 text-zinc-500 border-zinc-200 ring-zinc-500/5 animate-pulse' },
};

export function SeverityChip({ severity, className }: SeverityChipProps) {
  const { label, classes } = config[severity];
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border ring-1',
      classes,
      className,
    )}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {label}
    </span>
  );
}
