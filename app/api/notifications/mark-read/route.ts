import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await auth.verifyIdToken(token).catch(() => null);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const batch = db.batch();

    for (const id of ids.slice(0, 50)) {
      const ref = db.collection('notifications').doc(id);
      const doc = await ref.get();
      // Verify ownership before updating
      if (doc.exists && doc.data()?.user_id === decoded.uid) {
        batch.update(ref, { read_at: now });
      }
    }

    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Notifications] mark-read error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
