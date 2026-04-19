'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { UploadZone } from '@/components/shared/UploadZone';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Scan } from 'lucide-react';
import Link from 'next/link';
import { collection, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/lib/auth-context';

const RIGHTS_TIERS = [
  { value: 'editorial', label: 'Editorial — News reporting use only' },
  { value: 'commercial', label: 'Commercial — Licensed commercial use' },
  { value: 'all_rights', label: 'All Rights Reserved — No external use' },
  { value: 'no_reuse', label: 'No Reuse — Internal only' },
];

const SPORTS_TAGS = ['Football', 'Basketball', 'Cricket', 'Tennis', 'F1', 'Golf', 'Rugby', 'Cycling', 'Swimming', 'Athletics'];

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [assetName, setAssetName] = useState('');
  const [ownerOrg, setOwnerOrg] = useState('');
  const [rightsTier, setRightsTier] = useState('editorial');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const [isSuccess, setIsSuccess] = useState(false);
  const [successStep, setSuccessStep] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !assetName || !ownerOrg || !user) return;
    setIsUploading(true);
    setUploadProgress(10); // Fake progress to show activity

    try {
      // 1. Upload via API route (now handles Firebase Storage)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.uid);
      
      const uploadRes = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}));
        console.error('Upload API Error:', errorData);
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const { url: downloadURL } = await uploadRes.json();
      setUploadProgress(50); // Fake progress
      
      // 2. Save asset metadata to Firestore
      const assetId = uuidv4();
      
      await setDoc(doc(db, 'assets', assetId), {
        asset_id: assetId,
        owner_id: user.uid,
        name: assetName,
        owner_org: ownerOrg,
        uploaded_at: new Date().toISOString(),
        rights_tier: rightsTier,
        tags: selectedTags,
        scan_status: 'scanning',
        storageUrl: downloadURL,
        thumbnailUrl: downloadURL,
      });
      setUploadProgress(80); // Fake progress

      // 3. Trigger Scan
      await fetch('/api/scan/' + assetId, { method: 'POST' }).catch(() => null);
      setUploadProgress(100);

      setIsUploading(false);
      setIsSuccess(true);

      const steps = ['Finalizing Upload', 'AI Analysis Started', 'Global Web Scan Initiated'];
      for (let i = 0; i < steps.length; i++) {
        setSuccessStep(i);
        await new Promise(r => setTimeout(r, 800));
      }

      setTimeout(() => {
        router.push('/assets/' + assetId);
      }, 500);

    } catch (e) {
      console.error(e);
      setIsUploading(false);
    }
  };

  const isFormValid = file && assetName.trim() && ownerOrg.trim();

  if (isSuccess) {
    const steps = ['Finalizing Upload', 'AI Analysis Started', 'Global Web Scan Initiated'];
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-brand-text/10 flex items-center justify-center">
            <Scan className="w-10 h-10 text-brand-text animate-pulse" />
          </div>
          <div className="absolute inset-0 border-4 border-brand-text rounded-full border-t-transparent animate-spin" />
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-4xl font-display font-black uppercase tracking-tighter italic">Scanning Web</h2>
          <p className="text-brand-muted font-medium">Please wait while DeepTrace propagates your asset fingerprints.</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          {steps.map((step, i) => (
            <div key={step} className="flex items-center gap-4 transition-all duration-300">
              <div className={`w-2 h-2 rounded-full transition-all duration-500 ${i <= successStep ? 'bg-brand-text scale-125' : 'bg-zinc-200'}`} />
              <p className={`text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${i <= successStep ? 'text-brand-text transform translate-x-2' : 'text-zinc-300'}`}>
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-6">
        <Link href="/assets" className="mt-8">
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
        </Link>
        <PageHeader
          title="Register Asset"
          subtitle="Upload media to begin automated scanning."
          className="mb-0"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Upload Zone */}
        <div className="space-y-3">
          <label className="text-meta">Asset Image</label>
          <UploadZone
            onFileSelect={setFile}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
          />
        </div>

        {/* Metadata Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="assetName" className="text-meta">Asset Name *</label>
            <input
              id="assetName"
              type="text"
              value={assetName}
              onChange={e => setAssetName(e.target.value)}
              placeholder="e.g. Champions League Final — Hero Shot"
              className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white text-sm font-medium text-brand-text placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ownerOrg" className="text-meta">Organization *</label>
            <input
              id="ownerOrg"
              type="text"
              value={ownerOrg}
              onChange={e => setOwnerOrg(e.target.value)}
              placeholder="e.g. UEFA Media"
              className="w-full px-4 py-3 rounded-xl border border-brand-border bg-white text-sm font-medium text-brand-text placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
            />
          </div>
        </div>

        {/* Rights Tier */}
        <div className="space-y-3">
          <label className="text-meta">Rights Tier</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RIGHTS_TIERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRightsTier(value)}
                className={`px-4 py-3 rounded-xl border text-left transition-all ${rightsTier === value
                  ? 'border-brand-text bg-brand-text text-white'
                  : 'border-brand-border bg-white text-brand-text hover:border-zinc-400'
                  }`}
              >
                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5 opacity-60">
                  {value.replace('_', ' ')}
                </p>
                <p className="text-xs font-bold">{label.split(' — ')[1]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-3">
          <label className="text-meta">Sport Tags</label>
          <div className="flex flex-wrap gap-2">
            {SPORTS_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedTags.includes(tag)
                  ? 'bg-brand-text text-white border-brand-text'
                  : 'bg-white text-brand-muted border-brand-border hover:border-zinc-400 hover:text-brand-text'
                  }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-4 border-t border-brand-border">
          <Button
            type="submit"
            size="lg"
            disabled={!isFormValid || isUploading}
            className="flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Scan className="w-4 h-4" />
            {isUploading ? `Uploading ${uploadProgress}%…` : 'Register & Initiate Scan'}
          </Button>
          <p className="text-meta text-zinc-400">This will immediately trigger a global web scan.</p>
        </div>
      </form>
    </div>
  );
}

