'use client';

import React from 'react';
import { LandingNav } from '@/components/layout/LandingNav';
import { LandingFooter } from '@/components/layout/LandingFooter';

interface StaticPageLayoutProps {
  children: React.ReactNode;
}

export function StaticPageLayout({ children }: StaticPageLayoutProps) {
  return (
    <main className="bg-brand-bg min-h-screen selection:bg-brand-accent/20 relative overflow-x-hidden">
      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Technical grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.01] dark:opacity-[0.02] z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <LandingNav />
      
      <div className="relative z-10 pt-32 md:pt-40">
        {children}
      </div>

      <LandingFooter />
    </main>
  );
}
