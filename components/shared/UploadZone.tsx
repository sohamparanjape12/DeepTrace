'use client';

import { useRef, useState } from 'react';
import { Upload, ImageIcon, X } from 'lucide-react';
import { clsx } from 'clsx';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  className?: string;
}

export function UploadZone({ onFileSelect, isUploading, uploadProgress = 0, className }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={clsx('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-brand-border aspect-video">
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20" />
          <button
            onClick={reset}
            className="absolute top-4 right-4 p-2 rounded-full bg-brand-surface/90 hover:bg-brand-surface transition-colors shadow-soft"
          >
            <X className="w-4 h-4 text-brand-text" />
          </button>
          {isUploading && (
            <div className="absolute bottom-0 left-0 right-0">
              <div className="h-1 bg-white/20">
                <div
                  className="h-full bg-brand-accent transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="px-6 py-4 bg-black/60 backdrop-blur-sm flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">
                  Uploading to Cloudinary…
                </p>
                <p className="text-[10px] font-black text-white">{uploadProgress}%</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={clsx(
            'w-full aspect-video rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-6 transition-all duration-300',
            dragOver
              ? 'border-brand-text bg-brand-bg scale-[1.01]'
              : 'border-brand-border bg-brand-bg hover:border-brand-muted hover:bg-brand-surface',
          )}
        >
          <div className={clsx(
            'p-5 rounded-2xl transition-all duration-300',
            dragOver ? 'bg-brand-text' : 'bg-brand-surface border border-brand-border',
          )}>
            {dragOver
              ? <ImageIcon className="w-8 h-8 text-brand-bg" />
              : <Upload className="w-8 h-8 text-brand-muted" />
            }
          </div>
          <div className="text-center space-y-2">
            <p className="font-display font-bold text-brand-text text-lg">
              {dragOver ? 'Drop it here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-meta text-brand-muted">PNG, JPG, WebP up to 20MB</p>
          </div>
        </button>
      )}
    </div>
  );
}
