'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Shield, Plus, Trash2, Globe, Link as LinkIcon, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { addToWhitelist, removeFromWhitelist, WhitelistItem } from '@/lib/whitelist';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default function WhitelistPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<WhitelistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  
  // Form state
  const [newPattern, setNewPattern] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'domain' | 'exact'>('domain');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Auth State Check: Ensure listener only starts after user is fully authenticated
    // and the internal Firebase SDK auth state is definitely synced.
    if (authLoading) return;
    
    if (!user || !auth.currentUser) {
      console.warn('[Whitelist] Waiting for Firebase Auth to settle...', { userPresent: !!user, sdkUserPresent: !!auth.currentUser });
      return;
    }

    console.log('[Whitelist] Starting listener for user:', user.uid, 'SDK User:', auth.currentUser.uid);

    const q = query(
      collection(db, 'whitelist'), 
      where('owner_id', '==', user.uid)
    );

    const unsub = onSnapshot(q, { includeMetadataChanges: false }, (snap) => {
      console.log('[Whitelist] Snap received, docs:', snap.size);
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as WhitelistItem)));
      setLoading(false);
    }, (err) => {
      // Diagnostic logging to help pinpoint the exact failure point
      console.error(`[FirebaseError] Permission denied or listener failed at /whitelist for user ${user?.uid}:`, err.code, err.message);
      console.dir({
        error: err,
        userId: user?.uid,
        sdkUserId: auth.currentUser?.uid,
        authLoaded: !authLoading
      });
      setLoading(false);
    });

    return unsub;
  }, [user, authLoading]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPattern || !newLabel) return;

    setIsSubmitting(true);
    try {
      await addToWhitelist(newPattern, newLabel, user.uid, newType);
      setNewPattern('');
      setNewLabel('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this from your whitelist?')) return;
    try {
      await removeFromWhitelist(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-start justify-between">
        <PageHeader 
          title="Authorized Whitelist" 
          subtitle="Define safe domains and URLs that are pre-authorized to use your content." 
        />
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2 mt-8">
          <Plus className="w-4 h-4" /> Add Pattern
        </Button>
      </div>

      {isAdding && (
        <section className="bento-card p-8 border-2 border-brand-text animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleAdd} className="space-y-6">
            <h3 className="font-display font-black uppercase text-sm tracking-tight flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Whitelist Rule
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-meta">Pattern (Domain or URL)</label>
                <input
                  type="text"
                  required
                  placeholder={newType === 'domain' ? 'e.g. espn.com' : 'e.g. https://site.com/exact-page'}
                  value={newPattern}
                  onChange={e => setNewPattern(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-brand-border bg-brand-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-meta">Friendly Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Official Partner: ESPN"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-brand-border bg-brand-surface text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={newType === 'domain'} 
                    onChange={() => setNewType('domain')}
                    className="w-4 h-4 text-brand-text accent-brand-text"
                  />
                  <span className="text-xs font-bold">Domain Match</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    checked={newType === 'exact'} 
                    onChange={() => setNewType('exact')}
                    className="w-4 h-4 text-brand-text accent-brand-text"
                  />
                  <span className="text-xs font-bold">Exact URL</span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-brand-border">
              <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add to Whitelist
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            </div>
          </form>
        </section>
      )}

      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="w-8 h-8 text-brand-muted animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bento-card py-20 text-center space-y-4">
          <Globe className="w-12 h-12 text-brand-muted/20 mx-auto" />
          <p className="font-display font-black text-xl text-brand-muted/40 uppercase">Your whitelist is empty</p>
          <p className="text-sm text-brand-muted max-w-sm mx-auto">Authorize domains or specific links to automatically resolve future violations.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {items.map(item => (
            <div key={item.id} className="bento-card p-6 flex items-center justify-between group hover:border-brand-text transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-bg flex items-center justify-center border border-brand-border">
                  {item.type === 'domain' ? <Globe className="w-5 h-5 text-brand-muted" /> : <LinkIcon className="w-5 h-5 text-brand-muted" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-brand-text">{item.label}</p>
                    <Badge variant="info" className="scale-75 origin-left">{item.type}</Badge>
                  </div>
                  <p className="text-xs font-mono text-brand-muted mt-0.5">{item.pattern}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleDelete(item.id)}
                className="text-brand-red-text opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 flex gap-4">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-amber-900 uppercase tracking-tight">Pro-Tip: Whitelisting Logic</p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Whitelisting a domain (e.g., <strong>espn.com</strong>) will automatically authorize all subdomains and paths 
            (e.g., <strong>watch.espn.com/video</strong>). Use <strong>Exact URL</strong> if you only want to authorize 
            a specific page or social media post.
          </p>
        </div>
      </div>
    </div>
  );
}
