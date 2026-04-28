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
          px-3 py-2.5 flex items-center justify-between md:justify-start gap-4 md:gap-8
          border border-zinc-200 dark:border-white/10
          bg-white dark:bg-black/60 backdrop-blur-3xl
          rounded-full transition-all duration-500 shadow-lg dark:shadow-none"
    >
      <div className="flex items-center gap-2 pl-1">
        <Image src="/icon.svg" alt="Logo" width={18} height={18} />
        <span className="font-display font-black text-md tracking-[-0.04em] text-zinc-950 dark:text-white">
          DeepTrace
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-6 text-[10px] font-black tracking-[0.2em] text-zinc-400 dark:text-white/20">
        <Link href="/#discovery" className="hover:text-zinc-950 dark:hover:text-white transition-colors uppercase">Discovery</Link>
        <Link href="/infrastructure" className="hover:text-zinc-950 dark:hover:text-white transition-colors uppercase">Infrastructure</Link>
        <Link href="/pricing" className="hover:text-zinc-950 dark:hover:text-white transition-colors uppercase">Pricing</Link>
        <Link href="/#resolution" className="hover:text-zinc-950 dark:hover:text-white transition-colors uppercase">Resolution</Link>
      </div>

      <Link href="/dashboard">
        <Button
          variant="primary"
          className="rounded-full px-5 py-2 h-auto text-[10px] font-black tracking-widest whitespace-nowrap
              bg-zinc-950 dark:bg-zinc-100 text-white dark:text-black hover:scale-[1.02] transition-all"
        >
          Launch Console
        </Button>
      </Link>
    </nav>
  );
}
