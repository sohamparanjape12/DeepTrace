import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await auth.verifyIdToken(token).catch(() => null);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const ref = db.collection('notifications').doc(id);
    const doc = await ref.get();

    if (!doc.exists || doc.data()?.user_id !== decoded.uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await ref.update({ archived_at: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Notifications] archive error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
