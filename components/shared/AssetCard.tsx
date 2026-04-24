import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { SeverityChip } from './SeverityChip';
import type { Asset } from '@/types';

interface AssetCardProps {
  asset: Asset;
  className?: string;
  onClick?: () => void;
}

const scanStatusConfig = {
  pending:          { label: 'Pending',           variant: 'default' as const },
  scanning:         { label: 'Scanning…',         variant: 'info'    as const },
  clean:            { label: 'Clean',             variant: 'success' as const },
  violations_found: { label: 'Violations Found',  variant: 'error'   as const },
};

const rightsTierLabels: Record<string, string> = {
  editorial:   'Editorial',
  commercial:  'Commercial',
  all_rights:  'All Rights',
  no_reuse:    'No Reuse',
};

export function AssetCard({ asset, className, onClick }: AssetCardProps) {
  const statusCfg = scanStatusConfig[asset.scan_status] ?? scanStatusConfig.pending;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bento-card group cursor-pointer overflow-hidden',
        className,
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-brand-bg overflow-hidden">
        {asset.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={asset.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-brand-muted font-display font-black text-3xl uppercase tracking-tight opacity-30">
              {asset.name.slice(0, 2)}
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>
        {asset.scan_status === 'scanning' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-border">
            <div className="h-full bg-brand-accent animate-[scan_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display font-bold text-sm uppercase tracking-tight text-brand-text line-clamp-1 flex-1">
            {asset.name}
          </p>
          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-widest whitespace-nowrap">
            {rightsTierLabels[asset.rights_tier] ?? asset.rights_tier}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-brand-muted font-medium">
            {new Date(asset.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          {asset.tags?.length > 0 && (
            <p className="text-[10px] text-brand-muted font-semibold uppercase tracking-wider truncate max-w-[120px]">
              {asset.tags.join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
