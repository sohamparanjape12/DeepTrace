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
    default: 'bg-zinc-100 text-zinc-900 border-zinc-200',
    error: 'bg-brand-red-muted text-brand-red-text border-brand-red-muted/50',
    success: 'bg-brand-green-muted text-brand-green-text border-brand-green-muted/50',
    info: 'bg-brand-blue-muted text-brand-blue-text border-brand-blue-muted/50',
    warning: 'bg-yellow-100 text-yellow-900 border-yellow-200',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
