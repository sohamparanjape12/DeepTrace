import { db } from '../firebase-admin';
import nodemailer from 'nodemailer';
import { DMCANotice, NoticeInput } from './types';
import { evaluateEligibility } from './eligibility';
import { Asset, Violation } from '../../types';
import { Client } from '@upstash/qstash';
import { renderNotice } from './template';
import crypto from 'crypto';
import { emitNotification } from '../notifications/emit';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
const qstash = new Client({ token: process.env.QSTASH_TOKEN || '' });

export interface DispatchResult {
  success: boolean;
  message?: string;
}

export async function dispatch(noticeId: string, approverId: string, pdfBuffer?: Buffer): Promise<DispatchResult> {
  const noticeRef = db.collection('dmca_notices').doc(noticeId);
  const noticeDoc = await noticeRef.get();
  
  if (!noticeDoc.exists) return { success: false, message: 'Notice not found' };
  
  const notice = noticeDoc.data() as DMCANotice;
  
  // Re-fetch violation & asset to re-validate eligibility
  const [vDoc, aDoc, cDoc] = await Promise.all([
    db.collection('violations').doc(notice.violation_id).get(),
    db.collection('assets').doc(notice.asset_id).get(),
    db.collection('organizations').doc(notice.customer_id).get()
  ]);

  if (!vDoc.exists || !aDoc.exists || !cDoc.exists) {
    return { success: false, message: 'Missing referenced entities' };
  }

  const violation = vDoc.data() as Violation;
  const asset = aDoc.data() as Asset;
  const customer = cDoc.data() as any;

  const eligibility = evaluateEligibility(violation, asset, customer);
  // Bypass 'already_in_flight' since we're dispatching THIS notice
  const isEligible = eligibility.blocked_by.filter(b => b !== 'already_in_flight').length === 0;

  if (!isEligible) {
    return { success: false, message: 'Violation failed eligibility re-check' };
  }

  if (!notice.pdf_url) {
    return { success: false, message: 'Notice PDF not generated yet' };
  }

  const noticeInput: NoticeInput = {
    ...notice.draft,
    customer_org_name: customer.name || customer.org_name || 'Organization',
    agent_name: notice.host.agent_name || 'Copyright Agent',
    original_url: asset.url || asset.storageUrl || '',
    infringing_url: violation.match_url,
    signature: customer.dmca_attestation?.authorized_agent_name || 'Authorized Agent'
  };

  const { subject, body } = renderNotice(noticeInput);

  // Send Email via Resend
  const ccEmails = customer.legal_contact_email ? [customer.legal_contact_email] : [];
  const bccEmails = [process.env.DMCA_ARCHIVE_EMAIL || 'dmca-archive@deeptrace.app'];

  try {
    await transporter.sendMail({
      from: 'DMCA Takedowns <dmca@deeptrace.app>',
      to: notice.host.agent_email || 'abuse@example.com',
      cc: ccEmails,
      bcc: bccEmails,
      subject,
      text: body,
      attachments: [
        {
          filename: `DMCA_Notice_${noticeId}.pdf`,
          ...(pdfBuffer ? { content: pdfBuffer } : { href: notice.pdf_url })
        }
      ]
    });
  } catch (error) {
    console.error('Failed to send SMTP email:', error);
    return { success: false, message: 'Failed to send email via SMTP' };
  }

  const now = new Date().toISOString();

  // Update Firestore records
  const batch = db.batch();
  
  batch.update(noticeRef, {
    status: 'sent',
    dispatched_at: now,
    approved_by: approverId,
    status_history: [...(notice.status_history || []), { status: 'sent', at: now }]
  });

  batch.update(vDoc.ref, {
    dmca_status: 'sent',
    dmca_notice_id: noticeId
  });

  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  const auditRef = db.collection('dmca_audit_log').doc();
  
  batch.set(auditRef, {
    notice_id: noticeId,
    violation_id: notice.violation_id,
    customer_id: notice.customer_id,
    dispatched_at: now,
    approver: approverId,
    model_used: notice.draft.model,
    body_hash: bodyHash,
    evidence_url: violation.match_url,
    original_url: asset.url || asset.storageUrl || '',
    action: 'DISPATCHED'
  });

  await batch.commit();

  // Emit notification — fire-and-forget
  void emitNotification({
    user_id: notice.customer_id,
    event_type: 'dmca.dispatched',
    payload: {
      notice_id: noticeId,
      violation_id: notice.violation_id,
      asset_id: notice.asset_id,
    },
    source_event_id: `dmca.dispatched:${noticeId}`,
  });

  // Schedule QStash task for T+7 days
  if (process.env.QSTASH_TOKEN) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await qstash.publishJSON({
        url: `${appUrl}/api/dmca/status/${noticeId}/verify`,
        body: { noticeId },
        delay: '7d'
      });
    } catch (qErr) {
      console.error('Failed to schedule QStash verification', qErr);
    }
  }

  return { success: true };
}
