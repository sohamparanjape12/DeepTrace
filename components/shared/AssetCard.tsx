import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { SeverityChip } from './SeverityChip';
import type { Asset } from '@/types';
import { Check, Clock, ShieldAlert, Zap, Globe, AlertCircle } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  className?: string;
  onClick?: () => void;
  onSelect?: (id: string, selected: boolean) => void;
  isSelected?: boolean;
}

const scanStatusConfig = {
  pending:          { label: 'Pending',           variant: 'default' as const, icon: Clock },
  scanning:         { label: 'Scanning…',         variant: 'info'    as const, icon: Zap },
  clean:            { label: 'Clean',             variant: 'success' as const, icon: Globe },
  violations_found: { label: 'Violations Found',  variant: 'error'   as const, icon: ShieldAlert },
};

const rightsTierStyles: Record<string, { label: string; className: string }> = {
  editorial:   { label: 'Editorial',   className: 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400' },
  commercial:  { label: 'Commercial',  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  all_rights:  { label: 'All Rights',  className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  no_reuse:    { label: 'No Reuse',    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

export function AssetCard({ asset, className, onClick, onSelect, isSelected }: AssetCardProps) {
  const statusCfg = scanStatusConfig[asset.scan_status || 'pending'] ?? scanStatusConfig.pending;
  const formatDate = (val: any) => {
    if (!val) return null;
    try {
      // Handle Firestore Timestamp objects
      const date = typeof val.toDate === 'function' ? val.toDate() : new Date(val);
      if (isNaN(date.getTime())) return null;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return null;
    }
  };

  const uploadedAt = formatDate(asset.uploaded_at);
  const stageUpdatedAt = formatDate(asset.stage_updated_at);
  
  const rightsCfg = rightsTierStyles[asset.rights_tier || 'editorial'] ?? { label: asset.rights_tier || 'Unknown', className: 'bg-brand-bg text-brand-muted' };
  const violationCount = asset.totals?.classified ?? asset.totals?.reverse_hits ?? 0;
  const hasViolations = asset.scan_status === 'violations_found' && violationCount > 0;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bento-card group cursor-pointer overflow-hidden transition-all duration-300 relative',
        isSelected ? 'ring-2 ring-brand-text border-transparent bg-brand-surface' : 'hover:border-brand-border',
        className,
      )}
    >
      {/* Bulk Select Checkbox */}
      <div 
        className={clsx(
          "absolute top-4 left-4 z-20 w-5 h-5 rounded-md border transition-all flex items-center justify-center",
          isSelected ? "bg-brand-text border-brand-text" : "bg-white/90 border-brand-border opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(asset.asset_id || asset.id, !isSelected);
        }}
      >
        {isSelected && <Check className="w-3 h-3 text-brand-bg stroke-[4]" />}
      </div>

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
              {asset.name?.slice(0, 2) || 'AS'}
            </span>
          </div>
        )}
        
        {/* Status Overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <Badge variant={statusCfg.variant} className="backdrop-blur-md bg-opacity-90 shadow-sm border-transparent py-1 px-2.5">
            <statusCfg.icon className="w-3 h-3 mr-1.5 inline-block" />
            {statusCfg.label}
          </Badge>
        </div>

        {asset.scan_status === 'scanning' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-border/20">
            <div className="h-full bg-brand-accent animate-[scan_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
          </div>
        )}
      </div>

      {/* Meta Content */}
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <p className="font-display font-black text-sm uppercase tracking-tight text-brand-text line-clamp-1">
              {asset.name}
            </p>
            <div className="flex items-center gap-2">
              <span className={clsx(
                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md transition-colors",
                rightsCfg.className
              )}>
                {rightsCfg.label}
              </span>
              <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest">
                {uploadedAt || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Forensic Metadata Row */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-border">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-brand-muted">
              <ShieldAlert className={clsx("w-3 h-3", hasViolations ? "text-red-500" : "text-brand-muted")} />
              <span className="text-[10px] font-black uppercase tracking-widest">Violations</span>
            </div>
            <p className={clsx("text-xs font-black", hasViolations ? "text-brand-text" : "text-brand-muted")}>
              {hasViolations ? violationCount : 'None Detected'}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-brand-muted">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">Last Sync</span>
            </div>
            <p className="text-xs font-black text-brand-text">
              {stageUpdatedAt || (asset.scan_status === 'pending' ? 'Pending' : '—')}
            </p>
          </div>
        </div>

        {/* Action Priority indicator if high severity */}
        {hasViolations && (
          <div className="flex items-center gap-2 p-2 bg-red-500/5 border border-red-500/10 rounded-lg">
            <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">High Severity Exposure Detected</p>
          </div>
        )}
      </div>
    </div>
  );
}
