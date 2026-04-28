'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Marquee } from '@/components/shared/Marquee';
import {
  Shield, Search, ArrowUpRight, Globe, Zap,
  Fingerprint, CheckCircle, X, Eye, Lock, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { LandingNav } from '@/components/layout/LandingNav';
import { LandingFooter } from '@/components/layout/LandingFooter';

gsap.registerPlugin(ScrollTrigger);

/* ─── Data ─────────────────────────────────────── */

const STATS = [
  { value: '2.4M+', label: 'Assets Protected' },
  { value: '147', label: 'Countries Covered' },
  { value: '<24h', label: 'Avg. Takedown Time' },
  { value: '99.8%', label: 'Detection Accuracy' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Discovery',
    description: 'Global crawler network scans for unauthorized matches using computer vision.',
    icon: Globe,
  },
  {
    step: '02',
    title: 'Gating',
    description: 'Perceptual filtering drops noise by verifying pHash and dHash distances.',
    icon: Shield,
  },
  {
    step: '03',
    title: 'Scraping',
    description: 'Automated extraction of page context for deep forensic auditing.',
    icon: Search,
  },
  {
    step: '04',
    title: 'Classification',
    description: 'Autonomous AI classifies violation types and financial impact.',
    icon: Zap,
  },
  {
    step: '05',
    title: 'Strike',
    description: 'Immediate resolution pathways for automated takedown enforcement.',
    icon: Lock,
  },
];

const TESTIMONIALS = [
  {
    quote:
      'DeepTrace identified 340 unlicensed uses of our catalog within the first week. The automated takedown pipeline is remarkable.',
    author: 'Mara Svensson',
    role: 'Head of IP, Nexus Studio',
    dark: false,
  },
  {
    quote:
      'We recovered $180k in licensing fees in Q1 alone. This is the infrastructure every creative agency needs.',
    author: 'James Okafor',
    role: 'COO, Vantage Media',
    dark: true,
  },
  {
    quote:
      'The fingerprinting caught our images even after heavy AI editing. The detection rate is unlike anything we\'ve seen.',
    author: 'Priya Nair',
    role: 'Legal Director, Luminary Press',
    dark: false,
  },
];

/* ─── Scan UI mock data ─────────────────────────── */
const SCAN_HITS = [
  { domain: 'blog.example.com', status: 'match', conf: '99.2%' },
  { domain: 'cdn.marketplace.io', status: 'match', conf: '97.8%' },
  { domain: 'assets.unknown.net', status: 'review', conf: '84.1%' },
  { domain: 'static.news-site.co', status: 'match', conf: '98.4%' },
];
const SCAN_STATS = [
  { label: 'Scanned', val: '1.4M' },
  { label: 'Matches', val: '23' },
  { label: 'Resolved', val: '18' },
];

/* ─── Bar chart bar heights (deterministic) ──────── */
const BAR_HEIGHTS = [28, 55, 38, 72, 44, 61, 30, 80, 47, 65, 33, 78,
  42, 58, 25, 70, 50, 35, 68, 45, 73, 29, 60, 40, 55, 36, 77, 48, 62, 31,
  56, 43, 71, 38, 64, 27, 53, 46, 69, 34];
const WAVEFORM = [4, 7, 5, 9, 6, 8, 4, 7, 5, 9];

/* ─── Forensic Card Component ──────────────────── */
function ForensicCard({
  img, confidence, id, layer, progress, isMain = false
}: {
  img: string, confidence: string, id: string, layer: string, progress: number, isMain?: boolean
}) {
  return (
    <div className={`relative bg-brand-surface border border-brand-border rounded-[2rem] overflow-hidden shadow-soft-lg group/card transition-all duration-700 ${isMain ? 'hover:shadow-xl' : ''}`}>
      <div className="p-1.5">
        <div className="relative aspect-[4/5] rounded-[1.4rem] overflow-hidden bg-brand-bg border border-brand-border">
          <img
            src={img}
            alt="Forensic Asset"
            className={`w-full h-full object-cover ${isMain ? 'opacity-90' : 'grayscale opacity-60'} transition-transform duration-[4s] group-hover/card:scale-110`}
          />
          {isMain && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-accent/20 to-transparent h-1/4 w-full animate-scan" />
          )}
          <div className="absolute inset-4 pointer-events-none opacity-20">
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-brand-accent" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-brand-accent" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-brand-accent" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-brand-accent" />
          </div>
        </div>
      </div>

      <div className="px-6 py-5 pt-4 space-y-4">
        <div className="flex justify-between items-end">
          <div className="space-y-0.5">
            <p className="text-[9px] font-black tracking-widest text-brand-muted">Confidence</p>
            <p className="text-2xl font-display font-black text-brand-text tracking-tighter">{confidence}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono text-brand-muted">{id}</p>
          </div>
        </div>

        <div className="h-0.5 bg-brand-border rounded-full overflow-hidden">
          <div className="h-full bg-brand-accent transition-all duration-1000" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full bg-green-500 ${isMain ? 'animate-pulse' : ''}`} />
            <span className="text-[9px] font-black tracking-[0.2em] text-brand-text">Verified Secure</span>
          </div>
          <span className="text-[9px] font-black tracking-[0.2em] text-brand-muted">{layer}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Component ─────────────────────────────────── */
export default function Home() {
  const container = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    /* Hero entrance */
    const tl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.8 } });
    tl.from('.hero-title', { y: 120, opacity: 0, filter: 'blur(10px)' })
      .from('.hero-sub', { y: 40, opacity: 0, filter: 'blur(5px)' }, '-=1.4')
      .from('.hero-cta', { y: 30, opacity: 0, stagger: 0.15 }, '-=1.2')
      .from('.hero-visual-bg', { y: 60, rotation: 0, opacity: 0, stagger: 0.1, duration: 2 }, '-=1.6')
      .from('.hero-visual', { scale: 0.9, opacity: 0, filter: 'blur(20px)', duration: 2.2 }, '-=1.8');

    /* Nav shrink on scroll */
    gsap.to(navRef.current, {
      scrollTrigger: { start: 'top -100', end: 'top -300', scrub: 1 },
      scale: 0.95, y: -8,
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    });

    /* Bento reveal */
    gsap.from('.bento-item', {
      scrollTrigger: { trigger: '.bento-grid', start: 'top 85%' },
      y: 80, rotationX: 8, opacity: 0, filter: 'blur(10px)',
      stagger: { amount: 0.6, grid: [2, 2], from: 'start' },
      duration: 1.8, ease: 'expo.out', clearProps: 'all',
    });

    /* Stats */
    gsap.from('.stat-item', {
      scrollTrigger: { trigger: '.stats-section', start: 'top 85%' },
      y: 30, opacity: 0, stagger: 0.1, duration: 1, ease: 'power3.out',
    });

    /* How it works */
    gsap.from('.how-step', {
      scrollTrigger: { trigger: '.how-section', start: 'top 80%' },
      y: 50, opacity: 0, stagger: 0.15, duration: 1.2, ease: 'power3.out',
    });

    /* Testimonials */
    gsap.from('.testimonial-card', {
      scrollTrigger: { trigger: '.testimonials-section', start: 'top 80%' },
      y: 40, opacity: 0, stagger: 0.12, duration: 1.2, ease: 'power3.out',
    });
  }, { scope: container });

  return (
    <main
      ref={container}
      className="bg-brand-bg min-h-screen selection:bg-brand-accent/20 relative overflow-x-hidden"
    >
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

      {/* ── Hero ───────────────────────────────────── */}
      <section className="macro-spacing px-6 flex flex-col lg:flex-row gap-16 max-w-6xl mx-auto min-h-[92dvh] items-center relative z-10 pt-40 lg:pt-20">
        {/* Left copy */}
        <div className="lg:w-1/2 space-y-10 mt-8">
          <div className="overflow-visible py-4 -my-4">
            <h1 className="hero-title text-6xl md:text-[4.8rem] font-display font-black leading-[0.88] tracking-[-0.05em] text-zinc-950 dark:text-white">
              Protect your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 via-zinc-950 to-zinc-950 dark:from-white/60 dark:via-white dark:to-white/20">
                sports media.
              </span>
            </h1>
          </div>

          <p className="hero-sub text-base md:text-lg text-zinc-500 dark:text-white/40 max-w-md font-medium leading-relaxed">
            A specialized forensics platform for sports organizations to identify unauthorized use, watermark removal, and unlicensed distribution of official media.
          </p>

          <div className="hero-cta flex flex-wrap gap-4">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-14 px-10 text-[11px] font-black tracking-[0.2em] flex items-center gap-3
                  rounded-full bg-zinc-950 dark:bg-white text-white dark:text-black
                  hover:bg-brand-accent hover:text-white transition-all shadow-lg"
              >
                Start Protecting <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button
                variant="secondary"
                size="lg"
                className="h-14 px-10 text-[11px] font-black tracking-[0.2em]
                  rounded-full border-zinc-200 dark:border-white/10 bg-transparent
                  text-zinc-500 dark:text-white/40
                  hover:text-zinc-950 dark:hover:text-white hover:border-zinc-400 dark:hover:border-white/20 transition-all"
              >
                See How It Works
              </Button>
            </Link>
          </div>

          {/* Trust micro-badges */}
          <div className="hero-cta flex flex-wrap items-center gap-4 pt-2">
            {['Visual Fingerprinting', 'Automated Takedowns', 'Rights Intelligence'].map((label) => (
              <span
                key={label}
                className="flex items-center gap-2 text-[10px] font-black tracking-widest text-zinc-400 dark:text-white/20"
              >
                <CheckCircle className="w-3.5 h-3.5 text-brand-accent shrink-0" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Right: Minimal Forensic Viewport Stack */}
        <div className="hero-visual lg:w-1/2 w-full relative flex justify-center lg:justify-end items-center overflow-visible">
          <div className="relative w-full max-w-[320px] h-[450px] overflow-visible flex justify-center items-center">
            {/* Background Card Left */}
            <div className="absolute w-full -translate-x-24 -rotate-[12deg] z-0 opacity-100 transition-all duration-700">
              <ForensicCard
                img="/images/sports-stadium.png"
                confidence="94.1%"
                id="#STD-142"
                layer="03"
                progress={82}
              />
            </div>

            {/* Background Card Right */}
            <div className="absolute w-full translate-x-24 rotate-[10deg] z-10 opacity-100 transition-all duration-700">
              <ForensicCard
                img="/images/sports-hero.png"
                confidence="97.4%"
                id="#BB-088"
                layer="02"
                progress={94}
              />
            </div>

            {/* Main Card (Center) */}
            <div className="relative z-20 w-full scale-105">
              <ForensicCard
                img="/images/sports-basketball.png"
                confidence="99.8%"
                id="#SPT-772"
                layer="01"
                progress={88}
                isMain
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ────────────────────────────────── */}
      <section className="border-y border-zinc-100 dark:border-white/5 py-8 overflow-hidden bg-zinc-50/50 dark:bg-black/40 backdrop-blur-sm">
        <Marquee speed={40}>
          <div className="flex items-center gap-20 py-2">
            {[
              { icon: Fingerprint, label: 'Visual Fingerprinting Active' },
              { icon: Globe, label: 'Global Protection Network' },
              { icon: Zap, label: 'Active Search Threads' },
              { icon: Shield, label: 'Licensed Sovereignty' },
              { icon: Lock, label: 'Automated Takedowns' },
              { icon: BarChart3, label: 'Real-Time Analytics' },
            ].map((item, i) => (
              <span
                key={i}
                className="text-[11px] font-black tracking-[0.35em] flex items-center gap-4 text-zinc-500 dark:text-white/40 shrink-0"
              >
                <item.icon className="w-4 h-4 opacity-70" /> {item.label}
              </span>
            ))}
          </div>
        </Marquee>
      </section>

      {/* ── Stats ──────────────────────────────────── */}
      <section className="stats-section py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-200 dark:bg-white/5 rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/5">
          {STATS.map((stat, i) => (
            <div key={i} className="stat-item bg-white dark:bg-zinc-950 px-8 py-10 flex flex-col gap-2">
              <p className="text-4xl md:text-5xl font-display font-black tracking-tight text-zinc-950 dark:text-white">
                {stat.value}
              </p>
              <p className="text-[11px] font-black tracking-[0.2em] text-zinc-400 dark:text-white/30">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Bento ─────────────────────────── */}
      <section id="features" className="macro-spacing px-6 max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-10">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-display font-black leading-none tracking-[-0.05em] text-zinc-950 dark:text-white">
              Full-Scale <br />
              <span className="text-zinc-500 dark:text-white/50">Media Protection.</span>
            </h2>
            <p className="text-zinc-500 dark:text-white/40 text-sm md:text-base max-w-md font-medium leading-relaxed border-l-2 border-brand-accent pl-5">
              Direct action tools to identify and resolve asset theft — from discovery to resolution.
            </p>
          </div>
          <Link href="/infrastructure">
            <Button
              variant="secondary"
              className="group h-11 px-8 rounded-full text-[11px] font-black tracking-[0.15em]
                border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/5
                text-zinc-500 dark:text-white/40
                hover:bg-zinc-100 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all shrink-0"
            >
              View Docs <ArrowUpRight className="ml-2 w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="bento-grid grid grid-cols-12 gap-px bg-zinc-200 dark:bg-white/5 border border-zinc-200 dark:border-white/5 overflow-hidden rounded-[2rem] shadow-2xl">

          {/* Discovery — large left */}
          <div id="discovery" className="bento-item col-span-12 md:col-span-7 bg-white dark:bg-zinc-950 p-10 lg:p-14 flex flex-col justify-between group cursor-default min-h-[360px]">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-white/20 group-hover:text-brand-accent group-hover:border-brand-accent/30 transition-all duration-500">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-black tracking-[0.25em] text-brand-accent">Discovery Layer</p>
            </div>

            {/* Deterministic bar chart */}
            <div className="relative h-20 my-8 flex items-end gap-0.5 overflow-hidden">
              {BAR_HEIGHTS.map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${i % 7 === 0 ? 'bg-brand-accent' : 'bg-zinc-100 dark:bg-white/8'}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            <div className="space-y-3 mt-auto">
              <h3 className="text-3xl md:text-5xl font-display font-black tracking-[-0.05em] text-zinc-950 dark:text-white leading-none">
                Automated <br />Visual Search
              </h3>
              <p className="text-zinc-500 dark:text-white/40 text-sm font-medium leading-relaxed max-w-sm">
                Our global crawler network scans millions of pages daily using advanced computer vision to find unauthorized media usage.
              </p>
            </div>
          </div>

          {/* Fingerprinting — right top */}
          <div id="analysis" className="bento-item col-span-12 md:col-span-5 bg-zinc-50 dark:bg-black/40 p-10 lg:p-14 flex flex-col justify-between group min-h-[360px]">
            <div className="flex items-center justify-between">
              <Fingerprint className="w-10 h-10 text-zinc-300 dark:text-white/10 group-hover:text-brand-accent transition-all duration-500" />
              {/* Waveform */}
              <div className="flex gap-1 items-end h-8">
                {WAVEFORM.map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-brand-accent/30 dark:bg-brand-accent/20 rounded-full animate-pulse"
                    style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-black tracking-[0.25em] text-brand-accent">Forensic Analysis</h4>
                <h3 className="text-3xl font-display font-black tracking-[-0.05em] text-zinc-950 dark:text-white leading-none">
                  AI Violation <br />Classification
                </h3>
              </div>
              <p className="text-zinc-500 dark:text-white/40 text-sm font-medium leading-relaxed max-w-xs">
                Deep Intelligence audits matches by comparing page context and metadata against official rights tiers.
              </p>
            </div>
          </div>

          {/* Global Network — left bottom */}
          <div className="bento-item col-span-12 md:col-span-5 bg-white dark:bg-zinc-950/60 p-10 lg:p-14 group min-h-[300px]">
            <div className="flex flex-col h-full justify-between gap-8">
              <div className="flex items-start justify-between">
                <Shield className="w-10 h-10 text-zinc-300 dark:text-white/10 group-hover:text-brand-accent transition-all duration-500" />
                {/* Concentric rings */}
                <div className="relative w-16 h-16 opacity-20 dark:opacity-10 group-hover:opacity-40 transition-opacity duration-500 shrink-0">
                  {[64, 48, 32, 16].map((sz) => (
                    <div
                      key={sz}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-accent"
                      style={{ width: sz, height: sz }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black tracking-[0.25em] text-zinc-400 dark:text-white/30">Infrastructure</h4>
                  <h3 className="text-3xl font-display font-black tracking-[-0.05em] text-zinc-950 dark:text-white leading-none">
                    Global <br />Network
                  </h3>
                </div>
                <p className="text-sm font-medium leading-relaxed text-zinc-500 dark:text-white/40 max-w-xs">
                  A robust, worldwide network ensuring your assets are protected 24/7 across 147 countries.
                </p>
              </div>
            </div>
          </div>

          {/* Automated Resolution — right bottom, dark */}
          <div id="resolution" className="bento-item col-span-12 md:col-span-7 bg-zinc-950 p-10 lg:p-14 flex items-center gap-10 group hover:bg-black transition-colors duration-700 cursor-pointer min-h-[300px]">
            <div className="w-16 h-16 shrink-0 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-brand-bg group-hover:text-brand-accent group-hover:border-brand-accent/50 transition-all duration-500">
              <Zap className="w-8 h-8" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-2xl font-display font-black text-white tracking-[-0.05em]">
                  Automated Takedowns
                </p>
                <div className="px-3 py-1 rounded-full bg-brand-accent text-white text-[10px] font-black tracking-widest shrink-0">
                  Resumable
                </div>
              </div>
              <p className="text-white/40 text-sm font-medium leading-relaxed max-w-sm">
                Immediate resolution pathways triggered by detected violations — including automated takedowns and licensing negotiations.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {['Resolution', 'Forensics', 'Intelligence'].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-black tracking-widest text-white/30 border border-white/10 rounded-full px-3 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────── */}
      <section id="how-it-works" className="how-section macro-spacing px-6 max-w-7xl mx-auto">
        <div className="space-y-3 mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-black tracking-[-0.05em] leading-none text-zinc-950 dark:text-white">
            Forensic Pipeline <br />
            <span className="text-zinc-500 dark:text-white/50">in five steps.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-px bg-zinc-200 dark:bg-white/5 border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={i}
              className={`how-step p-10 flex flex-col gap-8 ${i % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-zinc-50/70 dark:bg-black/40'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 flex items-center justify-center rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-white/20">
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="text-5xl font-display font-black text-zinc-100 dark:text-white/[0.04] tracking-tighter select-none">
                  {step.step}
                </span>
              </div>
              <div className="space-y-3 mt-auto">
                <h3 className="text-xl font-display font-black tracking-tight text-zinc-950 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-zinc-500 dark:text-white/40">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────── */}
      <section id="trust" className="testimonials-section macro-spacing px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight leading-none text-zinc-950 dark:text-white">
            Trusted by <br />
            <span className="text-zinc-500 dark:text-white/50">IP professionals.</span>
          </h2>
          <Badge className="text-[11px] font-black tracking-widest shrink-0">4.9 / 5 Rating</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className={`testimonial-card p-8 rounded-2xl border flex flex-col justify-between gap-8 ${t.dark
                ? 'bg-zinc-950 dark:bg-zinc-900 border-zinc-800'
                : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-white/5'
                }`}
            >
              <p className={`text-sm leading-relaxed font-medium ${t.dark ? 'text-white/60' : 'text-zinc-500 dark:text-white/40'}`}>
                "{t.quote}"
              </p>
              <div className="space-y-0.5">
                <p className={`text-sm font-black ${t.dark ? 'text-white' : 'text-zinc-950 dark:text-white'}`}>
                  {t.author}
                </p>
                <p className={`text-[11px] font-bold tracking-widest ${t.dark ? 'text-white/30' : 'text-zinc-400 dark:text-white/30'}`}>
                  {t.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className="macro-spacing px-6 max-w-7xl mx-auto pb-8">
        <div className="bg-zinc-950 dark:bg-zinc-900 rounded-3xl p-14 md:p-20 flex flex-col md:flex-row items-center justify-between gap-10 relative overflow-hidden border border-zinc-800">
          {/* Glows */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-brand-accent/5  rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <h2 className="text-4xl md:text-5xl font-display font-black tracking-[-0.05em] leading-none text-white">
              Start protecting <br />
              <span className="text-white/30">today.</span>
            </h2>
            <p className="text-white/40 text-base font-medium leading-relaxed max-w-sm">
              Join 2,400+ creators and studios securing their digital assets with DeepTrace.
            </p>
          </div>

          <div className="flex flex-col gap-3 shrink-0 relative z-10">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="h-14 px-10 text-[11px] font-black tracking-[0.2em] flex items-center gap-3
                  rounded-full bg-white text-black hover:bg-brand-accent hover:text-white transition-all shadow-2xl"
              >
                Start Free Trial <ArrowUpRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-[11px] font-bold tracking-widest text-white/25 text-center">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main >
  );
}
