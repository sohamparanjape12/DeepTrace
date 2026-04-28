'use client';

import Link from 'next/link';
import { ArrowUpRight, Globe } from 'lucide-react';
import Image from 'next/image';

export function LandingFooter() {
  return (
    <footer className="py-20 px-6 border-t border-brand-border relative overflow-hidden mt-16 bg-brand-bg">
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-brand-accent/[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row justify-between items-start gap-16 relative z-10">
        {/* Brand */}
        <div className="space-y-6 max-w-xs">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image src="/icon.svg" alt="Logo" width={20} height={20} />
            <h3 className="text-xl font-display font-black tracking-tighter text-brand-text">DeepTrace</h3>
          </Link>
          <p className="text-brand-muted text-sm font-medium leading-relaxed">
            Securing digital media sovereignty through autonomous intelligence.
          </p>
          <div className="flex gap-3">
            {[ArrowUpRight, Globe].map((Icon, i) => (
              <div
                key={i}
                className="w-9 h-9 rounded-full border border-brand-border flex items-center justify-center
                  hover:bg-brand-text hover:text-white hover:border-brand-text transition-all cursor-pointer text-brand-muted"
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-16 gap-y-10">
          {[
            {
              title: 'Infrastructure',
              links: [
                { label: 'Forensic Network', href: '/infrastructure#network' },
                { label: 'Gemini Engine', href: '/infrastructure#gemini' },
                { label: 'CDN Layer', href: '/infrastructure#cdn' }
              ]
            },
            {
              title: 'Intelligence',
              links: [
                { label: 'Pricing', href: '/pricing' },
                { label: 'Discovery', href: '/#discovery' },
                { label: 'Pattern Engine', href: '/infrastructure#patterns' }
              ]
            },
            {
              title: 'Legal',
              links: [
                { label: 'Privacy Policy', href: '/legal/privacy' },
                { label: 'Terms of Service', href: '/legal/terms' },
                { label: 'Compliance', href: '/legal/compliance' }
              ]
            },
          ].map((col) => (
            <div key={col.title} className="space-y-4">
              <h4 className="text-[11px] font-black tracking-widest text-brand-text">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[11px] font-bold tracking-wider text-brand-muted hover:text-brand-text cursor-pointer transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-6xl mx-auto mt-20 pt-8 border-t border-brand-border flex flex-col md:flex-row justify-between gap-4 opacity-40">
        <p className="text-[11px] font-black tracking-widest text-brand-muted">© 2026 DeepTrace Systems.</p>
        <p className="text-[11px] font-black tracking-widest text-brand-muted">Sovereignty through Intelligence.</p>
      </div>
    </footer>
  );
}
