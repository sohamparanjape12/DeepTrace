'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Calendar, Globe, Cpu, CheckCircle, Shield, Trash2, Loader2, RotateCcw } from 'lucide-react';
import { SeverityChip } from '@/components/shared/SeverityChip';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';
import type { Violation } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { TriageActions } from './TriageActions';
import { ReliabilityRing } from '@/components/shared/ReliabilityRing';
import { ExplainabilityList } from '@/components/shared/ExplainabilityList';
import { ContradictionBanner } from '@/components/shared/ContradictionBanner';
import { Badge } from '@/components/ui/Badge';
import { DMCAPanel } from './dmca-panel';
import { useRouter } from 'next/navigation';

const classConfig: Record<string, { label: string; classes: string }> = {
  UNAUTHORIZED: { label: 'Unauthorized', classes: 'text-brand-red-text bg-brand-red-muted border-brand-red-text/20' },
  EDITORIAL_FAIR_USE: { label: 'Editorial Fair Use', classes: 'text-brand-amber-text bg-brand-amber-muted border-brand-amber-text/20' },
  NEEDS_REVIEW: { label: 'Needs Review', classes: 'text-brand-blue-text bg-brand-blue-muted border-brand-blue-text/20' },
  AUTHORIZED: { label: 'Authorized', classes: 'text-brand-green-text bg-brand-green-muted border-brand-green-text/20' },
};

const matchTypeLabels: Record<string, string> = {
  full_match: 'Full Match',
  partial_match: 'Partial Match',
  visually_similar: 'Visually Similar',
};

