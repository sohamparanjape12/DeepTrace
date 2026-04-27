import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { draftNotice } from '@/lib/dmca/drafter';
import { resolveHost } from '@/lib/dmca/host-resolver';
import { Asset, Violation } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { DMCANotice, NoticeDraft } from '@/lib/dmca/types';

export async function POST(req: NextRequest) {
  try {
    const { violationId } = await req.json();
    if (!violationId) return NextResponse.json({ error: 'Missing violationId' }, { status: 400 });

    const vDoc = await db.collection('violations').doc(violationId).get();
    if (!vDoc.exists) return NextResponse.json({ error: 'Violation not found' }, { status: 404 });
    const violation = vDoc.data() as Violation;

    const aDoc = await db.collection('assets').doc(violation.asset_id).get();
    if (!aDoc.exists) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    const asset = aDoc.data() as Asset;

    const [draft, host] = await Promise.all([
      draftNotice(violation, asset),
      resolveHost(violation.match_url)
    ]);

    const noticeId = uuidv4();
    const notice: DMCANotice = {
      id: noticeId,
      violation_id: violationId,
      asset_id: asset.id || asset.asset_id || '',
      customer_id: violation.owner_id,
      host: host || { domain: 'unknown', source: 'manual', resolved_at: new Date().toISOString() },
      draft: { ...draft, model: 'gemini-3.1-pro', generated_at: new Date().toISOString() },
      status: 'drafting',
      status_history: [{ status: 'drafting', at: new Date().toISOString() }]
    };

    await db.collection('dmca_notices').doc(noticeId).set(notice);
    
    // Update violation dmca status
    await db.collection('violations').doc(violationId).update({
      dmca_status: 'drafting',
      dmca_notice_id: noticeId
    });

    return NextResponse.json({ success: true, noticeId, draft, host });
  } catch (error: any) {
    console.error('Draft generation failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
