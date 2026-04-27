'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/Button';
import { Shield, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DMCAOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    org_name: '',
    legal_name: '',
    mailing_address: '',
    phone: '',
    email: '',
    authorized_agent_name: '',
    electronic_signature: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isFormValid = Object.values(formData).every(val => val.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !user) return;
    
    setIsSubmitting(true);
    try {
      const orgRef = doc(db, 'organizations', user.uid);
      const orgDoc = await getDoc(orgRef);
      
      const payload = {
        id: user.uid,
        org_name: formData.org_name,
        dmca_attestation_signed: true,
        dmca_attestation: {
          ...formData,
          signed_at: new Date().toISOString(),
          ip: 'recorded', // In real app, fetch via API route
          user_agent: navigator.userAgent
        }
      };

      if (!orgDoc.exists()) {
        await setDoc(orgRef, payload);
      } else {
        await updateDoc(orgRef, payload);
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to save attestation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl pb-24 mx-auto pt-12">
      <PageHeader
        title="DMCA Verification"
        size="xl"
        subtitle="Complete your organization's legal profile to enable one-click DMCA takedown requests."
        className="mb-0"
      />

      <div className="bento-card p-8 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-indigo-900/30">
            <Shield className="w-5 h-5 text-blue-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="font-display font-black uppercase text-sm tracking-wide text-brand-text">Legal Attestation Required</h3>
            <p className="text-sm text-brand-muted mt-1 leading-relaxed max-w-2xl">
              Under 17 U.S.C. § 512(c), a takedown notice must be submitted under penalty of perjury. 
              By completing this profile, you attest that you are authorized to act on behalf of the rights holder.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bento-card p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-meta">Organization / Company Name *</label>
            <input
              name="org_name"
              value={formData.org_name}
              onChange={handleChange}
              placeholder="e.g. Acme Sports Media"
              className="w-full px-4 py-3 rounded-xl border border-brand-border bg-brand-bg dark:bg-neutral-900/50 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-meta">Full Legal Name *</label>
            <input
              name="legal_name"
              value={formData.legal_name}
              onChange={handleChange}
              placeholder="e.g. Jane Doe"
              className="w-full px-4 py-3 rounded-xl border border-brand-border bg-brand-bg dark:bg-neutral-900/50 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-meta">Mailing Address *</label>
          <input
            name="mailing_address"
            value={formData.mailing_address}
            onChange={handleChange}
            placeholder="e.g. 123 Main St, City, ST 12345"
            className="w-full px-4 py-3 rounded-xl border border-brand-border bg-brand-bg dark:bg-neutral-900/50 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-meta">Phone Number *</label>
            <input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 rounded-xl border border-brand-border bg-brand-bg dark:bg-neutral-900/50 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-meta">Contact Email *</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="legal@acmesports.com"
              className="w-full px-4 py-3 rounded-xl border border-brand-border bg-brand-bg dark:bg-neutral-900/50 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
            />
          </div>
        </div>

        <div className="border-t border-brand-border pt-6 mt-6 space-y-6">
          <div className="space-y-2">
            <label className="text-meta">Authorized Agent Name *</label>
            <input
              name="authorized_agent_name"
              value={formData.authorized_agent_name}
              onChange={handleChange}
              placeholder="Name of person signing notices"
              className="w-full px-4 py-3 rounded-xl border border-brand-border bg-brand-bg dark:bg-neutral-900/50 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
            />
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl space-y-3">
             <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Perjury Declaration</p>
             <p className="text-xs text-amber-800 dark:text-amber-300/80 leading-relaxed">
                By typing your name below, you swear, under penalty of perjury, that you are the copyright owner 
                or are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
             </p>
          </div>

          <div className="space-y-2">
            <label className="text-meta">Electronic Signature *</label>
            <input
              name="electronic_signature"
              value={formData.electronic_signature}
              onChange={handleChange}
              placeholder="Type your full legal name to sign"
              className="w-full px-4 py-3 rounded-xl border border-brand-border bg-brand-bg dark:bg-neutral-900/50 text-sm text-brand-text font-serif italic focus:outline-none focus:ring-2 focus:ring-brand-text/20 focus:border-brand-text transition-all"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button 
            type="submit" 
            size="lg" 
            disabled={!isFormValid || isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><CheckCircle className="w-4 h-4" /> Save Legal Profile</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
