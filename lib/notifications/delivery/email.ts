import nodemailer from 'nodemailer';
import { db } from '../../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { NotificationDoc } from '../types';

// ── Transport ─────────────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── Immediate Email ───────────────────────────────────────────────────────────

export async function sendImmediateEmail(
  notification: NotificationDoc,
  userEmail: string
): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[Notifications] SMTP not configured — skipping email delivery');
    return;
  }

  const from = process.env.SMTP_FROM || `DeepTrace <no-reply@deeptrace.app>`;
  const actionHtml = notification.action
    ? `<div style="margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.deeptrace.io'}${notification.action.href}"
           style="background:#1A1A1A;color:#FAFAFA;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">
          ${notification.action.label}
        </a>
       </div>`
    : '';

  const severityColor: Record<string, string> = {
    critical: '#DC2626',
    high: '#F59E0B',
    medium: '#3B82F6',
    info: '#10B981',
  };
  const accentColor = severityColor[notification.severity] || '#1A1A1A';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAFAFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#FFFFFF;border:1px solid #EAEAEA;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:0;background:${accentColor};height:4px;"></td>
    </tr>
    <tr>
      <td style="padding:32px 40px 0;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;color:#787774;">DeepTrace</p>
        <h1 style="margin:0;font-size:20px;font-weight:900;color:#1A1A1A;letter-spacing:-0.02em;line-height:1.2;">${notification.title}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 40px 0;">
        <p style="margin:0;font-size:14px;color:#787774;line-height:1.6;">${notification.body}</p>
        ${actionHtml}
      </td>
    </tr>
    <tr>
      <td style="padding:32px 40px;border-top:1px solid #EAEAEA;margin-top:32px;">
        <p style="margin:0;font-size:11px;color:#A0A0A0;">
          You received this because you have in-app notifications enabled for <strong>${notification.category}</strong> events.
          <br>Manage your notification preferences in your DeepTrace settings.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from,
      to: userEmail,
      subject: notification.title,
      html,
      text: `${notification.title}\n\n${notification.body}${notification.action ? `\n\n${notification.action.label}: ${process.env.NEXT_PUBLIC_APP_URL || ''}${notification.action.href}` : ''}`,
    });

    // Log delivery success back to the notification doc
    if (notification.id) {
      await db.collection('notifications').doc(notification.id).update({
        email_meta: { sent_at: new Date().toISOString(), status: 'sent', to: userEmail },
      });
    }
  } catch (err) {
    console.error('[Notifications] Email delivery failed:', err);
    if (notification.id) {
      await db.collection('notifications').doc(notification.id).update({
        email_meta: { status: 'failed', error: String(err) },
      });
    }
    throw err;
  }
}

// ── Daily Digest Bucket ───────────────────────────────────────────────────────

export async function appendToDigestBucket(
  userId: string,
  notificationId: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  const ref = db
    .collection('notification_digests')
    .doc(userId)
    .collection('daily')
    .doc(today);

  await ref.set(
    {
      items: FieldValue.arrayUnion(notificationId),
      status: 'pending',
      updated_at: new Date().toISOString(),
    },
    { merge: true }
  );
}

// ── Daily Digest Send ─────────────────────────────────────────────────────────

export async function sendDigestEmail(
  userId: string,
  userEmail: string,
  notifications: NotificationDoc[]
): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[Notifications] SMTP not configured — skipping digest delivery');
    return;
  }

  if (notifications.length === 0) return;

  const rowsHtml = notifications
    .map((n) => {
      const severityColor: Record<string, string> = {
        critical: '#DC2626', high: '#F59E0B', medium: '#3B82F6', info: '#10B981',
      };
      const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${severityColor[n.severity] || '#A0A0A0'};margin-right:8px;"></span>`;
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #EAEAEA;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#1A1A1A;">${dot}${n.title}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#787774;">${n.body}</p>
          ${n.action ? `<a href="${process.env.NEXT_PUBLIC_APP_URL || ''}${n.action.href}" style="font-size:11px;color:#1A1A1A;font-weight:700;text-decoration:underline;">${n.action.label} →</a>` : ''}
        </td>
      </tr>`;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#FAFAFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#FFFFFF;border:1px solid #EAEAEA;border-radius:12px;overflow:hidden;">
    <tr><td style="padding:32px 40px 0;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;color:#787774;">DeepTrace</p>
      <h1 style="margin:0;font-size:20px;font-weight:900;color:#1A1A1A;letter-spacing:-0.02em;">Daily Digest</h1>
      <p style="margin:8px 0 0;font-size:13px;color:#787774;">${notifications.length} notification${notifications.length !== 1 ? 's' : ''} from today</p>
    </td></tr>
    <tr><td style="padding:24px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
    </td></tr>
    <tr><td style="padding:24px 40px;border-top:1px solid #EAEAEA;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/notifications"
         style="background:#1A1A1A;color:#FAFAFA;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">
        View All Notifications
      </a>
    </td></tr>
    <tr><td style="padding:24px 40px;">
      <p style="margin:0;font-size:11px;color:#A0A0A0;">Manage preferences in your DeepTrace settings.</p>
    </td></tr>
  </table>
</body>
</html>`;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `DeepTrace <no-reply@deeptrace.app>`,
    to: userEmail,
    subject: `DeepTrace Daily Digest — ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`,
    html,
    text: notifications.map((n) => `• ${n.title}\n  ${n.body}`).join('\n\n'),
  });
}
