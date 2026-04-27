import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { parseCounterNotice } from '@/lib/dmca/counter-notice';
import { DMCANotice } from '@/lib/dmca/types';

export async function POST(req: NextRequest) {
  try {
    const { noticeId, text, signed_under_perjury, consents_to_jurisdiction } = await req.json();
    if (!noticeId || !text) return NextResponse.json({ error: 'Missing noticeId or text' }, { status: 400 });

    const nDoc = await db.collection('dmca_notices').doc(noticeId).get();
    if (!nDoc.exists) return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    const notice = nDoc.data() as DMCANotice;

    const parsedData = await parseCounterNotice(text);

    const counter_notice = {
      received_at: new Date().toISOString(),
      text,
      signed_under_perjury: signed_under_perjury || parsedData.signed_under_perjury || false,
      consents_to_jurisdiction: consents_to_jurisdiction || parsedData.consents_to_jurisdiction || false,
      parsed_fields: parsedData
    };

    const batch = db.batch();
    
    batch.update(nDoc.ref, {
      status: 'counter_notice',
      counter_notice,
      status_history: [...(notice.status_history || []), { status: 'counter_notice', at: new Date().toISOString() }]
    });

    const vRef = db.collection('violations').doc(notice.violation_id);
    batch.update(vRef, { dmca_status: 'counter_notice' });

    await batch.commit();

    return NextResponse.json({ success: true, counter_notice });
  } catch (error: any) {
    console.error('Counter notice processing failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
