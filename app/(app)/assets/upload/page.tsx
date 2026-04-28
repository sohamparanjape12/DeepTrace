'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { UploadZone } from '@/components/shared/UploadZone';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  ArrowLeft, 
  ArrowRight, 
  Upload, 
  Search, 
  FileText, 
  Brain, 
  CheckCircle, 
  ExternalLink, 
  AlertTriangle, 
  Loader2, 
  ImageIcon,
  Fingerprint,
  Newspaper,
  ShoppingBag,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { doc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/lib/auth-context';
import { ReliabilityRing } from '@/components/shared/ReliabilityRing';
import { ExplainabilityList } from '@/components/shared/ExplainabilityList';
import { ContradictionBanner } from '@/components/shared/ContradictionBanner';

const RIGHTS_TIERS = [
  { 
    value: 'editorial', 
    label: 'Editorial', 
    description: 'News & Reporting Only', 
    longDescription: 'Permitted on verified journalism outlets. High tolerance for fair use and historical documentation.',
    icon: Newspaper,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20'
  },
  { 
    value: 'commercial', 
    label: 'Commercial', 
    description: 'Licensed Distribution', 
    longDescription: 'Authorized for paid partners, marketing, and marketplaces. Requires valid sublicense proof.',
    icon: ShoppingBag,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  { 
    value: 'all_rights', 
    label: 'All Rights', 
    description: 'Strict Protection', 
    longDescription: 'No third-party use allowed without explicit direct contract. High severity for unauthorized leaks.',
    icon: ShieldCheck,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20'
  },
  { 
    value: 'no_reuse', 
    label: 'No Reuse', 
    description: 'Sensitive / Internal', 
    longDescription: 'Absolute zero-tolerance. Any public appearance is a critical breach of internal policy.',
    icon: ShieldAlert,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20'
  },
];

const SPORTS_TAGS = ['Football', 'Basketball', 'Cricket', 'Tennis', 'F1', 'Golf', 'Rugby', 'Cycling', 'Swimming', 'Athletics'];

// Step indicator config — no internal tool names exposed
const STEPS = [
  { num: 1, label: 'Upload Asset', icon: Upload, description: 'Register your original image' },
  { num: 2, label: 'Web Discovery', icon: Search, description: 'Scan the web for copies' },
  { num: 3, label: 'Provide Context', icon: FileText, description: 'Describe your asset rights' },
  { num: 4, label: 'Forensic Analysis', icon: Brain, description: 'AI-powered rights audit' },
];

interface SerpResult {
  title: string;
  link: string;
  source: string;
  thumbnail: string;
  original: string;
  size?: string;
}

interface AnalysisResult {
  matchLink: string;
  matchThumbnail: string;
  matchTitle: string;
  classification: string;
  confidence: number;
  severity: string;
  visual_match_score: number;
  contextual_match_score: number;
  reasoning_steps: string[];
  is_derivative_work: boolean;
  commercial_signal: boolean;
  reasoning: string;
  // RSE v2 fields
  relevancy: number;
  reliability_score: number;
  reliability_tier: 'HIGH' | 'MEDIUM' | 'LOW';
  abstain: boolean;
  contradiction_flag: boolean;
  explainability_bullets: string[];
  domain_class: string;
  recommended_action: string;
}

export default function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);

  // Step 2 state
  const [isSearching, setIsSearching] = useState(false);
  const [serpResults, setSerpResults] = useState<SerpResult[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(new Set());
  const [searchError, setSearchError] = useState<string | null>(null);

  // Step 3 state
  const [assetName, setAssetName] = useState('');
  const [ownerOrg, setOwnerOrg] = useState('');
  const [rightsTier, setRightsTier] = useState('editorial');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [assetDescription, setAssetDescription] = useState('');
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // ── Persistence Logic ──
  useEffect(() => {
    const saved = localStorage.getItem('upload_wizard_state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.currentStep) setCurrentStep(state.currentStep);
        if (state.uploadedUrl) setUploadedUrl(state.uploadedUrl);
        if (state.assetId) setAssetId(state.assetId);
        if (state.serpResults) setSerpResults(state.serpResults);
        if (state.selectedMatches) setSelectedMatches(new Set(state.selectedMatches));
        if (state.assetName) setAssetName(state.assetName);
        if (state.ownerOrg) setOwnerOrg(state.ownerOrg);
        if (state.rightsTier) setRightsTier(state.rightsTier);
        if (state.selectedTags) setSelectedTags(state.selectedTags);
        if (state.assetDescription) setAssetDescription(state.assetDescription);
      } catch (e) {
        console.error('Failed to restore wizard state:', e);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const state = {
      currentStep,
      uploadedUrl,
      assetId,
      serpResults,
      selectedMatches: Array.from(selectedMatches),
      assetName,
      ownerOrg,
      rightsTier,
      selectedTags,
      assetDescription
    };
    localStorage.setItem('upload_wizard_state', JSON.stringify(state));
  }, [isHydrated, currentStep, uploadedUrl, assetId, serpResults, selectedMatches, assetName, ownerOrg, rightsTier, selectedTags, assetDescription]);

  const clearState = () => localStorage.removeItem('upload_wizard_state');

  // Listen to Firestore for violations in real-time
  useEffect(() => {
    // Auth State Check: Confirm auth is fully loaded before executing query
    if (authLoading || currentStep !== 4 || !assetId || !user || !auth.currentUser) return;

    const q = query(
      collection(db, 'violations'),
      where('asset_id', '==', assetId),
      where('owner_id', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const results: AnalysisResult[] = [];
      let pendingCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'open' && data.gemini_class === 'NEEDS_REVIEW' && !data.reasoning_steps) {
          pendingCount++;
        }

        results.push({
          matchLink: data.match_url,
          matchThumbnail: data.assetThumbnailUrl || '',
          matchTitle: data.page_context || 'Match',
          classification: data.gemini_class || 'NEEDS_REVIEW',
          confidence: data.confidence || 0,
          severity: data.severity || 'LOW',
          visual_match_score: data.visual_match_score || 0,
          contextual_match_score: data.contextual_match_score || 0,
          reasoning_steps: data.reasoning_steps || [],
          is_derivative_work: data.is_derivative_work || false,
          commercial_signal: data.commercial_signal || false,
          reasoning: data.gemini_reasoning || '',
          reliability_score: data.reliability_score || 0,
          reliability_tier: data.reliability_tier || 'LOW',
          recommended_action: data.recommended_action || 'monitor',
          relevancy: data.relevancy || 0,
          abstain: data.abstain || false,
          contradiction_flag: data.contradiction_flag || false,
          explainability_bullets: data.explainability_bullets || [],
          domain_class: data.domain_class || 'unknown',
        });
      });

      setAnalysisResults(results);

      // If we have results and none are pending, analysis is done
      if (results.length > 0 && pendingCount === 0) {
        setIsAnalyzing(false);
        setAnalysisDone(true);
      }
    }, (err) => {
      console.error(`[FirebaseError] Permission denied or listener failed at /violations (upload:${assetId}) for user ${user.uid}:`, err.code, err.message);
    });

    return () => unsubscribe();
  }, [currentStep, assetId, user, authLoading]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleMatch = (idx: number) => {
    setSelectedMatches(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAllMatches = () => {
    if (selectedMatches.size === serpResults.length) {
      setSelectedMatches(new Set());
    } else {
      setSelectedMatches(new Set(serpResults.map((_, i) => i)));
    }
  };

  // ── Step 1: Upload to Cloudinary + save to Firestore ──
  const handleUpload = async () => {
    if (!file || !user) return;
    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.uid);

      const uploadRes = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to upload image');
      }

      const { url: downloadURL } = await uploadRes.json();
      setUploadProgress(60);
      setUploadedUrl(downloadURL);

      // Save asset to Firestore
      const newAssetId = uuidv4();
      setAssetId(newAssetId);

      await setDoc(doc(db, 'assets', newAssetId), {
        asset_id: newAssetId,
        owner_id: user.uid,
        name: file.name.replace(/\.[^/.]+$/, ''), // temp name from filename
        owner_org: '',
        uploaded_at: new Date().toISOString(),
        rights_tier: 'editorial',
        tags: [],
        scan_status: 'pending',
        storageUrl: downloadURL,
        thumbnailUrl: downloadURL,
      });
      setUploadProgress(100);

      // Auto-advance to step 2
      setTimeout(() => {
        setIsUploading(false);
        setCurrentStep(2);
        triggerReverseSearch(downloadURL, newAssetId);
      }, 500);

    } catch (e: any) {
      console.error(e);
      setIsUploading(false);
    }
  };

  // ── Step 2: SerpAPI reverse image search ──
  const triggerReverseSearch = async (imageUrl: string, targetAssetId?: string) => {
    setIsSearching(true);
    setSearchError(null);

    const activeAssetId = targetAssetId || assetId;
    if (!activeAssetId || !user) return;

    try {
      const res = await fetch('/api/reverse-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          assetId: activeAssetId,
          userId: user.uid
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Reverse search failed');
      }

      const data = await res.json();
      setSerpResults(data.results || []);
    } catch (e: any) {
      console.error(e);
      setSearchError(e.message);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Step 4: Run Final Audit ──
  const runForensicAnalysis = async () => {
    // Check validation
    const errors = new Set<string>();
    if (!assetName) errors.add('name');
    if (!ownerOrg) errors.add('org');

    if (errors.size > 0) {
      setValidationErrors(errors);
      return;
    }

    if (!assetId || !user) return;
    
    // Show the sleek transition animation INSTANTLY
    setIsFinalizing(true);
    setIsAnalyzing(true);

    try {
      const selectedMatchUrls = Array.from(selectedMatches).map(idx => serpResults[idx].link);

      // Trigger the transactional Finalize API (handles metadata + selective violation pruning)
      const res = await fetch(`/api/assets/${assetId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: assetName,
          ownerOrg,
          rightsTier,
          selectedTags,
          assetDescription,
          selectedMatchUrls
        })
      });

      if (!res.ok) {
        let errMsg = 'Finalize API failed';
        try {
          const errData = await res.json();
          errMsg = errData.error || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      // Hold the animation for at least 3s for "Forensic Theatre"
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Clear persistence upon successful handoff to pipeline
      clearState();

      // Redirect to the durable Asset Detail page
      router.push(`/assets/${assetId}`);
    } catch (e) {
      console.error('Failed to finalize audit:', e);
      setIsAnalyzing(false);
      setIsFinalizing(false);
    }
  };

  // ── Classification color/badge helpers ──
  const classificationColor = (c: string) => {
    switch (c) {
      case 'UNAUTHORIZED': return 'error';
      case 'AUTHORIZED': return 'success';
      case 'EDITORIAL_FAIR_USE': return 'info';
      default: return 'warning';
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-400 text-yellow-900';
      default: return 'bg-brand-bg text-brand-muted';
    }
  };

  const scoreBar = (score: number, label: string) => (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">{label}</span>
        <span className="text-[10px] font-black text-brand-text">{(score * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-brand-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${score * 100}%`,
            background: score >= 0.7 ? '#E11D48' : score >= 0.4 ? '#F59E0B' : '#22C55E',
          }}
        />
      </div>
    </div>
  );

  if (!isHydrated) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Fingerprint className="w-12 h-12 text-brand-text/20 animate-pulse" />
      <p className="text-meta text-brand-muted tracking-[0.3em]">Restoring Forensic Session</p>
    </div>
  );

  return (
    <>
      <div className="space-y-8">
      {/* Back + Title */}
      <div className="flex gap-6">
        <Link href="/assets">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
        </Link>
        <PageHeader
          title="Register & Analyze Asset"
          size="xl"
          subtitle="Upload your asset, scan the web for copies, and run AI-powered forensic analysis."
          className="mb-0"
        />
      </div>

      {/* ─── Step Indicator ─── */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const isActive = currentStep === step.num;
          const isComplete = currentStep > step.num;
          const Icon = step.icon;
          return (
            <div key={step.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isComplete ? 'bg-brand-text text-white' :
                  isActive ? 'bg-brand-text text-white dark:text-black ring-4 ring-brand-text/20' :
                    'bg-brand-bg text-neutral-200 dark:text-neutral-600'
                  }`}>
                  {isComplete ? <CheckCircle className="w-5 h-5 text-neutral-200 dark:text-neutral-800" /> : <Icon className="w-5 h-5" />}
                </div>
                <p className={`mt-2 text-[10px] font-black uppercase tracking-widest transition-colors ${isActive || isComplete ? 'text-brand-text' : 'text-brand-muted/40'
                  }`}>{step.label}</p>
                <p className={`text-[10px] text-center transition-colors mt-0.5 ${isActive ? 'text-brand-muted' : 'text-brand-muted/40'
                  }`}>{step.description}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 mx-2 -mt-6 transition-colors ${currentStep > step.num ? 'bg-brand-text' : 'bg-brand-border'
                  }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Step 1: Upload ─── */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bento-card p-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-display font-black uppercase text-sm tracking-wide text-brand-text">Upload Your Original Asset</h3>
                <p className="text-sm text-brand-muted mt-1 leading-relaxed max-w-2xl">
                  Upload the image you own. Your asset is securely stored and
                  registered in the DeepTrace platform. Once uploaded, our systems
                  will automatically scan the web for visually similar copies.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-meta">Asset Image *</label>
            <UploadZone
              onFileSelect={setFile}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
            />
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-brand-border">
            <Button
              size="lg"
              disabled={!file || isUploading}
              onClick={handleUpload}
              className="flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading {uploadProgress}%…</>
              ) : (
                <><Upload className="w-4 h-4" /> Upload & Start Web Scan</>
              )}
            </Button>
            <p className="text-meta text-zinc-400">
              Your image is stored securely and will be scanned across the web.
            </p>
          </div>
        </div>
      )}

      {/* ─── Step 2: SerpAPI Results ─── */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bento-card p-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Search className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-display font-black uppercase text-sm tracking-wide text-brand-text">Web Discovery Results</h3>
                <p className="text-sm text-brand-muted mt-1 leading-relaxed max-w-2xl">
                  These are images found across the web that visually match your asset.
                  Select the matches you want DeepTrace to analyze in the forensic audit.
                </p>
              </div>
            </div>
          </div>

          {/* Original asset preview */}
          {uploadedUrl && (
            <div className="bento-card p-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted mb-3">Your Original Asset</p>
              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-brand-bg border border-brand-border shrink-0">
                  <img src={uploadedUrl} alt="Original" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-brand-text">{file?.name || 'Uploaded asset'}</p>
                  <p className="text-xs text-brand-muted">Stored securely · Registered in DeepTrace</p>
                  <Badge variant="success">Uploaded</Badge>
                </div>
              </div>
            </div>
          )}

          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-brand-text/10 flex items-center justify-center">
                  <Search className="w-7 h-7 text-brand-text animate-pulse" />
                </div>
                <div className="absolute inset-0 border-4 border-brand-text rounded-full border-t-transparent animate-spin" />
              </div>
              <p className="text-sm font-bold text-brand-text">Scanning the web for copies…</p>
              <p className="text-xs text-brand-muted">Searching for visually similar images across the internet</p>
            </div>
          ) : searchError ? (
            <div className="bento-card p-8 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto" />
              <p className="text-sm font-bold text-brand-text">Search Error</p>
              <p className="text-xs text-brand-muted">{searchError}</p>
              <Button size="sm" onClick={() => uploadedUrl && triggerReverseSearch(uploadedUrl)}>
                Retry Search
              </Button>
            </div>
          ) : serpResults.length === 0 ? (
            <div className="bento-card p-12 text-center space-y-4">
              <ImageIcon className="w-12 h-12 text-zinc-300 mx-auto" />
              <p className="font-display font-black text-xl text-zinc-300 uppercase">No Matches Found</p>
              <p className="text-sm text-brand-muted max-w-md mx-auto">
                Our web scan did not surface any visually similar images. Your asset appears to be unique,
                or infringing copies have not yet been indexed.
              </p>
              <Button size="sm" variant="secondary" onClick={() => setCurrentStep(3)}>
                Continue to Context
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-brand-text">{serpResults.length} matches found</p>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-brand-muted">{selectedMatches.size} selected</p>
                  <Button size="sm" variant="secondary" onClick={selectAllMatches}>
                    {selectedMatches.size === serpResults.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {serpResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => toggleMatch(i)}
                    className={`group text-left rounded-xl border-2 overflow-hidden transition-all duration-200 ${selectedMatches.has(i)
                      ? 'border-brand-text ring-2 ring-brand-text/20 shadow-soft-lg'
                      : 'border-brand-border hover:border-zinc-400'
                      }`}
                  >
                    <div className="aspect-video bg-brand-bg relative overflow-hidden">
                      {(result.thumbnail || result.original) ? (
                        <img
                          src={result.thumbnail || result.original}
                          alt={result.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23f4f4f5" width="100" height="100"/><text fill="%23a1a1aa" x="50" y="50" text-anchor="middle" dy=".3em" font-size="12">No Preview</text></svg>'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-zinc-400 text-xs font-bold uppercase">No Preview</span>
                        </div>
                      )}
                      {selectedMatches.has(i) && (
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand-text flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white dark:text-black" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-xs font-bold text-brand-text line-clamp-1">{result.title || 'Untitled'}</p>
                      <p className="text-[10px] text-brand-muted line-clamp-1">{result.source || result.link}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4 border-t border-brand-border">
                <Button
                  size="lg"
                  disabled={selectedMatches.size === 0}
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-4 h-4" /> Analyze {selectedMatches.size} Match{selectedMatches.size !== 1 ? 'es' : ''}
                </Button>
                <p className="text-meta text-zinc-400">
                  Selected matches will be assessed in the forensic audit.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Step 3: Context ─── */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bento-card p-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-display font-black uppercase text-sm tracking-wide text-brand-text">Provide Asset Context</h3>
                <p className="text-sm text-brand-muted mt-1 leading-relaxed max-w-2xl">
                  Describe your asset origin and intent. This contextual metadata contributes <strong>20%</strong> to the final forensic evidence score.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="assetName" className={`text-meta ${validationErrors.has('name') ? 'text-red-500 font-bold' : ''}`}>
                Asset Name * {validationErrors.has('name') && <span className="ml-1 animate-pulse">(Required)</span>}
              </label>
              <input
                id="assetName"
                type="text"
                value={assetName}
                onChange={e => {
                  setAssetName(e.target.value);
                  if (e.target.value) {
                    const newErrors = new Set(validationErrors);
                    newErrors.delete('name');
                    setValidationErrors(newErrors);
                  }
                }}
                placeholder="e.g. Champions League Final — Hero Shot"
                className={`w-full px-4 py-3 rounded-xl border bg-brand-bg dark:bg-neutral-900/50 text-sm font-medium text-brand-text placeholder:text-brand-muted/30 focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:bg-brand-surface transition-all autofill:shadow-[0_0_0_1000px_#121214_inset] ${validationErrors.has('name') ? 'border-red-500 ring-2 ring-red-500/10' : 'border-brand-border dark:border-neutral-700 focus:border-brand-text'
                  }`}
              />
              <p className="text-[10px] text-zinc-400">A descriptive name for your asset</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="ownerOrg" className={`text-meta ${validationErrors.has('org') ? 'text-red-500 font-bold' : ''}`}>
                Organization * {validationErrors.has('org') && <span className="ml-1 animate-pulse">(Required)</span>}
              </label>
              <input
                id="ownerOrg"
                type="text"
                value={ownerOrg}
                onChange={e => {
                  setOwnerOrg(e.target.value);
                  if (e.target.value) {
                    const newErrors = new Set(validationErrors);
                    newErrors.delete('org');
                    setValidationErrors(newErrors);
                  }
                }}
                placeholder="e.g. ICC / Australian Cricket Board"
                className={`w-full px-4 py-3 rounded-xl border bg-brand-bg dark:bg-neutral-900/50 text-sm font-medium text-brand-text placeholder:text-brand-muted/30 focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:bg-brand-surface transition-all autofill:shadow-[0_0_0_1000px_#121214_inset] ${validationErrors.has('org') ? 'border-red-500 ring-2 ring-red-500/10' : 'border-brand-border dark:border-neutral-700 focus:border-brand-text'
                  }`}
              />
              <p className="text-[10px] text-zinc-400">The legal rights holder — helps determine "fair use".</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-meta">Rights Tier *</label>
              <p className="text-[10px] text-zinc-400">Select the license type — AI checks if web usage aligns with this tier.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {RIGHTS_TIERS.map((tier) => {
                const Icon = tier.icon;
                const isSelected = rightsTier === tier.value;
                return (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => setRightsTier(tier.value)}
                    className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 group hover:shadow-soft-lg ${
                      isSelected
                        ? `border-brand-text ${tier.bg} shadow-soft`
                        : 'border-brand-border dark:border-neutral-800 bg-brand-bg/50 hover:border-brand-muted/50'
                    }`}
                  >
                    <div className="flex flex-col h-full gap-4">
                      <div className={`p-2.5 rounded-xl w-fit transition-transform duration-300 group-hover:scale-110 ${
                        isSelected ? 'bg-brand-text text-white dark:text-black' : `${tier.bg} ${tier.color}`
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="space-y-1">
                        <p className={`text-[11px] font-black uppercase tracking-tight ${
                          isSelected ? 'text-brand-text' : 'text-brand-text/70'
                        }`}>{tier.label}</p>
                        <p className={`text-[10px] font-bold ${
                          isSelected ? 'text-brand-text/60' : 'text-brand-muted'
                        }`}>{tier.description}</p>
                      </div>

                      <p className={`text-[10px] leading-relaxed transition-opacity duration-300 ${
                        isSelected ? 'text-brand-text/50 opacity-100' : 'text-brand-muted/40 opacity-0 group-hover:opacity-100'
                      }`}>
                        {tier.longDescription}
                      </p>
                    </div>

                    {isSelected && (
                      <motion.div 
                        layoutId="active-tier"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-text flex items-center justify-center shadow-lg border-2 border-brand-surface"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-white dark:text-black" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <label className="text-meta">Sport Tags <span className="text-zinc-400 font-normal ml-1">(Optional)</span></label>
            <p className="text-[10px] text-zinc-400 -mt-1">Helps AI understand the domain context.</p>
            <div className="flex flex-wrap gap-2">
              {SPORTS_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (selectedTags.includes(tag)) {
                      setSelectedTags(selectedTags.filter(t => t !== tag));
                    } else {
                      setSelectedTags([...selectedTags, tag]);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedTags.includes(tag)
                    ? 'bg-brand-text text-white dark:text-black border-brand-text'
                    : 'bg-brand-surface text-brand-muted border-brand-border hover:border-brand-muted hover:text-brand-text'
                    }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Asset Description */}
          <div className="space-y-2 pt-4">
            <div className="flex items-center justify-between">
              <label htmlFor="assetDescription" className="text-meta">Asset Description <span className="text-zinc-400 font-normal ml-1">(Highly Recommended)</span></label>
            </div>
            <textarea
              id="assetDescription"
              rows={4}
              value={assetDescription}
              onChange={e => setAssetDescription(e.target.value)}
              placeholder="Provide a detailed description of what is happening in the image..."
              className="w-full px-4 py-3 rounded-xl border border-brand-border dark:border-neutral-700 bg-brand-bg dark:bg-neutral-900/50 text-sm font-medium text-brand-text placeholder:text-brand-muted/30 focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text focus:bg-brand-surface transition-all resize-none"
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4 pt-6 border-t border-brand-border">
            <Button variant="secondary" size="lg" onClick={() => setCurrentStep(2)} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Matches
            </Button>
            <Button
              size="lg"
              onClick={runForensicAnalysis}
              className={`flex items-center gap-2 px-8 ${(validationErrors.size > 0 || !assetName.trim() || !ownerOrg.trim()) ? 'opacity-70 grayscale-[0.5]' : ''
                }`}
            >
              <Brain className="w-4 h-4" /> Run Forensic Analysis
            </Button>
            {validationErrors.size > 0 && (
              <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-left-2">
                Please fill in the required fields.
              </p>
            )}
            <p className="text-meta text-zinc-400 hidden md:block">
              DeepTrace AI will now audit the {selectedMatches.size} matches against this context.
            </p>
          </div>
        </div>
      )}

      {/* ─── Step 4: Forensic Analysis Results ─── */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bento-card p-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <Brain className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-display font-black uppercase text-sm tracking-wide text-brand-text">Forensic Analysis Results</h3>
                <p className="text-sm text-brand-muted mt-1 leading-relaxed max-w-2xl">
                  DeepTrace's <strong>Forensic Content Auditor</strong> compares your original asset against each selected match using the
                  weighted formula: <strong>80% visual similarity + 20% contextual analysis</strong>. Results include classification,
                  confidence scores, and detailed reasoning steps.
                </p>
              </div>
            </div>
          </div>

          {isAnalyzing && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-900">Analyzing matches…</p>
                <p className="text-xs text-blue-700">
                  {analysisResults.length} of {selectedMatches.size} complete — DeepTrace AI is comparing images and evaluating context
                </p>
              </div>
            </div>
          )}

          {analysisResults.length === 0 && !isAnalyzing && (
            <div className="py-16 text-center">
              <p className="text-brand-muted">No results yet.</p>
            </div>
          )}

          <div className="space-y-6">
            {analysisResults.map((result, i) => (
              <div key={i} className="bento-card overflow-hidden">
                {/* Header */}
                <div className="p-6 flex items-start gap-4 border-b border-brand-border">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-100 border border-brand-border shrink-0">
                    {result.matchThumbnail ? (
                      <img
                        src={result.matchThumbnail}
                        alt={result.matchTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-zinc-400 text-[10px] font-bold uppercase">N/A</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-brand-text line-clamp-1">{result.matchTitle || 'Untitled Match'}</p>
                        <a href={result.matchLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand-muted hover:text-brand-text flex items-center gap-1 mt-1">
                          <ExternalLink className="w-3 h-3" /> {result.matchLink}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={classificationColor(result.classification)}>
                          {result.classification}
                        </Badge>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${severityColor(result.severity)}`}>
                          {result.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RSE v2 Forensic Dashboard */}
                <div className="p-6 space-y-6">
                  {/* Top Bar: Action + Reliability */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${result.recommended_action === 'escalate' ? 'text-red-700 bg-red-50 border-red-200' :
                          result.recommended_action === 'human_review' ? 'text-amber-700 bg-amber-50 border-amber-200' :
                            'text-green-700 bg-green-50 border-green-200'
                          }`}>
                          {result.recommended_action === 'escalate' ? '⚡ ESCALATE' :
                            result.recommended_action === 'human_review' ? '👁 REVIEW' : '✓ MONITOR'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-muted">
                          Domain: <span className="text-brand-text">{result.domain_class}</span>
                        </span>
                      </div>
                      <ContradictionBanner show={result.contradiction_flag || result.abstain} />
                    </div>
                    <ReliabilityRing score={result.reliability_score} tier={result.reliability_tier} />
                  </div>

                  {/* Three-Axis Bars */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 pt-2">
                    {[
                      { label: 'Relevancy', score: result.relevancy, color: '#6366F1' },
                      { label: 'Confidence', score: result.confidence, color: '#8B5CF6' },
                      { label: 'Visual Match', score: result.visual_match_score, color: '#0EA5E9' },
                      { label: 'Context Match', score: result.contextual_match_score, color: '#F59E0B' },
                    ].map(({ label, score, color }) => (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted">{label}</span>
                          <span className="text-[9px] font-black text-brand-text">{(score * 100).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${score * 100}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Audit / Explainability */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-muted">Forensic Audit Trail</p>
                    <ExplainabilityList bullets={result.explainability_bullets} />
                  </div>

                  {/* Signals Summary */}
                  <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-brand-border">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${result.is_derivative_work ? 'bg-amber-500' : 'bg-green-500'}`} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted">
                        {result.is_derivative_work ? 'Derivative' : 'Original'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${result.commercial_signal ? 'bg-red-500' : 'bg-green-500'}`} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted">
                        {result.commercial_signal ? 'Commercial' : 'Non-Commercial'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${result.abstain ? 'bg-zinc-400' : 'bg-blue-500'}`} />
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-muted">
                        {result.abstain ? 'Abstained' : 'Forensic Ready'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {analysisDone && (
            <div className="flex items-center gap-4 pt-4 border-t border-brand-border">
              <Button
                size="lg"
                onClick={() => router.push(`/assets/${assetId}`)}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> View Asset Dashboard
              </Button>
              <p className="text-meta text-zinc-400">
                All results have been saved to Firestore. You can view and manage violations from the asset detail page.
              </p>
            </div>
          )}
        </div>
      )}

      </div>
      <AnimatePresence>
        {isFinalizing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
            className="fixed inset-0 z-[999] bg-white/80 dark:bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6"
          >
            {/* Minimalist Scanner - Brackets & Scanning Line */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.8 }}
              className="relative w-64 h-64 flex items-center justify-center"
            >
              {/* Brackets */}
              <div className="absolute inset-0 border-[1.5px] border-brand-text/10 rounded-[2rem]" />
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-brand-text rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-brand-text rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-brand-text rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-brand-text rounded-br-xl" />

              {/* Central Icon */}
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Fingerprint className="w-16 h-16 text-brand-text" />
              </motion.div>

              {/* Subtle Scanning Beam */}
              <motion.div 
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-brand-text/50 to-transparent z-10" 
              />
            </motion.div>

            {/* Status Readouts */}
            <div className="mt-12 text-center space-y-6">
              <div className="space-y-1">
                <motion.h2 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg font-display font-black uppercase tracking-[0.4em] text-brand-text"
                >
                  Finalizing Audit
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-[10px] font-mono uppercase tracking-widest text-brand-muted"
                >
                  Synchronizing {selectedMatches.size} vectors to pipeline
                </motion.p>
              </div>

              {/* Progress Steps - Minimal Dots */}
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 1, 0.3]
                    }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      delay: i * 0.2 
                    }}
                    className="w-1.5 h-1.5 rounded-full bg-brand-text"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
