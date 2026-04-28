'use client';

import { StaticPageLayout } from '@/components/shared/StaticPageLayout';
import { Shield, Brain, Globe, Zap, Fingerprint, Lock, BarChart3, Database } from 'lucide-react';

const SECTIONS = [
  {
    id: 'network',
    title: 'Global Forensic Network',
    description: 'A distributed infrastructure of 1,200+ nodes globally that provides low-latency web crawling and high-fidelity media analysis.',
    icon: Globe,
    details: [
      'Nodes across 147 countries',
      'Proprietary proxy-rotation mesh',
      'Edge-based computer vision extraction',
      'Real-time IP reputation tracking'
    ]
  },
  {
    id: 'intelligence',
    title: 'Forensic Intelligence Engine',
    description: 'Powered by advanced multimodal reasoning, our intelligence engine autonomously audits every detected match against complex licensing structures.',
    icon: Brain,
    details: [
      'Context-aware violation classification',
      'Automated evidence bundle generation',
      'Multi-language context analysis',
      'Predictive resolution outcomes'
    ]
  },
  {
    id: 'cdn',
    title: 'Visual Fingerprinting Layer',
    description: 'Non-destructive cryptographic tagging that survives heavy edits, crops, and AI-driven watermark removal techniques.',
    icon: Fingerprint,
    details: [
      'Robust pHash and wave-geometry indexing',
      'Perceptual hashing at sub-pixel levels',
      'Metadata injection and verification',
      'Temporal consistency checks for video'
    ]
  },
  {
    id: 'resolution',
    title: 'Autonomous Resolution',
    description: 'Direct-action pathways to identify and resolve asset theft — from discovery to automated takedown workflows.',
    icon: Zap,
    details: [
      'Revenue-at-risk valuation modeling',
      'Automated notice-and-takedown delivery',
      'Temporal and regional audit checks',
      'Settlement and licensing negotiation'
    ]
  }
];

export default function InfrastructurePage() {
  return (
    <StaticPageLayout>
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-24">
        {/* Hero */}
        <div className="space-y-8 max-w-4xl">
          <div className="space-y-3">
            <h1 className="text-5xl md:text-8xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-[0.85]">
              The engine of <br />
              <span className="text-zinc-400 dark:text-white/20">sovereignty.</span>
            </h1>
          </div>
          <p className="text-zinc-500 dark:text-white/40 text-xl font-medium leading-relaxed max-w-2xl border-l-2 border-brand-accent pl-8">
            DeepTrace isn't just a dashboard—it's a global, sovereign infrastructure built to defend the digital integrity of the world's leading sports organizations.
          </p>
        </div>

        {/* Technical Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-zinc-200 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-[3rem] overflow-hidden">
          {SECTIONS.map((section) => (
            <div 
              key={section.id} 
              id={section.id}
              className="bg-white dark:bg-zinc-950 p-12 lg:p-16 space-y-10 group"
            >
              <div className="flex justify-between items-start">
                <div className="w-16 h-16 flex items-center justify-center rounded-[2rem] bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 text-zinc-300 dark:text-white/10 group-hover:text-brand-accent group-hover:border-brand-accent/20 transition-all duration-700">
                  <section.icon className="w-8 h-8" />
                </div>
                <span className="text-[10px] font-black tracking-[0.3em] text-brand-accent opacity-0 group-hover:opacity-100 transition-opacity">Active System</span>
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-display font-black tracking-tight text-zinc-950 dark:text-white leading-none">
                  {section.title}
                </h2>
                <p className="text-zinc-500 dark:text-white/40 text-base font-medium leading-relaxed">
                  {section.description}
                </p>
              </div>

              <ul className="grid grid-cols-1 gap-4 pt-4">
                {section.details.map((detail) => (
                  <li key={detail} className="flex items-center gap-4 group/item">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-200 dark:bg-white/10 group-hover/item:bg-brand-accent transition-colors" />
                    <span className="text-[12px] font-black tracking-widest text-zinc-400 dark:text-white/20 group-hover/item:text-zinc-950 dark:group-hover/item:text-white transition-colors">
                      {detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Stack Architecture Section */}
        <div className="relative py-24 px-12 bg-zinc-950 dark:bg-black rounded-[3rem] overflow-hidden border border-zinc-800 text-center space-y-16">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-brand-accent/50 to-transparent" />
          
          <div className="space-y-4">
            <h3 className="text-[11px] font-black tracking-[0.4em] text-brand-accent">Architecture Stack</h3>
            <h2 className="text-4xl md:text-6xl font-display font-black text-white tracking-tight">
              Built for <br />the open web.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 hover:opacity-100 transition-opacity duration-700">
            {[
              { label: 'Edge Compute Cluster', icon: Zap },
              { icon: Database, label: 'High-Dimensional Vector DB' },
              { icon: BarChart3, label: 'Time-Series Analytics' },
              { icon: Lock, label: 'Sovereign Vault' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-4">
                <item.icon className="w-6 h-6 text-white" />
                <span className="text-[10px] font-black tracking-widest text-white">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StaticPageLayout>
  );
}
