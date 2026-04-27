'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';

gsap.registerPlugin(ScrollTrigger);

export function LandingNav() {
  const navRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.to(navRef.current, {
      scrollTrigger: { start: 'top -100', end: 'top -300', scrub: 1 },
      scale: 0.95,
      y: -8,
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    });
  }, { scope: navRef });

  return (
    <nav
      ref={navRef}
      className="fixed top-4 md:top-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-fit z-50
          px-4 py-2 flex items-center justify-between md:justify-start gap-6 md:gap-12
          border border-zinc-200 dark:border-white/10
          bg-white dark:bg-black/60 backdrop-blur-3xl
          rounded-full transition-all duration-500 shadow-lg dark:shadow-none"
    >
      <div className="flex items-center gap-2.5 pl-1">
        <Image src="/icon.svg" alt="Logo" width={20} height={20} />
        <span className="font-display font-black text-sm tracking-[-0.04em] text-zinc-950 dark:text-white">
          DeepTrace
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-10 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 dark:text-white/20">
        <a href="#discovery" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Discovery</a>
        <a href="#analysis" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Analysis</a>
        <a href="#resolution" className="hover:text-zinc-950 dark:hover:text-white transition-colors">Resolution</a>
      </div>

      <Link href="/dashboard">
        <Button
          variant="primary"
          className="rounded-full px-5 md:px-7 py-2.5 h-auto text-[10px] font-black uppercase tracking-widest
              bg-zinc-950 dark:bg-zinc-100 text-white dark:text-black hover:scale-[1.02] transition-all"
        >
          Launch Console
        </Button>
      </Link>
    </nav>
  );
}
