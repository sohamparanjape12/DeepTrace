'use client';

import { StaticPageLayout } from '@/components/shared/StaticPageLayout';

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  sections: {
    title: string;
    content: string | string[];
  }[];
}

export function LegalPage({ title, lastUpdated, sections }: LegalPageProps) {
  return (
    <StaticPageLayout>
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight text-zinc-950 dark:text-white">
            {title}
          </h1>
          <p className="text-[10px] font-black tracking-[0.3em] text-brand-accent">
            Last Updated: {lastUpdated}
          </p>
        </div>

        <div className="space-y-12">
          {sections.map((section, i) => (
            <div key={i} className="space-y-4">
              <h2 className="text-xl font-display font-black tracking-tight text-zinc-950 dark:text-white border-b border-zinc-100 dark:border-white/5 pb-4">
                {section.title}
              </h2>
              <div className="space-y-4">
                {Array.isArray(section.content) ? (
                  <ul className="space-y-3">
                    {section.content.map((item, j) => (
                      <li key={j} className="flex gap-4 text-sm text-zinc-500 dark:text-white/40 leading-relaxed">
                        <span className="text-brand-accent font-black select-none">—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-white/40 leading-relaxed font-medium">
                    {section.content}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </StaticPageLayout>
  );
}
