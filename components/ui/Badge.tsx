import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'error' | 'success' | 'info' | 'warning';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-brand-bg text-brand-text border-brand-border',
    error: 'bg-brand-red-muted text-brand-red-text border-brand-red-text/20',
    success: 'bg-brand-green-muted text-brand-green-text border-brand-green-text/20',
    info: 'bg-brand-blue-muted text-brand-blue-text border-brand-blue-text/20',
    warning: 'bg-brand-amber-muted text-brand-amber-text border-brand-amber-text/20',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center w-full rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