export default function ViolationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const fromAsset = searchParams.get('fromAsset');
  const { user, loading: authLoading } = useAuth();
  const [violation, setViolation] = useState<Violation | null>(null);
  const [asset, setAsset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRescanning, setIsRescanning] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const dmcaRef = useRef<HTMLDivElement>(null);
  const action = searchParams.get('action');
  const router = useRouter();

  useEffect(() => {
    if (action === 'dmca' && !isLoading && violation) {
      setTimeout(() => {
        dmcaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }
  }, [action, isLoading, violation]);

  useEffect(() => {
    // Auth State Check: Ensure auth is fully loaded and user is confirmed before executing Firestore calls
    if (authLoading || !user || !id || !auth.currentUser) return;

    async function fetchData() {
      try {
        const vDoc = await getDoc(doc(db, 'violations', id));
        if (!vDoc.exists()) {
          setIsLoading(false);
          return;
        }

        const data = { ...vDoc.data(), violation_id: vDoc.id } as Violation;
        if (data.owner_id !== user!.uid) {
          setIsUnauthorized(true);
          setIsLoading(false);
          return;
        }

        setViolation(data);

        // Fetch original asset
        if (data.asset_id) {
          const aDoc = await getDoc(doc(db, 'assets', data.asset_id));
          if (aDoc.exists()) {
            setAsset(aDoc.data());
          }
        }
      } catch (err: any) {
        console.error(`[FirebaseError] Permission denied or fetch failed at /violations/${id} or associated asset for user ${user?.uid}:`, err.code, err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id, user, authLoading]);

  const handleDelete = async () => {
    if (!id || !user) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'violations', id));
      router.push(fromAsset ? `/assets/${fromAsset}` : '/violations');
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete violation');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRescan = async () => {
    if (!id || isRescanning) return;
    setIsRescanning(true);
    try {
      const res = await fetch(`/api/process-violation/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error('Rescan failed');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to trigger re-audit');
    } finally {
      setIsRescanning(false);
    }
  };

  if (isLoading) return <div className="p-12 animate-pulse space-y-8">
    <div className="h-10 w-48 bg-brand-border rounded-lg" />
    <div className="h-96 bg-brand-border rounded-2xl" />
  </div>;

  if (isUnauthorized) return (
    <div className="flex flex-col items-center justify-center py-32 text-center gap-6">
      <Shield className="w-16 h-16 text-red-500 opacity-20" />
      <h2 className="text-3xl font-display font-black uppercase tracking-tighter italic">Access Denied</h2>
      <p className="text-brand-muted max-w-md">You do not have permission to view this violation. Isolation protocols are active.</p>
      <Link href="/violations">
        <Button>Return to Violations</Button>
      </Link>
    </div>
  );

  if (!violation) return (
    <div className="py-32 text-center space-y-4">
      <h2 className="text-3xl font-display font-black uppercase">Violation Not Found</h2>
      <Link href="/violations"><Button variant="ghost">Back to violations</Button></Link>
    </div>
  );

  const cls = classConfig[violation.gemini_class] || classConfig.NEEDS_REVIEW;

  const humanizeWeightKey = (key: string) => {
    const map: Record<string, string> = {
      'Gate_similarity_value': 'Perceptual Similarity',
      'Gate_similarity_used': 'Gate Validation',
      'visual_match_score': 'Visual Match',
      'contextual_match_score': 'Context Alignment',
      'relevancy': 'Relevancy',
      'confidence': 'Confidence'
    };
    return map[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-12 w-full pb-24">
      {/* Back & Status Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4">
          <Link href={fromAsset ? `/assets/${fromAsset}` : "/violations"}>
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-3.5 h-3.5" /> {fromAsset ? "Back to Asset" : "Violations"}
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <SeverityChip severity={violation.severity} />
            <span className={clsx('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border', cls.classes)}>
              {cls.label}
            </span>
            {violation.status !== 'open' && (
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted border border-brand-border px-2.5 py-1 rounded-full capitalize">
                {violation.status.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRescan}
            disabled={isRescanning}
            className="text-brand-muted hover:text-brand-text transition-all group"
          >
            {isRescanning ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RotateCcw className="w-3.5 h-3.5 mr-2 group-hover:rotate-180 transition-transform duration-500" />}
            Re-audit Violation
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowConfirmDelete(true)}
            className="text-brand-muted hover:text-brand-red-text transition-all group"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2 group-hover:scale-110 transition-transform" />
            Delete
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
              <h2 className="text-xl font-display font-black uppercase tracking-tight text-brand-text">Purge Record?</h2>
              <p className="text-sm text-brand-muted leading-relaxed">
                This will permanently remove this violation record from the forensic registry. This action cannot be reversed.
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

      {/* ── Side-by-Side Comparison ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Original Asset</p>
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-brand-bg border-2 border-brand-border relative group">
            {asset?.storageUrl ? (
              <img src={asset.storageUrl} alt="Original" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-muted font-bold uppercase text-[10px]">No Reference Image</div>
            )}
            <div className="absolute top-4 left-4">
              <Badge className="bg-white/90 text-neutral-950 backdrop-blur-md border-none shadow-sm">Reference</Badge>
            </div>
          </div>
        </div>

        {/* Suspect */}
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Suspected Infringement</p>
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-brand-bg border-2 border-brand-text relative group shadow-soft-xl">
            <img
              src={violation.match_image_url || (violation as any).assetThumbnailUrl}
              alt="Match"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as any).src = "https://placehold.co/800x600?text=Suspect+Image+Inaccessible";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
              <a href={violation.match_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white text-xs font-bold hover:underline">
                <ExternalLink className="w-4 h-4" /> View Source
              </a>
            </div>
            <div className="absolute top-4 right-4">
              <Badge variant="error" className="animate-pulse shadow-lg">Suspect</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* ── Metadata Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-brand-border bento-card p-0 overflow-hidden">
        {[
          { icon: Calendar, label: 'Detected', value: new Date(violation.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
          { icon: Globe, label: 'Match Type', value: matchTypeLabels[violation.match_type] || violation.match_type },
          { icon: Globe, label: 'Source Domain', value: (() => { try { return new URL(violation.match_url).hostname; } catch { return '—'; } })() },
          { icon: Cpu, label: 'Audit Model', value: 'Forensic-1 (Stable)' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="p-6 space-y-1">
            <p className="text-meta flex items-center gap-1.5"><Icon className="w-3 h-3" />{label}</p>
            <p className="text-sm font-bold text-brand-text">{value}</p>
          </div>
        ))}
      </div>
      {/* ── Triage Control Center ── */}
      <section className="bento-card overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_2fr] items-stretch">
          {/* Audit Context */}
          <div className="p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-8 bg-brand-surface/30">
            <div className="space-y-2">
              <p className="text-meta">Audit Verdict</p>
              <Badge className={clsx("w-fit px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border", cls.classes)}>
                {cls.label}
              </Badge>
            </div>

            <div className="h-8 w-px bg-brand-border hidden sm:block" />

            <div className="space-y-2">
              <p className="text-meta">Forensic Recommendation</p>
              <div className="flex items-center gap-2">
                {violation.recommended_action === 'escalate' && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-brand-red-muted text-brand-red-text border border-brand-red-text/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red-text animate-pulse" />
                    Escalate Violation
                  </span>
                )}
                {violation.recommended_action === 'human_review' && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-brand-blue-muted text-brand-blue-text border border-brand-blue-text/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-blue-text" />
                    Manual Review
                  </span>
                )}
                {(!violation.recommended_action || violation.recommended_action === 'monitor' || violation.recommended_action === 'no_action') && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-brand-bg text-brand-muted border border-brand-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-muted/40" />
                    Monitor
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Decision Actions */}
          <div className="p-6 md:p-8 flex items-center justify-start lg:justify-center border-t lg:border-t-0 lg:border-l border-brand-border bg-brand-surface w-full">
            <TriageActions violation={violation} onUpdate={(v: Violation) => setViolation(v)} />
          </div>
        </div>
      </section>

      <DMCAPanel
        violationId={violation.violation_id}
        violationStatus={violation.status}
        dmcaStatus={(violation as any).dmca_status}
        dmcaNoticeId={(violation as any).dmca_notice_id}
        evidenceStatus={violation.evidence_status}
        evidenceBundleUrl={violation.evidence_bundle_url}
        evidenceSha256={violation.evidence_sha256}
        evidenceWarcUrl={violation.evidence_warc_url}
        evidenceWaybackUrl={(violation as any).evidence_wayback_url}
      />

      {/* ── Reliability and Scoring ── */}
      <div className="bento-card p-8 space-y-10">
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
          <ReliabilityRing score={violation.reliability_score || 0} tier={violation.reliability_tier || 'LOW'} />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black uppercase text-xl tracking-tighter">Evidence Reliability</h3>
            </div>
            <p className="text-xs text-brand-muted leading-relaxed max-w-xl">
              The Reliability Scoring Engine (RSE) calculates the statistical likelihood of infringement using
              an adaptive weighted model of visual similarity, context, and domain source.
            </p>
          </div>
        </div>

        {/* Breakdown Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 pt-4">
          <div className="space-y-6">
            <p className="text-meta">Core Axes</p>
            {[
              { label: 'Relevancy', score: violation.relevancy ?? 0, color: 'var(--brand-blue-text)' },
              { label: 'Confidence', score: violation.confidence ?? 0, color: 'var(--brand-text)' },
            ].map(({ label, score, color }) => (
              <div key={label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">{label}</span>
                  <span className="text-[10px] font-black text-brand-text">{(score * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${score * 100}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <p className="text-meta">Evidence Weight</p>
            {[
              { label: 'Visual Match', score: violation.visual_match_score ?? 0, color: 'var(--brand-text)' },
              { label: 'Context Match', score: violation.contextual_match_score ?? 0, color: 'var(--brand-muted)' },
            ].map(({ label, score, color }) => (
              <div key={label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">{label}</span>
                  <span className="text-[10px] font-black text-brand-text">{(score * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${score * 100}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Forensic Audit Trail ── */}
      <div className="bento-card p-8 space-y-6">
        <h3 className="font-display font-black uppercase text-sm tracking-tight border-b border-brand-border pb-4">Forensic Audit Trail</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <ExplainabilityList bullets={violation.explainability_bullets || []} />
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-brand-bg border border-brand-border rounded-xl space-y-3">
              <p className="text-meta">Adaptive Weights Applied</p>
              <div className="space-y-2">
                {Object.entries(violation.applied_weights || {}).map(([factor, weight]) => (
                  <div key={factor} className="flex justify-between text-[10px] font-bold">
                    <span className="text-brand-muted">{humanizeWeightKey(factor)}</span>
                    <span className="text-brand-text">{(weight * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Evidence Reasoning ── */}
      <div className="bento-card p-8 space-y-6">
        <h3 className="font-display font-black uppercase text-sm tracking-tight border-b border-brand-border pb-4">Analyst Reasoning</h3>
        <div className="bg-brand-bg border border-brand-border p-6 rounded-xl space-y-4">
          {(violation.gemini_reasoning || '').split(/Step \d+:/).filter(Boolean).map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-brand-border text-brand-text flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</div>
              <p className="text-sm font-medium text-brand-text leading-relaxed font-sans">{step.trim()}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <div className="w-2 h-2 rounded-full bg-brand-muted" />
          <p className="text-meta">Powered by DeepTrace Forensic Content Auditor</p>
        </div>
      </div>

      {/* ── Brand Safety & Sentiment ── */}
      <div className="bento-card p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Brand Impact Analysis</h3>
            <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Reputation & Safety Audit</p>
          </div>
          <div className="flex items-center gap-6">
            {/* Sentiment */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted mb-1.5">Sentiment</span>
              <div className={clsx(
                "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border transition-all",
                violation.sentiment === 'positive' ? "bg-brand-green-muted text-brand-green-text border-brand-green-text/20" :
                  violation.sentiment === 'negative' ? "bg-brand-red-muted text-brand-red-text border-brand-red-text/20" :
                    "bg-brand-bg text-brand-muted border-brand-border"
              )}>
                {violation.sentiment || 'neutral'}
              </div>
            </div>
            {/* Risk */}
            <div className="flex flex-col items-end">
              <span className="text-meta mb-1.5">Risk Profile</span>
              <div className={clsx(
                "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border transition-all",
                violation.brand_safety_risk === 'safe' ? "bg-brand-green-muted text-brand-green-text border-brand-green-text/20" :
                  ['high', 'critical'].includes(violation.brand_safety_risk || '') ? "bg-brand-red-muted text-brand-red-text border-brand-red-text/20 animate-pulse" :
                    "bg-brand-blue-muted text-brand-blue-text border-brand-blue-text/20"
              )}>
                {violation.brand_safety_risk || 'safe'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Analysis Description */}
          <div className="md:col-span-2 p-6 bg-brand-surface border border-brand-border rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-text/5" />
            <div className="space-y-4">
              <p className="text-sm font-medium text-brand-text leading-relaxed font-sans">
                This forensic audit analyzes the tonal context surrounding the usage. Negative sentiment or low brand safety scores indicate placements that could actively damage the owner's reputation or violate corporate ethics guidelines.
              </p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Real-time Semantic Extraction Active</p>
              </div>
            </div>
          </div>

          {/* Risk Factors List */}
          <div className="space-y-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-muted px-1">Detected Risk Factors</p>
            <div className="flex flex-wrap gap-2">
              {violation.risk_factors && violation.risk_factors.length > 0 ? (
                violation.risk_factors.map(risk => (
                  <span key={risk} className="px-3 py-1.5 rounded-md bg-brand-red-muted text-brand-red-text border border-brand-red-text/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red-text/60" />
                    {risk.replace('_', ' ')}
                  </span>
                ))
              ) : (
                <div className="w-full p-4 rounded-xl border border-dashed border-brand-border flex items-center gap-3 bg-brand-bg">
                  <CheckCircle className="w-4 h-4 text-brand-green-text/40" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                    No risk factors detected
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Extracted Signals ── */}
      <div className="bento-card p-8 space-y-6">
        <h3 className="font-display font-black uppercase text-sm tracking-tight border-b border-brand-border pb-4">Extracted Signals</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Commercial Intent', active: violation.commercial_signal, dot: 'bg-brand-blue-text', activeBg: 'bg-brand-blue-muted border-brand-blue-text/20' },
            { label: 'Derivative Work', active: violation.is_derivative_work, dot: 'bg-brand-red-text', activeBg: 'bg-brand-red-muted border-brand-red-text/20' },
            { label: 'Domain Conflict', active: violation.domain_class !== 'unknown' && violation.domain_class !== 'benign', dot: 'bg-brand-red-text', activeBg: 'bg-brand-red-muted border-brand-red-text/20' },
          ].map(signal => (
            <div key={signal.label} className={clsx(
              "p-4 rounded-xl border flex items-center gap-3 transition-all",
              signal.active ? signal.activeBg : "bg-brand-surface border-brand-border opacity-50"
            )}>
              <div className={clsx("w-2 h-2 rounded-full shrink-0", signal.active ? signal.dot : "bg-brand-border")} />
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">{signal.label}</span>
              {signal.active && <CheckCircle className="w-3.5 h-3.5 text-brand-text/20 ml-auto" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
