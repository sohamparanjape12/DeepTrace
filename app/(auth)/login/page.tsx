'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-provider';
import { Shield } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { resolvedTheme } = useTheme();
  const router = useRouter();

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-brand-text border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Left: Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-neutral-950 dark:bg-brand-text flex-col justify-between p-16 relative overflow-hidden">
        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 60px)',
            filter: resolvedTheme === 'dark' ? 'invert(1)' : 'none',
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-bg/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-brand-bg" />
          </div>
          <span className="font-display font-black text-lg text-brand-bg tracking-tight">DeepTrace</span>
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-6xl font-display font-black text-brand-bg uppercase leading-[0.9] tracking-tight">
            Trace the <br />
            <span className="text-brand-bg/40">Untraceable.</span>
          </h1>
          <p className="text-neutral-200 text-lg font-medium max-w-sm leading-relaxed dark:text-neutral-800">
            Autonomous AI scanning for sports media IP across the entire open web.
          </p>
          <div className="flex items-center gap-3 pt-4">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-300 dark:text-neutral-800">All Systems Operational</p>
          </div>
        </div>

        <div className="relative z-10 border-t border-brand-bg/10 pt-8">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-300 dark:text-neutral-800">
            © 2026 DeepTrace Systems
          </p>
        </div>
      </div>

      {/* Right: Sign-In Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-sm space-y-10">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-text flex items-center justify-center">
              <Shield className="w-4 h-4 text-brand-bg" />
            </div>
            <span className="font-display font-black text-lg uppercase tracking-tight">DeepTrace</span>
          </div>

          <div className="space-y-3">
            <h2 className="font-display font-black text-4xl uppercase tracking-tight leading-tight">Welcome<br />back.</h2>
            <p className="text-brand-muted font-medium">Sign in to access your IP dashboard.</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-4 px-6 py-4 rounded-xl border-2 border-brand-border bg-brand-surface hover:border-brand-text hover:shadow-soft-lg transition-all duration-300 group"
            >
              {/* Google SVG icon */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="font-black text-sm uppercase tracking-widest text-brand-text group-hover:text-brand-text transition-colors">
                Continue with Google
              </span>
            </button>
          </div>

          <p className="text-[10px] font-bold text-brand-muted text-center leading-relaxed">
            By signing in, you agree to DeepTrace&apos;s{' '}
            <span className="underline cursor-pointer hover:text-brand-text transition-colors">Terms of Service</span>
            {' '}and{' '}
            <span className="underline cursor-pointer hover:text-brand-text transition-colors">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
