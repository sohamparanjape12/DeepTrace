'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { GlobalProgressBanner } from '@/components/shared/GlobalProgressBanner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If Firebase keys are set and user is not authenticated, redirect to login
    const hasFirebaseConfig = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!loading && !user && hasFirebaseConfig) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-brand-text border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <Sidebar />
      <main className="ml-60 min-h-screen">
        <div className="max-w-[1200px] mx-auto px-8 py-12">
          {children}
        </div>
      </main>
      <GlobalProgressBanner />
    </div>
  );
}
