import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await auth.verifyIdToken(token).catch(() => null);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const snap = await db
      .collection('notifications')
      .where('user_id', '==', decoded.uid)
      .where('read_at', '==', null)
      .get();

    const now = new Date().toISOString();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.update(doc.ref, { read_at: now }));
    await batch.commit();

    return NextResponse.json({ ok: true, count: snap.size });
  } catch (err: any) {
    console.error('[Notifications] mark-all-read error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
