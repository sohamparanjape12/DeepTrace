import { clsx } from 'clsx';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface SeverityChipProps {
  severity: Severity;
  className?: string;
}

const config: Record<Severity, { label: string; classes: string }> = {
  CRITICAL: { label: 'Critical', classes: 'bg-red-50 text-red-700 border-red-200 ring-red-500/20' },
  HIGH:     { label: 'High',     classes: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/20' },
  MEDIUM:   { label: 'Medium',   classes: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20' },
  LOW:      { label: 'Low',      classes: 'bg-zinc-50 text-zinc-500 border-zinc-200 ring-zinc-500/10' },
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
