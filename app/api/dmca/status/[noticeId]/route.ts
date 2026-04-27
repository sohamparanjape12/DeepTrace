import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET(req: NextRequest, { params }: { params: Promise<{ noticeId: string }> }) {
  try {
    const { noticeId } = await params;
    const nDoc = await db.collection('dmca_notices').doc(noticeId).get();
    
    if (!nDoc.exists) {
      return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    }

    const notice = nDoc.data();
    return NextResponse.json({
      status: notice?.status,
      history: notice?.status_history || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
