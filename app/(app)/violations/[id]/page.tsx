'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Calendar, Globe, Cpu, CheckCircle, Shield } from 'lucide-react';
import { SeverityChip } from '@/components/shared/SeverityChip';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';
import type { Violation } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { TriageActions } from './TriageActions';
import { ReliabilityRing } from '@/components/shared/ReliabilityRing';
import { ExplainabilityList } from '@/components/shared/ExplainabilityList';
import { ContradictionBanner } from '@/components/shared/ContradictionBanner';

const classConfig: Record<string, { label: string; classes: string }> = {
  UNAUTHORIZED: { label: 'Unauthorized', classes: 'text-red-700 bg-red-50 border-red-200' },
  EDITORIAL_FAIR_USE: { label: 'Editorial Fair Use', classes: 'text-amber-700 bg-amber-50 border-amber-200' },
  NEEDS_REVIEW: { label: 'Needs Review', classes: 'text-blue-700 bg-blue-50 border-blue-200' },
  AUTHORIZED: { label: 'Authorized', classes: 'text-green-700 bg-green-50 border-green-200' },
};

const matchTypeLabels: Record<string, string> = {
  full_match: 'Full Match',
  partial_match: 'Partial Match',
  visually_similar: 'Visually Similar',
};

export default function ViolationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [violation, setViolation] = useState<Violation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    async function fetchViolation() {
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
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchViolation();
  }, [id, user]);

  if (isLoading) return <div className="p-12 animate-pulse space-y-8">
    <div className="h-10 w-48 bg-zinc-100 rounded-lg" />
    <div className="h-96 bg-zinc-100 rounded-2xl" />
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

  return (
    <div className="space-y-12 max-w-4xl">
      {/* Back */}
      <div className="flex items-center gap-4">
        <Link href="/violations">
          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Violations
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

      {/* Evidence: Matched Image */}
      <div className="bento-card overflow-hidden">
        <div className="aspect-video bg-zinc-100 relative overflow-hidden">
          {violation.assetThumbnailUrl ? (
            <img
              src={violation.assetThumbnailUrl}
              alt="Asset evidence"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="font-black text-2xl text-zinc-300">DEEPTRACE</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <a
              href={violation.match_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group w-fit"
            >
              <p className="text-white font-bold text-lg group-hover:underline break-all">{violation.match_url}</p>
              <ExternalLink className="w-4 h-4 text-white/70 group-hover:text-white transition-colors shrink-0" />
            </a>
          </div>
        </div>

        {/* Detection Metadata Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-brand-border border-t border-brand-border">
          {[
            { icon: Calendar, label: 'Detected', value: new Date(violation.detected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
            { icon: Globe, label: 'Match Type', value: matchTypeLabels[violation.match_type] || violation.match_type },
            { icon: Globe, label: 'Source Domain', value: (() => { try { return new URL(violation.match_url).hostname; } catch { return '—'; } })() },
            { icon: Cpu, label: 'Gemini Model', value: 'Gemini 3.1 Flash-Lite' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="p-6 space-y-1">
              <p className="text-meta flex items-center gap-1.5"><Icon className="w-3 h-3" />{label}</p>
              <p className="text-sm font-bold text-brand-text">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Page Context */}
      {violation.page_context && (
        <div className="bento-card p-8 space-y-4">
          <h3 className="font-display font-black uppercase text-sm tracking-tight">Page Context</h3>
          <p className="text-brand-muted font-medium leading-relaxed">{violation.page_context}</p>
        </div>
      )}

      {/* ── Reliability Score Hero ── */}
      <div className="bento-card p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-brand-border pb-4">
          <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Reliability Scoring Engine</h3>
          <div className="flex items-center gap-2">
            <div className={clsx('text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border', cls.classes)}>
              {cls.label}
            </div>
            {violation.recommended_action && (
              <span className={clsx(
                'text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border',
                violation.recommended_action === 'escalate' ? 'text-red-700 bg-red-50 border-red-200' :
                violation.recommended_action === 'human_review' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                'text-green-700 bg-green-50 border-green-200'
              )}>
                {violation.recommended_action === 'escalate' ? '⚡ ESCALATE' :
                 violation.recommended_action === 'human_review' ? '👁 Human Review' : '✓ Monitor'}
              </span>
            )}
          </div>
        </div>

        <ContradictionBanner show={!!(violation.contradiction_flag || violation.abstained)} />

        {/* Reliability Score + Confidence */}
        <div className="flex items-center gap-12">
          <ReliabilityRing score={violation.reliability_score ?? 0} tier={violation.reliability_tier ?? 'LOW'} />
          
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Domain Class:</span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-brand-text border border-zinc-200">
                {violation.domain_class || 'unknown'}
              </span>
            </div>
            <p className="text-xs text-brand-muted leading-relaxed max-w-xl">
              This reliability score represents the system's confidence in the evidence gathered. 
              The verdict is determined by an adaptive weighted analysis of visual similarity, 
              page context, and source credibility.
            </p>
          </div>
        </div>

        {/* Three-Axis Forensic Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 pt-4">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Scoring Axes</p>
            {[
              { label: 'Relevancy', score: violation.relevancy ?? 0, desc: 'Is this actually your image?', color: '#6366F1' },
              { label: 'Confidence', score: violation.confidence ?? 0, desc: 'How sure is the system?', color: '#8B5CF6' },
            ].map(({ label, score, desc, color }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">{label}</span>
                  <span className="text-[10px] font-black text-brand-text">{(score * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${score * 100}%`, backgroundColor: color }}
                  />
                </div>
                <p className="text-[10px] text-brand-muted italic">{desc}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Evidence Signals</p>
            {[
              { label: 'Visual Match', score: violation.visual_match_score ?? 0, color: '#0EA5E9' },
              { label: 'Context Match', score: violation.contextual_match_score ?? 0, color: '#F59E0B' },
            ].map(({ label, score, color }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">{label}</span>
                  <span className="text-[10px] font-black text-brand-text">{(score * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
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
            <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Adaptive Weights Applied</p>
              <div className="space-y-2">
                {Object.entries(violation.applied_weights || {}).map(([factor, weight]) => (
                  <div key={factor} className="flex justify-between text-[10px] font-bold">
                    <span className="capitalize text-brand-muted">{factor}</span>
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
        <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-xl">
          <p className="text-sm font-medium text-blue-900 leading-relaxed font-sans">{violation.gemini_reasoning}</p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <p className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Powered by Gemini Forensic Content Auditor</p>
        </div>
      </div>

      {/* ── Brand Safety & Sentiment ── */}
      <div className="bento-card p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-brand-border pb-4">
          <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Brand Safety & Sentiment</h3>
          <div className="flex items-center gap-2">
            <span className={clsx(
              'text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border',
              violation.sentiment === 'positive' ? 'text-green-700 bg-green-50 border-green-200' :
              violation.sentiment === 'negative' ? 'text-red-700 bg-red-50 border-red-200' :
              'text-zinc-700 bg-zinc-50 border-zinc-200'
            )}>
              Sentiment: {violation.sentiment || 'neutral'}
            </span>
            <span className={clsx(
              'text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border',
              violation.brand_safety_risk === 'safe' ? 'text-green-700 bg-green-50 border-green-200' :
              ['high', 'critical'].includes(violation.brand_safety_risk || '') ? 'text-red-700 bg-red-50 border-red-200 animate-pulse' :
              'text-amber-700 bg-amber-50 border-amber-200'
            )}>
              Risk: {violation.brand_safety_risk || 'safe'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted italic leading-relaxed">
              This audit analyzes the tonal context of the usage. Negative sentiment or low brand safety scores indicate usage that could actively damage the owner's reputation.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {violation.risk_factors && violation.risk_factors.length > 0 ? (
              violation.risk_factors.map(risk => (
                <span key={risk} className="px-2.5 py-1 rounded bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-widest">
                  ⚠ {risk.replace('_', ' ')}
                </span>
              ))
            ) : (
              <span className="px-2.5 py-1 rounded bg-green-50 text-green-600 border border-green-100 text-[10px] font-black uppercase tracking-widest">
                ✓ No specific risk factors detected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Extracted Signals ── */}
      <div className="bento-card p-8 space-y-6">
        <h3 className="font-display font-black uppercase text-sm tracking-tight border-b border-brand-border pb-4">Extracted Signals</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Commercial Intent', active: violation.commercial_signal, activeColor: 'bg-indigo-600', activeBg: 'bg-indigo-50 border-indigo-200' },
            { label: 'Derivative Work', active: violation.is_derivative_work, activeColor: 'bg-amber-500', activeBg: 'bg-amber-50 border-amber-200' },
            { label: 'Watermark Removed', active: violation.watermark_likely_removed, activeColor: 'bg-rose-600', activeBg: 'bg-rose-50 border-rose-200' },
            { label: 'Watermark Intact', active: violation.watermark_intact, activeColor: 'bg-green-600', activeBg: 'bg-green-50 border-green-200' },
            { label: 'Credit Present', active: violation.credit_present, activeColor: 'bg-green-600', activeBg: 'bg-green-50 border-green-200' },
          ].map(({ label, active, activeColor, activeBg }) => (
            <div key={label} className={clsx(
              'p-4 rounded-xl border flex flex-col justify-between gap-3',
              active ? activeBg : 'bg-zinc-50 border-zinc-100'
            )}>
              <span className="text-xs font-bold text-brand-text">{label}</span>
              <span className={clsx(
                'px-2 py-1 rounded font-black text-[9px] uppercase tracking-widest w-fit',
                active ? `${activeColor} text-white` : 'bg-zinc-200 text-zinc-500'
              )}>
                {active ? 'DETECTED' : 'NONE'}
              </span>
            </div>
          ))}
          {/* Context Type & Transformation Type */}
          {violation.context_type && (
            <div className="p-4 rounded-xl border bg-zinc-50 border-zinc-100 flex flex-col justify-between gap-3">
              <span className="text-xs font-bold text-brand-text">Context Type</span>
              <span className="px-2 py-1 rounded font-black text-[9px] uppercase tracking-widest w-fit bg-zinc-700 text-white">
                {violation.context_type}
              </span>
            </div>
          )}
          {violation.transformation_type && (
            <div className="p-4 rounded-xl border bg-zinc-50 border-zinc-100 flex flex-col justify-between gap-3">
              <span className="text-xs font-bold text-brand-text">Transformation</span>
              <span className="px-2 py-1 rounded font-black text-[9px] uppercase tracking-widest w-fit bg-zinc-700 text-white">
                {violation.transformation_type}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Triage Actions */}
      {violation.status === 'open' && (
        <div className="bento-card p-8 space-y-6">
          <h3 className="font-display font-black uppercase text-sm tracking-tight">Triage Action</h3>
          <TriageActions violationId={violation.violation_id} />
        </div>
      )}

      {violation.status !== 'open' && (
        <div className="flex items-center gap-3 bento-card px-8 py-5">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm font-bold text-brand-text capitalize">
            This violation has been marked as <span className="text-brand-accent">{violation.status.replace('_', ' ')}</span>.
          </p>
        </div>
      )}
    </div>
  );
}
