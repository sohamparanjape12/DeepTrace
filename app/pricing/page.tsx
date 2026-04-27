'use client';

import { StaticPageLayout } from '@/components/shared/StaticPageLayout';
import { Button } from '@/components/ui/Button';
import { Check, Zap, Shield, Globe, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

const PLANS = [
  {
    name: 'Standard',
    price: '$499',
    description: 'Essential protection for independent creators and boutique agencies.',
    features: [
      'Up to 500 Managed Assets',
      'Daily Discovery Crawls',
      'Standard AI Classification',
      'Manual Takedown Workflows',
      'Email Support',
    ],
    cta: 'Start Standard',
    popular: false,
  },
  {
    name: 'Professional',
    price: '$1,299',
    description: 'Advanced forensics and automated resolution for high-volume studios.',
    features: [
      'Up to 2,500 Managed Assets',
      'Real-time Discovery Layer',
      'Advanced Forensic Audits',
      'Automated DMCA Pipeline',
      'Priority Resolution Support',
      'API Access',
    ],
    cta: 'Go Professional',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Sovereign-grade infrastructure for global sports organizations.',
    features: [
      'Unlimited Asset Fingerprinting',
      'Dedicated Forensic Network',
      'Custom Pattern Training',
      'White-glove Takedown Ops',
      'Legal Concierge Service',
      'SLA Guaranteed Uptime',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <StaticPageLayout>
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-20">
        {/* Header */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-display font-black uppercase tracking-tight text-zinc-950 dark:text-white leading-[0.9]">
            Predictable <br />
            <span className="text-zinc-400 dark:text-white/20">Media Sovereignty.</span>
          </h1>
          <p className="text-zinc-500 dark:text-white/40 text-lg font-medium leading-relaxed">
            Choose the infrastructure tier that matches your organization's scale and resolution requirements.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-zinc-200 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          {PLANS.map((plan) => (
            <div 
              key={plan.name} 
              className={`p-10 lg:p-14 flex flex-col justify-between gap-12 relative group ${
                plan.popular ? 'bg-zinc-50 dark:bg-zinc-900/40' : 'bg-white dark:bg-zinc-950'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-6 right-10 px-3 py-1 rounded-full bg-brand-accent text-white text-[9px] font-black uppercase tracking-widest">
                  Most Popular
                </div>
              )}

              <div className="space-y-8">
                <div className="space-y-1">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-accent">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl md:text-5xl font-display font-black text-zinc-950 dark:text-white tracking-tighter">
                      {plan.price}
                    </span>
                    {plan.price !== 'Custom' && (
                      <span className="text-sm font-bold text-zinc-400 dark:text-white/20">/mo</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-white/40 leading-relaxed pt-2">
                    {plan.description}
                  </p>
                </div>

                <div className="h-px bg-zinc-100 dark:bg-white/5" />

                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-accent/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-brand-accent" />
                      </div>
                      <span className="text-[13px] font-bold text-zinc-600 dark:text-white/60">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link href="/dashboard">
                <Button 
                  className={`w-full h-14 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    plan.popular 
                      ? 'bg-zinc-950 dark:bg-white text-white dark:text-black hover:scale-[1.02] shadow-xl' 
                      : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-white/40 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ Preview / Trust */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-zinc-950 dark:bg-zinc-900 rounded-[2.5rem] p-12 border border-zinc-800">
          <div className="space-y-6">
            <h2 className="text-3xl font-display font-black uppercase text-white tracking-tight">
              Ready to deploy <br />DeepTrace?
            </h2>
            <p className="text-white/40 text-sm leading-relaxed max-w-sm">
              Our engineering team can help you migrate your existing asset catalog and rights database within 48 hours.
            </p>
            <div className="flex gap-4">
              <Button variant="secondary" className="rounded-full border-white/10 text-white/40 hover:text-white">
                Read FAQ
              </Button>
              <Button variant="primary" className="rounded-full bg-white text-black hover:bg-brand-accent hover:text-white">
                Contact Engineering
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: Shield, label: 'Military Grade Encryption' },
              { icon: Zap, label: 'Instant Resolution' },
              { icon: Globe, label: 'Global Compliance' },
              { icon: ArrowUpRight, label: 'API Integrations' },
            ].map((item) => (
              <div key={item.label} className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                <item.icon className="w-5 h-5 text-brand-accent" />
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60 leading-tight">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StaticPageLayout>
  );
}
