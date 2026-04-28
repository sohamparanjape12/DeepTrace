'use client';

import { useState, useEffect, use } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { DMCANotice, NoticeDraft } from '@/lib/dmca/types';
import { ArrowLeft, ArrowRight, CheckCircle, Shield, FileText, Download, Send, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';

export default function DMCANoticeDetail({ params }: { params: Promise<{ noticeId: string }> }) {
  const { noticeId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notice, setNotice] = useState<DMCANotice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [edits, setEdits] = useState<NoticeDraft | null>(null);
  const [hostEdits, setHostEdits] = useState<{ domain: string; agent_name: string; agent_email: string } | null>(null);
  const [violation, setViolation] = useState<any>(null);
  const [generatingEvidence, setGeneratingEvidence] = useState(false);

  useEffect(() => {
    // Auth State Check: Confirm auth is fully loaded before executing query
    if (authLoading || !user || !noticeId || !auth.currentUser) return;

    async function fetchNotice() {
      try {
        const docSnap = await getDoc(doc(db, 'dmca_notices', noticeId));
        if (docSnap.exists()) {
          const data = docSnap.data() as DMCANotice;
          setNotice(data);
          setEdits(data.draft);
          setHostEdits({
            domain: data.host.domain,
            agent_name: data.host.agent_name || '',
            agent_email: data.host.agent_email || ''
          });

          // Fetch associated violation for evidence bundle
          if (data.violation_id) {
            const vSnap = await getDoc(doc(db, 'violations', data.violation_id));
            if (vSnap.exists()) {
              setViolation(vSnap.data());
            }
          }
        }
      } catch (error: any) {
        console.error(`[FirebaseError] Permission denied or fetch failed at /dmca_notices/${noticeId} for user ${user?.uid}:`, error.code, error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchNotice();
  }, [user, noticeId, authLoading]);

  if (loading) return <div className="p-12 animate-pulse"><div className="h-64 bg-brand-surface border border-brand-border rounded-2xl"></div></div>;

  if (!notice || !edits) return <div className="p-12 text-center text-sm font-bold text-brand-muted">Notice not found</div>;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await fetch('/api/dmca/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noticeId, edits, hostEdits, approverId: user?.uid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.refresh();
      // Refetch
      const docSnap = await getDoc(doc(db, 'dmca_notices', noticeId));
      if (docSnap.exists()) {
        const d = docSnap.data() as DMCANotice;
        setNotice(d);
        setEdits(d.draft);
        setHostEdits({
          domain: d.host.domain,
          agent_name: d.host.agent_name || '',
          agent_email: d.host.agent_email || ''
        });
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleGenerateEvidence = async () => {
    if (!notice?.violation_id) return;
    setGeneratingEvidence(true);
    try {
      const res = await fetch('/api/generate-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ violationId: notice.violation_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evidence generation failed');

      // Refetch violation
      const vSnap = await getDoc(doc(db, 'violations', notice.violation_id));
      if (vSnap.exists()) {
        setViolation(vSnap.data());
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGeneratingEvidence(false);
    }
  };

  const timelineSteps = [
    { status: 'drafting', label: 'Drafted' },
    { status: 'pending_review', label: 'Pending Review' },
    { status: 'sent', label: 'Dispatched' },
    { status: 'acknowledged', label: 'Acknowledged' },
    { status: 'removed', label: 'Removed' },
  ];

  const isActiveDraft = notice.status === 'drafting' || notice.status === 'pending_review';
  const isCounter = notice.status === 'counter_notice';

  return (
    <div className="space-y-12 pb-32 max-w-5xl">
      {/* Header Area */}
      <div className="space-y-6">
        <Link href="/dmca" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back to Directory
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <PageHeader
            title="Notice Detail"
            subtitle="Review and dispatch the auto-generated DMCA takedown notice."
          />
          <Badge className="font-mono text-[10px] uppercase tracking-widest px-3 py-1 bg-brand-surface w-fit">
            ID: {noticeId.split('-')[0]}
          </Badge>
        </div>
      </div>

      {/* Target Info & Links - Gapless Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-brand-border rounded-2xl overflow-hidden border border-brand-border">
        {/* Target Host */}
        <div className="bg-brand-bg p-8 md:p-10 flex flex-col justify-between md:col-span-2 relative group overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Shield className="w-32 h-32" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted mb-6 relative z-10">Target Host</p>
          <div className="relative z-10 space-y-2">
            <input
              value={hostEdits?.domain || ''}
              onChange={e => setHostEdits(prev => prev ? { ...prev, domain: e.target.value } : null)}
              disabled={!isActiveDraft}
              placeholder="example.com"
              className="w-full bg-transparent border-0 p-0 text-3xl md:text-4xl font-display font-black tracking-tight text-brand-text mb-1 focus:ring-0 placeholder:text-brand-muted/30"
            />
            <input
              value={hostEdits?.agent_name || ''}
              onChange={e => setHostEdits(prev => prev ? { ...prev, agent_name: e.target.value } : null)}
              disabled={!isActiveDraft}
              placeholder="Copyright Agent Name"
              className="w-full bg-transparent border-0 p-0 text-sm font-bold text-brand-muted focus:text-brand-text focus:ring-0 placeholder:text-brand-muted/30 transition-colors"
            />
            <input
              value={hostEdits?.agent_email || ''}
              onChange={e => setHostEdits(prev => prev ? { ...prev, agent_email: e.target.value } : null)}
              disabled={!isActiveDraft}
              placeholder="abuse@example.com"
              className="w-full bg-transparent border-0 p-0 text-sm font-mono text-brand-muted/70 focus:text-brand-text focus:ring-0 placeholder:text-brand-muted/30 transition-colors"
            />
          </div>
        </div>

        {/* References */}
        <div className="bg-brand-surface p-8 md:p-10 flex flex-col justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted mb-6">Reference</p>
          <div className="space-y-5">
            <Link href={`/violations/${notice.violation_id}`} className="group/link flex items-center justify-between text-sm font-bold text-brand-text">
              <span className="flex items-center gap-3"><Shield className="w-4 h-4 text-brand-muted group-hover/link:text-brand-text transition-colors" /> Violation Details</span>
              <ArrowRight className="w-3.5 h-3.5 -rotate-45 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform text-brand-muted" />
            </Link>
            {violation?.evidence_bundle_url && (
              <>
                <div className="h-px bg-brand-border w-full" />
                <a href={`/api/evidence/download/${notice.violation_id}`} target="_blank" rel="noopener noreferrer" className="group/link flex items-center justify-between text-sm font-bold text-brand-text">
                  <span className="flex items-center gap-3"><FileText className="w-4 h-4 text-brand-muted group-hover/link:text-brand-text transition-colors" /> Forensic Bundle (PDF)</span>
                  <ArrowRight className="w-3.5 h-3.5 -rotate-45 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform text-brand-muted" />
                </a>
              </>
            )}
            {violation?.evidence_wayback_url && (
              <>
                <div className="h-px bg-brand-border w-full" />
                <a href={violation.evidence_wayback_url} target="_blank" rel="noopener noreferrer" className="group/link flex items-center justify-between text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-3"><ExternalLink className="w-4 h-4 text-emerald-400 group-hover/link:text-emerald-600 transition-colors" /> Archive.org Snapshot</span>
                  <ArrowRight className="w-3.5 h-3.5 -rotate-45 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform text-emerald-400" />
                </a>
              </>
            )}
            {violation?.evidence_warc_url && (
              <>
                <div className="h-px bg-brand-border w-full" />
                <a href={`https://replayweb.page/?source=${encodeURIComponent(violation.evidence_warc_url)}`} target="_blank" rel="noopener noreferrer" className="group/link flex items-center justify-between text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  <span className="flex items-center gap-3"><ExternalLink className="w-4 h-4 text-indigo-400 group-hover/link:text-indigo-600 transition-colors" /> View Raw WARC</span>
                  <ArrowRight className="w-3.5 h-3.5 -rotate-45 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform text-indigo-400" />
                </a>
                <div className="h-px bg-brand-border w-full" />
                <a href={violation.evidence_warc_url} target="_blank" rel="noopener noreferrer" className="group/link flex items-center justify-between text-sm font-bold text-brand-text" download>
                  <span className="flex items-center gap-3"><Download className="w-4 h-4 text-brand-muted group-hover/link:text-brand-text transition-colors" /> Download WARC</span>
                  <ArrowRight className="w-3.5 h-3.5 -rotate-45 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform text-brand-muted" />
                </a>
              </>
            )}
            <div className="h-px bg-brand-border w-full" />
            {notice.pdf_url ? (
              <a href={`/api/dmca/download/${noticeId}`} target="_blank" rel="noopener noreferrer" className="group/link flex items-center justify-between text-sm font-bold text-blue-600 dark:text-blue-400">
                <span className="flex items-center gap-3"><Download className="w-4 h-4" /> Signed Notice PDF</span>
                <ArrowRight className="w-3.5 h-3.5 -rotate-45 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
              </a>
            ) : (
              <div className="flex items-center justify-between text-sm font-bold text-brand-muted opacity-50 cursor-not-allowed">
                <span className="flex items-center gap-3"><FileText className="w-4 h-4" /> PDF Pending</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Draft Review Form - Editorial Layout */}
      <div className="bg-brand-bg border border-brand-border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-brand-surface px-8 md:px-10 py-6 flex items-center justify-between border-b border-brand-border">
          <div className="flex items-center gap-3">
            {isActiveDraft && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
            <h3 className="font-display font-black uppercase text-[11px] tracking-widest text-brand-text">Forensic Draft</h3>
          </div>
          <Badge variant="default" className="text-[9px] uppercase tracking-widest font-mono bg-transparent text-brand-muted w-fit">
            Forensic Auto-Draft
          </Badge>
        </div>

        <div className="divide-y divide-brand-border">
          <DraftSection
            label="Work Description"
            value={edits.work_description}
            onChange={(v: string) => setEdits({ ...edits, work_description: v })}
            disabled={!isActiveDraft}
          />
          <DraftSection
            label="Infringement Description"
            value={edits.infringement_description}
            onChange={(v: string) => setEdits({ ...edits, infringement_description: v })}
            disabled={!isActiveDraft}
          />
          <DraftSection
            label="Evidence Summary"
            value={edits.evidence_summary}
            onChange={(v: string) => setEdits({ ...edits, evidence_summary: v })}
            disabled={!isActiveDraft}
            isTextarea={true}
          />
          <DraftSection
            label="Optional Context"
            value={edits.optional_context_note}
            onChange={(v: string) => setEdits({ ...edits, optional_context_note: v })}
            disabled={!isActiveDraft}
          />
        </div>

        {isActiveDraft && (
          <div className="bg-brand-surface p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-brand-border">
            <div className="flex-1 space-y-4">
              <p className="text-xs text-brand-muted leading-relaxed max-w-md font-medium">
                Review and amend the factual statements. The statutory perjury and good-faith statements will be automatically appended prior to signature.
              </p>

              {!violation?.evidence_bundle_url && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Evidence Bundle Required</p>
                  </div>
                  <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium">
                    You must generate a forensic evidence bundle before this notice can be dispatched.
                  </p>
                  <Button
                    onClick={handleGenerateEvidence}
                    disabled={generatingEvidence}
                    variant="secondary"
                    className="w-full bg-white dark:bg-transparent border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    {generatingEvidence ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Generating...</>
                    ) : (
                      <><Download className="w-3.5 h-3.5 mr-2" /> Generate Evidence Bundle</>
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="shrink-0 flex flex-col items-center gap-3">
              <Button
                onClick={handleApprove}
                disabled={isApproving || !violation?.evidence_bundle_url}
                size="lg"
                className="w-full md:w-auto font-display font-black uppercase tracking-widest text-[10px] px-12 h-14 shadow-lg shadow-blue-500/10"
              >
                {isApproving ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-3" /> Dispatching...</>
                ) : (
                  <><Send className="w-4 h-4 mr-3" /> Approve & Dispatch</>
                )}
              </Button>
              {!violation?.evidence_bundle_url && (
                <p className="text-[9px] font-black uppercase tracking-widest text-red-500 animate-pulse">Missing Forensic Evidence</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Timeline - Grid-based tracker */}
      <div className="space-y-6 pt-6">
        <h3 className="font-display font-black uppercase text-[10px] tracking-[0.2em] text-brand-muted px-2">Lifecycle Tracker</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-brand-border rounded-2xl border border-brand-border overflow-hidden">
          {timelineSteps.map((step, idx) => {
            const history = notice.status_history?.find((h: any) => h.status === step.status);
            const currentStepIdx = timelineSteps.findIndex(s => s.status === notice.status);

            // Mark as done if it has history OR if it chronologically precedes the current active step
            const isDone = history !== undefined || idx < currentStepIdx;
            const isActive = notice.status === step.status;

            return (
              <div key={step.status} className={clsx(
                "p-6 md:p-8 flex flex-col justify-between min-h-[140px] transition-colors",
                isActive ? "bg-brand-bg shadow-[inset_0_3px_0_0_currentColor] text-brand-text" :
                  isDone ? "bg-brand-surface text-brand-text" : "bg-brand-surface/30 text-brand-muted/40"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono opacity-50">0{idx + 1}</span>
                  {isDone && <CheckCircle className="w-4 h-4 text-blue-500" />}
                </div>
                <div className="space-y-1 mt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest leading-tight">{step.label}</p>
                  {history && <p className="text-[9px] font-mono opacity-50 pt-1">{new Date(history.at).toLocaleDateString()}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {isCounter && (
        <div className="mt-8 p-8 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h4 className="font-display font-black uppercase text-xs tracking-widest text-red-900 dark:text-red-300">Counter Notice Received</h4>
          </div>
          <p className="text-sm text-red-800 dark:text-red-400/80 font-medium leading-relaxed max-w-3xl">
            The host has forwarded a counter-notice under § 512(g). Takedown proceedings are paused.
            You have 10 business days to file an action seeking a court order to restrain the subscriber from engaging in infringing activity.
          </p>
        </div>
      )}
    </div>
  );
}

// Minimal ghost textarea section
function DraftSection({ label, value, onChange, disabled, isTextarea = false }: any) {
  return (
    <div className="p-8 md:px-10 md:py-8 flex flex-col md:flex-row gap-4 md:gap-16 group transition-colors hover:bg-brand-surface/30 focus-within:bg-brand-surface/50">
      <div className="w-full md:w-1/4 shrink-0">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-muted pt-1 group-focus-within:text-brand-text transition-colors">{label}</p>
      </div>
      <div className="flex-1">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          rows={isTextarea ? 5 : 2}
          className="w-full bg-transparent border-0 p-0 text-sm md:text-[15px] leading-relaxed text-brand-text focus:ring-0 resize-none disabled:opacity-80 disabled:cursor-not-allowed placeholder:text-brand-muted/30 font-medium"
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      </div>
    </div>
  )
}

