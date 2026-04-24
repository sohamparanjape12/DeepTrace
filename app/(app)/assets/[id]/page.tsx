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
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

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
  const { user } = useAuth();
  const [asset, setAsset] = useState<(Asset & { last_scanned_at?: string }) | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [scans, setScans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user || !id) return;

    async function fetchData() {
      try {
        const assetDoc = await getDoc(doc(db, 'assets', id));
        if (!assetDoc.exists()) {
          setIsLoading(false);
          return;
        }

        const data = assetDoc.data() as Asset;
        if (!user || data.owner_id !== user.uid) {
          setIsUnauthorized(true);
          setIsLoading(false);
          return;
        }

        setAsset(data);

        // Fetch violations
        const vQuery = query(
          collection(db, 'violations'),
          where('asset_id', '==', id),
          where('owner_id', '==', user?.uid)
        );
        const vSnap = await getDocs(vQuery);
        setViolations(vSnap.docs.map(d => d.data() as Violation));

        // Fetch scans (mocking for now as scan schema is complex, but filtered by user)
        // In real app, we would have a 'scans' collection
        setScans([]);

      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, user]);

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

  const statusCfg = scanStatusConfig[asset.scan_status];

  return (
    <div className="space-y-12">
      {/* Back + Title */}
      <div className="flex items-start gap-6">
        <Link href="/assets" className="mt-4 shrink-0">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Assets
          </Button>
        </Link>
        <PageHeader 
          title={asset.name} 
          variant="secondary" 
          className="mb-0 flex-1" 
          actions={
            showConfirmDelete ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                <span className="text-xs font-bold text-red-500 mr-2">Are you sure?</span>
                <Button variant="outline" size="sm" onClick={() => setShowConfirmDelete(false)} disabled={isDeleting}>Cancel</Button>
                <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting} className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700">
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delete'}
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setShowConfirmDelete(true)} className="text-brand-muted hover:text-red-500 hover:bg-red-50">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Asset
              </Button>
            )
          }
        />
      </div>

      {/* Asset Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Thumbnail */}
        <div className="lg:col-span-3 aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-brand-border relative group">
          {asset.thumbnailUrl ? (
            <img
              src={asset.thumbnailUrl}
              alt={asset.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-zinc-300 font-display font-black text-3xl uppercase tracking-tight">
                {asset.name.slice(0, 2)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6">
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          </div>
        </div>

        {/* Meta Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bento-card p-8 space-y-6">
            <h3 className="font-display font-black uppercase text-xs tracking-widest text-brand-muted">Asset Metadata</h3>
            <div className="space-y-5">
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
                  <p className="text-meta mb-1">Uploaded</p>
                  <p className="text-sm font-bold text-brand-text">
                    {new Date(asset.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Scan className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-meta mb-1">Last Scanned</p>
                  <p className="text-sm font-bold text-brand-text">
                    {asset.last_scanned_at ? new Date(asset.last_scanned_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Scan className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
                <div>
                  <p className="text-meta mb-1">Rights Tier</p>
                  <p className="text-sm font-bold text-brand-text">{rightsTierLabels[asset.rights_tier]}</p>
                </div>
              </div>
              {asset.tags?.length > 0 && (
                <div className="flex items-start gap-3">
                  <Tag className="w-4 h-4 text-brand-muted mt-0.5 shrink-0" />
                  <div>
                    <p className="text-meta mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {asset.tags.map(t => (
                        <span key={t} className="px-2.5 py-1 rounded-full bg-brand-bg border border-brand-border text-[10px] font-black uppercase tracking-widest text-brand-muted">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bento-card p-8 space-y-4">
            <h3 className="font-display font-black uppercase text-xs tracking-widest text-brand-muted">Scan Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-3xl font-display font-black text-brand-accent">
                  {violations.filter(v => v.status === 'open').length}
                </p>
                <p className="text-meta mt-1">Open</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-display font-black text-brand-text">
                  {violations.filter(v => v.severity === 'CRITICAL' && v.status === 'open').length}
                </p>
                <p className="text-meta mt-1">Critical</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-display font-black text-brand-green-text">
                  {violations.filter(v => v.status === 'resolved').length}
                </p>
                <p className="text-meta mt-1">Resolved</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scan History and Violations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Violations for this asset */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="font-display font-black uppercase text-xl text-brand-text">
            Violations <span className="opacity-40">({violations.length})</span>
          </h2>
          {violations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-brand-border rounded-2xl gap-4">
              <p className="font-display font-black text-3xl text-brand-muted/30 uppercase">Clean</p>
              <p className="text-brand-muted text-sm">No violations detected for this asset.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {violations.map(v => (
                <Link key={v.violation_id} href={`/violations/${v.violation_id}`} className="block">
                  <ViolationCard violation={v} className="hover:shadow-soft-lg transition-shadow" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Scan Timeline */}
        <div className="space-y-6">
          <h2 className="font-display font-black uppercase text-xl text-brand-text">Scan History</h2>
          <div className="bento-card overflow-hidden divide-y divide-brand-border">
            {scans.length === 0 ? (
              <div className="p-8 text-center text-meta uppercase tracking-widest">No scans recorded</div>
            ) : (
              scans.map((scan) => (
                <div key={scan.id} className="p-4 flex gap-4 hover:bg-brand-surface transition-colors group">
                  <div className="mt-1 flex flex-col items-center">
                    <div className={`w-2 h-2 rounded-full ${scan.status === 'clean' ? 'bg-brand-green-text' : 'bg-brand-accent'}`} />
                    <div className="w-px flex-1 bg-brand-border my-1" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                        {new Date(scan.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <Badge variant={scan.status === 'clean' ? 'success' : 'error'} className="scale-75 origin-right">
                        {scan.status === 'clean' ? 'Clean' : 'Alert'}
                      </Badge>
                    </div>
                    <p className="text-xs font-bold text-brand-text">{scan.results}</p>
                  </div>
                </div>
              ))
            )}
            <div className="p-4 bg-brand-surface border-t border-brand-border">
              <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest text-center">Scan Frequency: Every 24 Hours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
