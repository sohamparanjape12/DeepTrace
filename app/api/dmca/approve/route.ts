import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { generateAndUploadPDF } from '@/lib/dmca/pdf';
import { dispatch } from '@/lib/dmca/dispatcher';
import { DMCANotice, NoticeInput } from '@/lib/dmca/types';
import { Asset, Violation } from '@/types';

export async function POST(req: NextRequest) {
  try {
    // We assume authentication is handled and user ID is available in real app, we'll use a dummy 'auto' or passed from client
    const { noticeId, edits, hostEdits, approverId = 'user_auto' } = await req.json();
    if (!noticeId) return NextResponse.json({ error: 'Missing noticeId' }, { status: 400 });

    const nDoc = await db.collection('dmca_notices').doc(noticeId).get();
    if (!nDoc.exists) return NextResponse.json({ error: 'Notice not found' }, { status: 404 });
    let notice = nDoc.data() as DMCANotice;

    if (edits || hostEdits) {
      const updateData: any = {};
      if (edits) {
        notice.draft = { ...notice.draft, ...edits };
        updateData.draft = notice.draft;
      }
      if (hostEdits) {
        notice.host = { ...notice.host, ...hostEdits };
        updateData.host = notice.host;
      }
      await db.collection('dmca_notices').doc(noticeId).update(updateData);
    }

    const [vDoc, aDoc, cDoc] = await Promise.all([
      db.collection('violations').doc(notice.violation_id).get(),
      db.collection('assets').doc(notice.asset_id).get(),
      db.collection('organizations').doc(notice.customer_id).get()
    ]);
    const violation = vDoc.data() as Violation;
    const asset = aDoc.data() as Asset;
    const customer = cDoc.data() as any;

    const noticeInput: NoticeInput = {
      ...notice.draft,
      customer_org_name: customer?.name || customer?.org_name || 'Organization',
      agent_name: notice.host.agent_name || 'Copyright Agent',
      original_url: asset.url || asset.storageUrl || '',
      infringing_url: violation.match_url,
      signature: customer?.dmca_attestation?.authorized_agent_name || 'Authorized Agent'
    };

    // 1. Generate PDF
    const { url: pdfUrl, buffer: pdfBuffer } = await generateAndUploadPDF(noticeInput, notice.customer_id, noticeId);
    
    // Update notice with PDF
    await db.collection('dmca_notices').doc(noticeId).update({ pdf_url: pdfUrl });
    
    // 2. Dispatch
    const dispatchResult = await dispatch(noticeId, approverId, pdfBuffer);

    if (!dispatchResult.success) {
      return NextResponse.json({ error: dispatchResult.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, pdfUrl });
  } catch (error: any) {
    console.error('Approval failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
