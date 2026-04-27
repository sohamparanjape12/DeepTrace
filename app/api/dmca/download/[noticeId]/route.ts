import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { renderToBuffer } from '@react-pdf/renderer';
import { NoticePDF } from '@/lib/dmca/pdf';
import { DMCANotice, NoticeInput } from '@/lib/dmca/types';
import { Asset, Violation } from '@/types';
import React from 'react';

export async function GET(req: NextRequest, props: { params: Promise<{ noticeId: string }> }) {
  try {
    const { noticeId } = await props.params;
    
    const nDoc = await db.collection('dmca_notices').doc(noticeId).get();
    if (!nDoc.exists) return new NextResponse('Notice not found', { status: 404 });
    const notice = nDoc.data() as DMCANotice;
    
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
      original_url: asset?.url || asset?.storageUrl || '',
      infringing_url: violation?.match_url || '',
      signature: customer?.dmca_attestation?.authorized_agent_name || 'Authorized Agent'
    };

    const date = notice.dispatched_at ? notice.dispatched_at.split('T')[0] : new Date().toISOString().split('T')[0];
    
    const pdfBuffer = await renderToBuffer(React.createElement(NoticePDF, { input: noticeInput, date: date }) as any);
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="DMCA_Notice_${noticeId}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Download PDF error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
