'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Shield, FileText, CheckCircle, AlertTriangle, Loader2, Download, ExternalLink, FileCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';

interface DMCAPanelProps {
  violationId: string;
  dmcaStatus?: string;
  dmcaNoticeId?: string;
  evidenceStatus?: string;
  evidenceBundleUrl?: string;
  evidenceSha256?: string;
}

export function DMCAPanel({ violationId, dmcaStatus, dmcaNoticeId, evidenceStatus, evidenceBundleUrl, evidenceSha256 }: DMCAPanelProps) {
  const router = useRouter();
  const [eligibility, setEligibility] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [generatingEvidence, setGeneratingEvidence] = useState(false);
  const [localEvidenceUrl, setLocalEvidenceUrl] = useState(evidenceBundleUrl || null);
  const [localEvidenceSha, setLocalEvidenceSha] = useState(evidenceSha256 || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkEligibility() {
      try {
        const res = await fetch(`/api/dmca/eligibility?violationId=${violationId}`);
        const data = await res.json();
        setEligibility(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load DMCA eligibility');
      } finally {
        setLoading(false);
      }
    }
    checkEligibility();
  }, [violationId]);

  const handleGenerateEvidence = async () => {
    setGeneratingEvidence(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ violationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evidence generation failed');
      setLocalEvidenceUrl(data.bundleUrl);
      setLocalEvidenceSha(data.sha256);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingEvidence(false);
    }
  };

  const handleDraft = async () => {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch('/api/dmca/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ violationId })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to draft');
      
      router.push(`/dmca/${data.noticeId}`);
    } catch (err: any) {
      setError(err.message);
      setDrafting(false);
    }
  };

  if (loading) return (
    <div className="bento-card p-8 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-brand-muted" />
    </div>
  );

  if (dmcaNoticeId && dmcaStatus && dmcaStatus !== 'uninitiated') {
    return (
      <div className="bento-card p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">DMCA Notice Active</p>
            <p className="text-xs text-indigo-700 dark:text-indigo-400">Current Status: {dmcaStatus.replace('_', ' ')}</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/dmca/${dmcaNoticeId}`)} variant="outline" className="border-indigo-200 text-indigo-900 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/50">
          View Notice Details
        </Button>
      </div>
    );
  }

  const isEligible = eligibility?.eligible;
  const needsOnboarding = eligibility?.blocked_by?.includes('missing_attestation');
  const hasEvidence = !!(localEvidenceUrl || evidenceStatus === 'generated');
  const evidenceUrl = localEvidenceUrl || evidenceBundleUrl;

  return (
    <div className="bento-card p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-brand-border pb-4">
        <Shield className="w-5 h-5 text-brand-text" />
        <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">DMCA Takedown Module</h3>
      </div>

      {/* ── Evidence Bundle Section ── */}
      {isEligible && (
        <div className="bg-brand-surface p-4 rounded-xl border border-brand-border space-y-3">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-brand-text" />
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Forensic Evidence Bundle</p>
          </div>

          {hasEvidence ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Evidence bundle generated</span>
              </div>
              {localEvidenceSha && (
                <p className="text-[10px] text-brand-muted font-mono truncate" title={localEvidenceSha || evidenceSha256 || ''}>
                  SHA-256: {(localEvidenceSha || evidenceSha256 || '').slice(0, 24)}…
                </p>
              )}
              <div className="flex gap-2">
                {evidenceUrl && (
                  <a
                    href={evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-accent hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View Evidence Bundle (PDF)
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-brand-muted">
                Generate a forensically sound PDF containing visual evidence, WARC capture, and AI analysis for legal review.
              </p>
              <Button
                onClick={handleGenerateEvidence}
                disabled={generatingEvidence}
                variant="outline"
                className="w-full flex justify-center gap-2 text-xs"
              >
                {generatingEvidence ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating Evidence Bundle...</>
                ) : (
                  <><Download className="w-4 h-4" /> Generate Evidence Bundle</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
           <p className="text-xs text-brand-muted leading-relaxed">
             Generate a legally compliant DMCA § 512(c)(3) takedown notice using DeepTrace Forensic AI. The system will automatically resolve the host agent and draft the factual evidence.
           </p>

           {error && (
             <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded text-xs">
               Error: {error}
             </div>
           )}

           {isEligible ? (
             <Button 
                onClick={handleDraft} 
                disabled={drafting || (!hasEvidence)}
                className="w-full flex justify-center gap-2"
                title={!hasEvidence ? 'Generate an Evidence Bundle first' : undefined}
             >
                {drafting ? <><Loader2 className="w-4 h-4 animate-spin" /> Drafting Notice...</> : <><FileText className="w-4 h-4" /> Draft Takedown Notice</>}
             </Button>
           ) : needsOnboarding ? (
             <div className="space-y-3">
               <p className="text-xs text-amber-600 font-medium">You must complete your legal profile before generating notices.</p>
               <Button onClick={() => router.push('/onboarding')} className="w-full">Complete DMCA Onboarding</Button>
             </div>
           ) : (
             <Button disabled className="w-full opacity-50 grayscale">Violation Not Eligible</Button>
           )}

           {isEligible && !hasEvidence && (
             <p className="text-[10px] text-amber-500 text-center">⚠ Evidence bundle required before drafting a notice</p>
           )}
        </div>

        <div className="bg-brand-surface p-4 rounded-xl border border-brand-border space-y-3">
           <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Eligibility Criteria</p>
           <ul className="space-y-2">
             <li className="flex justify-between text-xs">
               <span className="text-brand-muted">Unauthorized Verdict</span>
               {eligibility?.blocked_by?.includes('verdict_not_unauthorized') ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
             </li>
             <li className="flex justify-between text-xs">
               <span className="text-brand-muted">High Reliability (≥ 80%)</span>
               {eligibility?.blocked_by?.includes('reliability_too_low') ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
             </li>
             <li className="flex justify-between text-xs">
               <span className="text-brand-muted">Severity (High/Critical)</span>
               {eligibility?.blocked_by?.includes('severity_too_low') ? <AlertTriangle className="w-4 h-4 text-red-400" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
             </li>
             <li className="flex justify-between text-xs">
               <span className="text-brand-muted">Legal Attestation Signed</span>
               {needsOnboarding ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
             </li>
             {eligibility?.blocked_by?.includes('contradictions_present') && (
               <li className="flex justify-between text-xs">
                 <span className="text-brand-muted">No Contradictions</span>
                 <AlertTriangle className="w-4 h-4 text-red-400" />
               </li>
             )}
             {eligibility?.blocked_by?.includes('already_in_flight') && (
               <li className="flex justify-between text-xs">
                 <span className="text-brand-muted">Notice Not Active</span>
                 <AlertTriangle className="w-4 h-4 text-red-400" />
               </li>
             )}
           </ul>
        </div>
      </div>
    </div>
  );
}
