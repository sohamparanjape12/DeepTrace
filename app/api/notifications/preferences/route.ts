import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { getPreferences, savePreferences, DEFAULT_PREFERENCES } from '@/lib/notifications/preferences';

async function getUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return auth.verifyIdToken(token).catch(() => null);
}

export async function GET(req: NextRequest) {
  const decoded = await getUser(req);
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const prefs = await getPreferences(decoded.uid);
  return NextResponse.json(prefs);
}

export async function PUT(req: NextRequest) {
  const decoded = await getUser(req);
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    await savePreferences(decoded.uid, body);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
