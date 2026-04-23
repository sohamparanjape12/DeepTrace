import { Badge } from '@/components/ui/Badge';
import { ScanStatus } from '@/types';

interface StatusBadgeProps {
  status: ScanStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const configs: Record<ScanStatus, { label: string; variant: 'default' | 'accent' | 'muted' | 'outline' }> = {
    pending: { label: 'Pending', variant: 'default' },
    scanning: { label: 'Scanning', variant: 'info' },
    clean: { label: 'Clean', variant: 'success' },
    violations_found: { label: 'Violations Found', variant: 'error' },
  };

  const { label, variant } = configs[status];

  return <Badge variant={variant as any}>{label}</Badge>;
}
