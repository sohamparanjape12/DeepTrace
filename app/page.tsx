'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Marquee } from '@/components/shared/Marquee';
import { Shield, Search, AlertCircle, BarChart3, ArrowUpRight, Globe, Zap, Fingerprint, ChevronRight } from 'lucide-react';
import Link from 'next/link';

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const container = useRef(null);
  const navRef = useRef(null);

  useGSAP(() => {
    // 1. Hero Entrance
    const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.2 } });

    tl.from('.hero-title', {
      y: 80,
      opacity: 0,
    })
      .from('.hero-sub', {
        y: 30,
        opacity: 0,
      }, '-=0.8')
      .from('.hero-cta', {
        y: 20,
        opacity: 0,
        stagger: 0.1
      }, '-=0.6');

    // 2. Floating Nav Shrink on Scroll
    gsap.to(navRef.current, {
      scrollTrigger: {
        start: 'top -50',
        end: 'top -200',
        scrub: true,
      },
      scale: 0.9,
      y: -10,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
    });

    // 3. 3D Bento Reveal
    gsap.from('.bento-item', {
      scrollTrigger: {
        trigger: '.bento-grid',
        start: 'top 75%',
      },
      y: 100,
      rotationX: 15,
      opacity: 0,
      stagger: 0.15,
      duration: 1.4,
      ease: 'power4.out',
      clearProps: 'all'
    });

    // 4. Metric Count-Up Animation
    const metrics = [
      { target: '.stat-assets', val: 1284 },
      { target: '.stat-violations', val: 42 },
      { target: '.stat-nodes', val: 148 },
    ];

    metrics.forEach(({ target, val }) => {
      const obj = { value: 0 };
      gsap.to(obj, {
        scrollTrigger: {
          trigger: '.bento-grid',
          start: 'top 80%',
        },
        value: val,
        duration: 2.5,
        ease: 'power2.out',
        onUpdate: () => {
          const el = document.querySelector(target);
          if (el) el.textContent = Math.floor(obj.value).toLocaleString();
        }
      });
    });
  }, { scope: container });

  return (
    <main ref={container} className="bg-brand-bg min-h-screen selection:bg-brand-accent/20 relative">
      {/* Visual Depth Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] noise-overlay" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />

      {/* Floating Pill Nav */}
      <nav ref={navRef} className="fixed top-8 left-1/2 -translate-x-1/2 z-50 glass-pill px-8 py-3 flex items-center gap-8 transition-shadow hover:shadow-lg">
        <span className="font-display font-black text-xl tracking-tighter uppercase whitespace-nowrap">DeepTrace</span>
        <div className="hidden md:flex items-center gap-8 text-meta">
          <a href="#" className="hover:text-brand-text transition-colors relative group">
            Assets
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-brand-text transition-all group-hover:w-full" />
          </a>
          <a href="#" className="hover:text-brand-text transition-colors relative group">
            Violations
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-brand-text transition-all group-hover:w-full" />
          </a>
          <a href="#" className="hover:text-brand-text transition-colors relative group">
            Nodes
            <span className="absolute -bottom-1 left-0 w-0 h-px bg-brand-text transition-all group-hover:w-full" />
          </a>
        </div>
        <Link className="whitespace-nowrap" href="/dashboard">Secure Asset</Link>
      </nav>

      {/* Hero: Artistic Asymmetry */}
      <section className="macro-spacing px-6 md:px-12 flex flex-col lg:flex-row gap-20 max-w-[1500px] mx-auto min-h-[90vh] items-center">
        <div className="lg:w-3/5 space-y-10">
          <div className="space-y-2">
            <Badge variant="info" className="mb-4">Intelligence v1.0.4</Badge>
            <div className="overflow-hidden">
              <h1 className="hero-title text-7xl md:text-8xl font-display font-black leading-[0.8] tracking-tight uppercase">
                Trace the <br />
                <span className="text-brand-muted">Untraceable.</span>
              </h1>
            </div>
          </div>
          <p className="hero-sub text-xl md:text-3xl text-brand-muted max-w-2xl font-sans leading-[1.4] font-medium">
            DeepTrace deploys autonomous AI nodes to fingerprint, monitor, and classify sports media IP across the dark and open web in real-time.
          </p>
          <div className="hero-cta flex flex-wrap gap-6 pt-4">
            <Button size="lg" className="h-16 px-12 text-lg flex items-center gap-3">
              Initiate Global Scan <ChevronRight className="w-5 h-5" />
            </Button>
            <Button variant="secondary" size="lg" className="h-16 px-12 text-lg">
              Live Violations
            </Button>
          </div>
        </div>

        <div className="lg:w-2/5 w-full relative">
          <div className="aspect-[5/6] m-12 rounded-xl bg-zinc-200 overflow-hidden relative grayscale hover:grayscale-0 transition-all duration-1000 shadow-soft-lg group border border-brand-border">
            <img
              src="https://picsum.photos/seed/trace/1200/1500"
              alt="Digital Forensics"
              className="object-cover w-full  h-full group-hover:scale-110 transition-transform duration-[4000ms] ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-bg/80 via-transparent to-transparent" />
            <div className="absolute bottom-12 left-8 right-8">
              <Card className="p-6 backdrop-blur-2xl bg-white/10 border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-accent animate-pulse" />
                    <p className="text-meta text-white">System Integrity: 99.9%</p>
                  </div>
                  <span className="text-[10px] font-bold text-white/50 tracking-widest">REAL-TIME</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Infinite Marquee: Live Infrastructure Feed */}
      <section className="marquee-section border-y border-brand-border py-14 overflow-hidden bg-white/50 backdrop-blur-sm">
        <Marquee speed={70}>
          <div className="flex items-center gap-32 py-4">
            <span className="text-meta whitespace-nowrap flex items-center gap-4 text-zinc-400">
              <Fingerprint className="w-5 h-5 text-brand-text" /> Asset Fingerprinting Active
            </span>
            <span className="text-meta whitespace-nowrap flex items-center gap-4 text-zinc-400">
              <Globe className="w-5 h-5 text-brand-text" /> Global Infrastructure: 12.8k Nodes
            </span>
            <span className="text-meta whitespace-nowrap flex items-center gap-4 text-zinc-400">
              <Zap className="w-5 h-5 text-brand-text" /> Average Classification Latency: 140ms
            </span>
            <span className="text-meta whitespace-nowrap flex items-center gap-4 text-zinc-400">
              <Shield className="w-5 h-5 text-brand-text" /> IP Protection Protocol Active
            </span>
          </div>
        </Marquee>
      </section>

      {/* Bento Stats: High-Density Intelligence */}
      <section className="macro-spacing px-6 md:px-12 max-w-[1500px] mx-auto space-y-16">
        <div className="flex flex-col md:flex-row justify-between items-end gap-10">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-display font-black uppercase">Deep Intelligence <br /> <span className="text-brand-muted">at Scale.</span></h2>
            <p className="text-brand-muted text-xl max-w-xl">A unified view of your digital sovereignty, powered by the industry&apos;s most advanced Gemini-Flash classification pipeline.</p>
          </div>
          <Button variant="secondary" className="group">
            Detailed Analytics <ArrowUpRight className="ml-2 w-4 h-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
          </Button>
        </div>

        <div className="bento-grid grid grid-cols-12 grid-rows-2 gap-px bg-brand-border border border-brand-border overflow-hidden rounded-2xl shadow-soft">
          {/* Main Growth Metric */}
          <div className="bento-item col-span-12 md:col-span-8 row-span-1 bg-brand-surface p-12 lg:p-16 flex flex-col justify-between group cursor-default">
            <div className="flex justify-between items-start">
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 group-hover:border-zinc-200 transition-colors">
                <Shield className="w-10 h-10 text-brand-text transition-transform group-hover:scale-110" />
              </div>
              <div className="text-right">
                <p className="text-meta text-brand-accent">Live Inventory</p>
                <p className="text-xs font-medium text-brand-muted mt-1">+12% this month</p>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-7xl md:text-[10rem] font-display font-black tracking-tighter leading-none">
                <span className="stat-assets">0</span>
              </p>
              <div className="flex items-center gap-4">
                <p className="text-xl font-display font-bold uppercase tracking-tight text-brand-muted">Fingerprinted Assets Secured</p>
                <div className="h-px flex-1 bg-zinc-100" />
              </div>
            </div>
          </div>

          {/* Violations Monitoring */}
          <div className="bento-item col-span-12 md:col-span-4 row-span-1 bg-zinc-50 p-12 lg:p-16 flex flex-col justify-between group">
            <AlertCircle className="w-12 h-12 text-zinc-300 group-hover:text-brand-accent transition-colors" />
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-meta">Active Violations</h4>
                <p className="text-8xl font-display font-black stat-violations text-brand-accent">0</p>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                  <div className="h-full w-[42%] bg-brand-accent" />
                </div>
                <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest text-right">42% Critical Severity</p>
              </div>
            </div>
          </div>

          {/* Global Nodes */}
          <div className="bento-item col-span-12 md:col-span-4 row-span-1 bg-brand-surface p-12 lg:p-16 group">
            <div className="flex flex-col h-full justify-between">
              <Globe className="w-8 h-8 text-zinc-300 group-hover:text-blue-500 transition-colors" />
              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-5xl font-display font-black stat-nodes">0</p>
                  <p className="text-meta">Tracking Nodes</p>
                </div>
                <p className="text-xl font-display font-semibold uppercase tracking-tight leading-tight">Global coverage spanning 148 CDN nodes for zero-day protection.</p>
              </div>
            </div>
          </div>

          {/* Savings / Efficiency */}
          <div className="bento-item col-span-12 md:col-span-8 row-span-1 bg-brand-surface p-12 lg:p-16 flex items-center gap-12 group hover:bg-zinc-50 transition-colors cursor-pointer border-l-0">
            <div className="relative">
              <BarChart3 className="w-20 h-20 text-zinc-100 group-hover:text-zinc-200 transition-colors" />
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-brand-text opacity-0 group-hover:opacity-100 transition-all group-hover:scale-125" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="text-4xl font-display font-black uppercase">Savings Index</p>
                <Badge variant="success">91.2% Efficient</Badge>
              </div>
              <p className="text-brand-muted text-xl font-sans max-w-[50ch] font-medium leading-[1.4]">
                Our autonomous classification engine eliminates 91.2% of manual legal review, saving teams hundreds of hourly resources.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Flagship Footer */}
      <footer className="py-32 px-6 md:px-12 bg-white border-t border-brand-border">
        <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row justify-between items-start gap-20">
          <div className="space-y-8">
            <h3 className="text-6xl md:text-8xl font-display font-black uppercase tracking-tighter">DeepTrace</h3>
            <p className="text-brand-muted max-w-sm text-lg font-medium">Securing the next generation of digital media sovereignty through agentic intelligence.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-20 gap-y-12">
            <div className="space-y-4">
              <h4 className="text-meta">Platform</h4>
              <ul className="space-y-3 text-sm font-bold text-brand-muted">
                <li className="hover:text-brand-text cursor-pointer transition-colors">Asset Library</li>
                <li className="hover:text-brand-text cursor-pointer transition-colors">Global Scan</li>
                <li className="hover:text-brand-text cursor-pointer transition-colors">Legal Triage</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-meta">Intelligence</h4>
              <ul className="space-y-3 text-sm font-bold text-brand-muted">
                <li className="hover:text-brand-text cursor-pointer transition-colors">Gemini Node</li>
                <li className="hover:text-brand-text cursor-pointer transition-colors">Vision Grid</li>
                <li className="hover:text-brand-text cursor-pointer transition-colors">API Docs</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-meta">Connect</h4>
              <ul className="space-y-3 text-sm font-bold text-brand-muted">
                <li className="hover:text-brand-text cursor-pointer transition-colors">Twitter (X)</li>
                <li className="hover:text-brand-text cursor-pointer transition-colors">LinkedIn</li>
                <li className="hover:text-brand-text cursor-pointer transition-colors">Security</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-[1500px] mx-auto mt-32 pt-12 border-t border-zinc-100 flex flex-col md:flex-row justify-between gap-6">
          <p className="text-meta text-zinc-300">© 2026 DeepTrace Systems. All rights reserved.</p>
          <p className="text-meta text-zinc-300">Sovereignty through Transparency.</p>
        </div>
      </footer>
    </main>
  );
}
