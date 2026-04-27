'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { GlobalProgressBanner } from '@/components/shared/GlobalProgressBanner';
import { NotificationStoreProvider, useNotificationStore } from '@/lib/notifications/store';
import { ToastProvider } from '@/components/notifications/ToastProvider';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';

// ── Inner layout (has access to store + auth) ─────────────────────────────────

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { dispatch } = useNotificationStore();

  // Auth guard
  useEffect(() => {
    const hasFirebaseConfig = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!loading && !user && hasFirebaseConfig) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Real-time notification listener — single onSnapshot for the whole session
  useEffect(() => {
    if (!user) return;
    console.log('[Notifications] Starting listener for user:', user.uid);

    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      where('archived_at', '==', null),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      console.log(`[Notifications] Received snapshot with ${snap.size} docs`);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
      
      // Sort manually since we removed orderBy for index safety
      docs.sort((a: any, b: any) => {
        const ta = a.created_at?.toDate?.()?.getTime() || 0;
        const tb = b.created_at?.toDate?.()?.getTime() || 0;
        return tb - ta;
      });

      dispatch({ type: 'SET_ITEMS', items: docs });
    }, (err) => {
      console.error('[Notifications] onSnapshot error:', err);
    });

    return unsub;
  }, [user, dispatch]);

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
      <ToastProvider />
    </div>
  );
}

// ── Outer layout (provides store) ─────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationStoreProvider>
      <AppLayoutInner>{children}</AppLayoutInner>
    </NotificationStoreProvider>
  );
}
