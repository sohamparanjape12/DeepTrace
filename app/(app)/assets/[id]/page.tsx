"use client"
import React from 'react';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Calendar, Tag, Scan, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ViolationCard } from '@/components/shared/ViolationCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { Asset, Violation } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { db, auth } from '@/lib/firebase';
import { doc, collection, query, where, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { PipelineProgress } from '@/components/shared/PipelineProgress';
import { useRef } from 'react';
import { isTerminalViolation } from '@/lib/firestore-schema';
import clsx from 'clsx';

const scanStatusConfig = {
  pending: { label: 'Pending', variant: 'default' as const },
  scanning: { label: 'Scanning…', variant: 'info' as const },
  clean: { label: 'Clean', variant: 'success' as const },
  violations_found: { label: 'Violations Found', variant: 'error' as const },
};

const rightsTierLabels: Record<string, string> = {
  editorial: 'Editorial',
  commercial: 'Commercial',
  all_rights: 'All Rights Reserved',
  no_reuse: 'No Reuse',
};

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [asset, setAsset] = useState<(Asset & { last_scanned_at?: string }) | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [filters, setFilters] = useState({ severity: 'all', status: 'all' });
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const router = useRouter();

  // Listeners refs to prevent permission errors on delete
  const unsubscribeAsset = useRef<Unsubscribe | null>(null);
  const unsubscribeViolations = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    // Auth State Check: Ensure auth is fully loaded before starting listeners
    if (authLoading || !user || !id || !auth.currentUser) return;

    // 2. Subscribe to Asset
    unsubscribeAsset.current = onSnapshot(doc(db, 'assets', id), (snap) => {
      if (!snap.exists()) {
        setIsLoading(false);
        return;
      }
      const data = snap.data() as Asset;
      if (data.owner_id !== user.uid) {
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }
      setAsset(data);
      setIsLoading(false);

      // 3. Trigger resume ONLY if it's explicitly in scanning state
      if (data.scan_status === 'scanning' || data.scan_status === 'violations_found') {
        fetch(`/api/resume/${id}`, { method: 'POST' }).catch(err => console.error('[Client] Resume trigger failed:', err));
      }
    }, (err) => {
      console.error(`[FirebaseError] Permission denied or listener failed at /assets/${id} for user ${user.uid}:`, err.code, err.message);
      setIsLoading(false);
    });

    // 3. Subscribe to Violations
    const vQuery = query(
      collection(db, 'violations'),
      where('asset_id', '==', id),
      where('owner_id', '==', user?.uid),
      orderBy('detected_at', sortOrder)
    );
    unsubscribeViolations.current = onSnapshot(vQuery, (snap) => {
      setViolations(snap.docs.map(d => d.data() as Violation).filter(v => (v.stage as string) !== 'ignored'));
    }, (err) => {
      console.error(`[FirebaseError] Permission denied or listener failed at /violations (asset:${id}) for user ${user.uid}:`, err.code, err.message);
    });

    // 4. Subscribe to Scans
    const sQuery = query(
      collection(db, 'scans'),
      where('asset_id', '==', id),
      orderBy('timestamp', 'desc')
    );
    const unsubscribeScans = onSnapshot(sQuery, (snap) => {
      setScans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn(`[Firebase] Scans collection listener failed or empty (asset:${id}):`, err.message);
    });

    return () => {
      unsubscribeAsset.current?.();
      unsubscribeViolations.current?.();
      unsubscribeScans();
    };
  }, [id, user, sortOrder, authLoading]);

  if (isLoading) return (
    <div className="p-12 animate-pulse space-y-8">
      <div className="h-10 w-64 bg-zinc-100 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 aspect-video bg-zinc-100 rounded-xl" />
        <div className="lg:col-span-2 h-64 bg-zinc-100 rounded-xl" />
      </div>
    </div>
  );

  if (isUnauthorized) return (
    <div className="flex flex-col items-center justify-center py-32 text-center gap-6">
      <Shield className="w-16 h-16 text-brand-red-text opacity-50" />
      <h2 className="text-3xl font-display font-black uppercase tracking-tighter italic text-brand-text">Access Denied</h2>
      <p className="text-brand-muted max-w-md">You do not have permission to view this asset. Isolation protocols are active.</p>
      <Link href="/assets">
        <Button>Return to Library</Button>
      </Link>
    </div>
  );

  if (!asset) return (
    <div className="py-32 text-center space-y-4">
      <h2 className="text-3xl font-display font-black uppercase">Asset Not Found</h2>
      <Link href="/assets"><Button variant="ghost">Back to Library</Button></Link>
    </div>
  );

  const handleDelete = async () => {
    if (!user || !id) return;

    // Kill listeners immediately to prevent permission errors when doc disappears
    unsubscribeAsset.current?.();
    unsubscribeViolations.current?.();

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (!res.ok) throw new Error('Failed to delete asset');
      router.push('/assets');
    } catch (e) {
      console.error(e);
      setIsDeleting(false);
      setShowConfirmDelete(false);
      alert('Failed to delete asset');
    }
  };

  const statusCfg = scanStatusConfig[asset?.scan_status ?? 'pending'] || scanStatusConfig['pending'];

  const filteredViolations = violations.filter(v => {
    if (filters.severity !== 'all' && v.severity !== filters.severity) return false;
    if (filters.status !== 'all' && v.status !== filters.status) return false;
    return true;
  });

  return (
    <div className="space-y-8 pb-24">
      {/* ── Asset Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <Link href="/assets" className="inline-flex items-center gap-2 text-meta hover:text-brand-text transition-colors group">
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
            Library
          </Link>
          <div className="space-y-1">
            <p className="text-meta">Forensic Asset Audit</p>
            <h1 className="font-display font-black uppercase text-3xl md:text-4xl tracking-tighter text-brand-text leading-tight">
              {asset?.name || 'Asset Audit'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowConfirmDelete(true)}
            className="text-brand-muted hover:text-brand-red-text transition-all group"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform" />
            Delete Asset
          </Button>
        </div>
      </div>

      {/* Deletion Overlay */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/80 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bento-card p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-brand-red-muted flex items-center justify-center mx-auto text-brand-red-text">
              <Trash2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-display font-black uppercase tracking-tight text-brand-text">Purge Asset?</h2>
              <p className="text-sm text-brand-muted leading-relaxed">
                This will permanently remove <span className="font-bold text-brand-text">"{asset.name}"</span> and all associated forensic evidence. This action cannot be reversed.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-brand-red-text hover:opacity-90 text-white border-transparent"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Purge'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Progress — shown while active, stays visible briefly on complete */}
      {asset.stage && asset.stage !== 'uploaded' && asset.scan_status !== 'pending' && (
        <PipelineProgress asset={asset} />
      )}

      {/* Pending Context Alert */}
      {asset.scan_status === 'pending' && (
        <div className="bento-card p-6 bg-brand-amber-muted border-brand-amber-text/10 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-5 text-center md:text-left">
            <div className="p-4 rounded-xl bg-brand-amber-text/5 text-brand-amber-text shrink-0">
              <Scan className="w-7 h-7 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-display font-black uppercase tracking-tight text-brand-amber-text">Action Required: Calibrate Forensic Pipeline</h3>
              <p className="text-xs text-brand-muted leading-relaxed max-w-lg">
                This asset is missing critical ownership context. Provide rights metadata to enable authorized domain filtering and RSE v2 logic.
              </p>
            </div>
          </div>
          <Link href="/assets/upload" className="w-full md:w-auto">
            <Button className="w-full md:w-auto bg-brand-amber-text hover:opacity-90 text-white border-transparent flex items-center gap-2 group">
              Complete Calibration <Scan className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            </Button>
          </Link>
        </div>
      )}

      {/* Asset Hero & Meta Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
        {/* Thumbnail Workspace */}
        <div className="aspect-[2/1] md:aspect-[3/1] lg:aspect-auto lg:h-full rounded-2xl overflow-hidden bg-brand-bg border border-brand-border relative group shadow-sm min-h-[300px]">
          {asset.thumbnailUrl ? (
            <img
              src={asset.thumbnailUrl}
              alt={asset.name}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-1000 ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-brand-muted/20 font-display font-black text-4xl uppercase tracking-widest">
                Audit
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
          <div className="absolute bottom-8 left-8">
            <Badge variant={statusCfg.variant} className="px-4 py-2 border-2 shadow-lg">{statusCfg.label}</Badge>
          </div>
        </div>

        {/* Intelligence Sidepanel */}
        <div className="bento-card p-8 space-y-8 flex flex-col h-fit">
          <div className="space-y-1">
            <p className="text-meta">Forensic Identity</p>
            <h3 className="font-display font-black uppercase text-[10px] tracking-widest text-brand-muted">Asset Metadata Registry</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-meta mb-1">Organization</p>
                <p className="text-sm font-bold text-brand-text">{asset.owner_org}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-meta mb-1">Audit Initiated</p>
                <p className="text-sm font-bold text-brand-text">
                  {asset.uploaded_at ? new Date(asset.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Scan className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-meta mb-1">Pipeline Access</p>
                <p className="text-sm font-bold text-brand-text">
                  {asset.last_scanned_at ? new Date(asset.last_scanned_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Scan className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-meta mb-1">Rights Tier</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-brand-blue-text animate-pulse" />
                  <p className="text-xs font-black uppercase tracking-widest text-brand-blue-text">
                    {rightsTierLabels[asset.rights_tier || 'editorial'] || asset.rights_tier}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {asset.tags && asset.tags.length > 0 && (
            <div className="pt-6 border-t border-brand-border flex flex-wrap gap-2">
              {(asset.tags || []).map(t => (
                <span key={t} className="px-2.5 py-1 rounded-md bg-brand-bg border border-brand-border text-[9px] font-black uppercase tracking-widest text-brand-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scan History and Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Violations for this asset */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="font-display font-black uppercase text-xl text-brand-text">
            Violations <span className="opacity-40">({violations.length})</span>
          </h2>

          {/* ─── Filter Control Panel ─── */}
          <div className="flex flex-wrap items-center gap-6 bg-brand-surface border border-brand-border p-5 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-meta">Severity</span>
              <select
                className="bg-brand-bg border border-brand-border rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all cursor-pointer"
                value={filters.severity}
                onChange={(e) => setFilters(f => ({ ...f, severity: e.target.value }))}
              >
                <option value="all">All Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-meta">Status</span>
              <select
                className="bg-brand-bg border border-brand-border rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all cursor-pointer"
                value={filters.status}
                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-meta">Ordering</span>
              <select
                className="bg-brand-bg border border-brand-border rounded-md px-3 py-1.5 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all cursor-pointer text-right"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>

          {filteredViolations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-brand-border rounded-2xl gap-4">
              <p className="font-display font-black text-3xl text-brand-muted/30 uppercase">Clean</p>
              <p className="text-brand-muted text-sm">No violations detected for this asset.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredViolations.map(v => (
                <div key={v.violation_id} className="relative group">
                  <Link key={v.violation_id} href={`/violations/${v.violation_id}?fromAsset=${id}`}>
                    <ViolationCard
                      violation={v}
                      className="hover:shadow-soft-lg transition-shadow"
                      onDMCA={(id) => router.push(`/violations/${id}?action=dmca`)}
                      onViewDMCA={(noticeId) => router.push(`/dmca/${noticeId}`)}
                    />
                  </Link>
                  {v.stage === 'failed_retryable' && (
                    <div className="absolute top-4 right-16 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-brand-surface border-brand-border"
                        onClick={(e) => {
                          e.preventDefault();
                          fetch(`/api/process-violation/${v.violation_id}`, { method: 'POST' });
                        }}
                      >
                        Retry Audit
                      </Button>
                    </div>
                  )}
                  {v.stage === 'failed_permanent' && (
                    <div className="absolute top-4 right-16 flex gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-red-text bg-brand-red-muted border border-brand-red-text/10 px-2.5 py-1 rounded-md">Audit Halted</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scan Timeline */}
        <div className="space-y-6">
          <h2 className="font-display font-black uppercase text-xl text-brand-text">Scan History</h2>
          <div className="bento-card overflow-hidden divide-y divide-brand-border">
            {(() => {
              const displayScans = scans.length > 0 ? scans : [
                {
                  id: 'initial',
                  status: 'clean',
                  timestamp: asset.uploaded_at || new Date().toISOString(),
                  results: 'Initial Asset Ingestion'
                }
              ];

              return displayScans.map((scan) => {
                const date = scan.timestamp?.toDate ? scan.timestamp.toDate() : new Date(scan.timestamp);
                const isValid = !isNaN(date.getTime());

                return (
                  <div key={scan.id} className="p-4 flex gap-4 hover:bg-brand-surface transition-colors group">
                    <div className="mt-1 flex flex-col items-center">
                      <div className={clsx(
                        "w-2 h-2 rounded-full",
                        scan.status === 'clean' ? 'bg-brand-green-text' :
                          scan.status === 'scanning' ? 'bg-brand-blue-text animate-pulse' : 'bg-brand-red-text'
                      )} />
                      <div className="w-px flex-1 bg-brand-border my-1" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                          {isValid ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Pending'}
                        </p>
                        <Badge variant={scan.status === 'clean' ? 'success' : scan.status === 'scanning' ? 'info' : 'error'} className="scale-75 origin-right px-2 py-0.5">
                          {scan.status === 'clean' ? 'Clean' : scan.status === 'scanning' ? 'In Progress' : 'Alert'}
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-brand-text">{scan.results}</p>
                    </div>
                  </div>
                );
              });
            })()}
            <div className="p-4 bg-brand-surface border-t border-brand-border">
              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest text-center">Scan Frequency: Every 24 Hours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
