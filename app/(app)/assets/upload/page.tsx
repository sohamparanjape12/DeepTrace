'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { UploadZone } from '@/components/shared/UploadZone';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Scan } from 'lucide-react';
import Link from 'next/link';

const RIGHTS_TIERS = [
  { value: 'editorial', label: 'Editorial — News reporting use only' },
  { value: 'commercial', label: 'Commercial — Licensed commercial use' },
  { value: 'all_rights', label: 'All Rights Reserved — No external use' },
  { value: 'no_reuse', label: 'No Reuse — Internal only' },
];

const SPORTS_TAGS = ['Football', 'Basketball', 'Cricket', 'Tennis', 'F1', 'Golf', 'Rugby', 'Cycling', 'Swimming', 'Athletics'];

export default function UploadPage() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !assetName || !ownerOrg) return;
    setIsUploading(true);

    // Simulate upload progress for demo
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 120));
      setUploadProgress(i);
    }

    // In production: upload to Firebase Storage → write to Firestore → call /api/scan/[assetId]
    await new Promise(r => setTimeout(r, 500));
    router.push('/assets');
  };

  const isFormValid = file && assetName.trim() && ownerOrg.trim();

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
