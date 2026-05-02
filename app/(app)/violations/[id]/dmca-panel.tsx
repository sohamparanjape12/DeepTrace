'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Shield, FileText, CheckCircle, AlertTriangle, Loader2, Download, ExternalLink, FileCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';

interface DMCAPanelProps {
  violationId: string;
  violationStatus?: string;
  dmcaStatus?: string;
  dmcaNoticeId?: string;
  evidenceStatus?: string;
  evidenceBundleUrl?: string;
  evidenceSha256?: string;
  evidenceWarcUrl?: string;
  evidenceWaybackUrl?: string;
}

export function DMCAPanel({ violationId, violationStatus, dmcaStatus, dmcaNoticeId, evidenceStatus, evidenceBundleUrl, evidenceSha256, evidenceWarcUrl, evidenceWaybackUrl }: DMCAPanelProps) {
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
  }, [violationId, violationStatus]);

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

  // DEBUG: Monitor state changes in production
  useEffect(() => {
    console.log('[DMCAPanel] State:', { 
      violationId, 
      violationStatus, 
      isManualOverride: violationStatus === 'disputed',
      eligible: eligibility?.eligible,
      blocked: eligibility?.blocked_by
    });
  }, [violationId, violationStatus, eligibility]);

  if (loading) return (
    <div className="bento-card p-8 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-brand-muted" />
    </div>
  );

  const isManualOverride = violationStatus === 'disputed';
  const needsOnboarding = eligibility?.blocked_by?.includes('missing_attestation');
  
  // Now that the backend library handles the manual override, we primarily trust the eligibility flag.
  // We keep the client-side isManualOverride check for instant UI feedback if the fetch is still pending.
  const isEligible = eligibility?.eligible || (isManualOverride && (eligibility ? !needsOnboarding : true));
  
  const hasEvidence = !!(localEvidenceUrl || evidenceStatus === 'generated');
  const evidenceUrl = localEvidenceUrl || evidenceBundleUrl;

  const isActive = !!(dmcaNoticeId && dmcaStatus && dmcaStatus !== 'uninitiated' && dmcaStatus !== 'none');

  return (
    <div className="bento-card p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-brand-border pb-4">
        <Shield className="w-5 h-5 text-brand-text" />
        <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">DMCA Takedown Module</h3>
      </div>

      {isActive && (
        <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-900/50 rounded-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-indigo-500" />
            <div>
              <p className="text-sm font-bold text-indigo-900 dark:text-indigo-300">DMCA Notice Active</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-400">Current Status: {dmcaStatus?.replace('_', ' ')}</p>
            </div>
          </div>
          <Button onClick={() => router.push(`/dmca/${dmcaNoticeId}`)} variant="secondary" className="border-indigo-200 text-indigo-900 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/50">
            View Notice Details
          </Button>
        </div>
      )}

      {isManualOverride && !isActive && (
        <div className="p-3 bg-brand-amber-muted border border-brand-amber-text/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-brand-amber-text" />
          <p className="text-[10px] font-bold text-brand-amber-text uppercase tracking-wider">
            Manual Override Active — Eligibility criteria bypassed via dispute
          </p>
        </div>
      )}

      {/* ── Evidence Bundle Section ── */}
      {(isEligible || hasEvidence || isActive) && (
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
              {(localEvidenceSha || evidenceSha256) && (
                <p className="text-[10px] text-brand-muted font-mono truncate" title={localEvidenceSha || evidenceSha256 || ''}>
                  SHA-256: {(localEvidenceSha || evidenceSha256 || '').slice(0, 24)}…
                </p>
              )}
              <div className="flex flex-wrap gap-4 pt-1">
                {evidenceUrl && (
                  <a
                    href={`/api/evidence/download/${violationId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-accent hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View PDF Bundle
                  </a>
                )}
                {evidenceWaybackUrl && (
                  <a
                    href={evidenceWaybackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
                    title="View high-fidelity snapshot on Archive.org"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Archive.org Snapshot
                  </a>
                )}
                {evidenceWarcUrl && (
                  <>
                    <a
                      href={`https://replayweb.page/?source=${encodeURIComponent(evidenceWarcUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors"
                      title="View WARC archive in the browser via ReplayWeb.page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Raw WARC
                    </a>
                    <a
                      href={evidenceWarcUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-muted hover:text-brand-text transition-colors"
                      download
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download WARC
                    </a>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-brand-muted">
                Generate a forensically sound PDF containing visual evidence, WARC capture, and forensic analysis for legal review.
              </p>
              <Button
                onClick={handleGenerateEvidence}
                disabled={generatingEvidence}
                variant="secondary"
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

      {/* ── Actions Section ── */}
      {!isActive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
             <p className="text-xs text-brand-muted leading-relaxed">
               Generate a legally compliant DMCA § 512(c)(3) takedown notice using the DeepTrace Forensic Engine. The system will automatically resolve the host agent and draft the factual evidence.
             </p>

             {error && (
               <div className={clsx(
                 "p-4 rounded-xl text-xs border flex items-start gap-3 transition-all",
                 error.includes('high demand') || error.includes('503')
                   ? "bg-amber-50/50 text-amber-800 border-amber-200 dark:bg-amber-900/10 dark:text-amber-300 dark:border-amber-900/50"
                   : "bg-red-50/50 text-red-700 border-red-200 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/50"
               )}>
                 <AlertTriangle className={clsx("w-4 h-4 shrink-0 mt-0.5", error.includes('high demand') || error.includes('503') ? "text-amber-500" : "text-red-500")} />
                 <div className="space-y-1">
                   <p className="font-display font-black uppercase tracking-widest text-[9px]">
                     {error.includes('high demand') || error.includes('503') ? 'Forensic Engine Overloaded' : 'Action Failed'}
                   </p>
                   <p className="opacity-90 font-medium leading-relaxed">
                     {error.includes('high demand') || error.includes('503')
                       ? "Our AI models are currently experiencing high demand. This is usually temporary—please wait 30 seconds and try again."
                       : error}
                   </p>
                 </div>
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
      )}
    </div>
  );
}
