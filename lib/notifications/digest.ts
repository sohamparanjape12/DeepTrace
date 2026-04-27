import { db, auth } from '../firebase-admin';
import type { NotificationDoc } from './types';
import { sendDigestEmail } from './delivery/email';

/**
 * Called by the QStash hourly cron at /api/notifications/digest/cron
 *
 * For a given userId, reads today's digest bucket, sends the email,
 * and marks the bucket as sent. Does not send if bucket is empty.
 */
export async function runDigestForUser(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const bucketRef = db
    .collection('notification_digests')
    .doc(userId)
    .collection('daily')
    .doc(today);

  const bucketDoc = await bucketRef.get();
  if (!bucketDoc.exists) return;

  const bucket = bucketDoc.data();
  if (!bucket || bucket.status === 'sent') return;

  const notificationIds: string[] = bucket.items || [];
  if (notificationIds.length === 0) return;

  // Fetch the actual notification docs
  const notifDocs = await Promise.all(
    notificationIds.map((id) => db.collection('notifications').doc(id).get())
  );
  const notifications: NotificationDoc[] = notifDocs
    .filter((d) => d.exists)
    .map((d) => ({ id: d.id, ...d.data() } as NotificationDoc));

  if (notifications.length === 0) return;

  // Look up user email
  const userRecord = await auth.getUser(userId).catch(() => null);
  if (!userRecord?.email) {
    console.warn(`[Digest] No email for user ${userId}, skipping digest`);
    return;
  }

  await sendDigestEmail(userId, userRecord.email, notifications);

  await bucketRef.update({
    status: 'sent',
    sent_at: new Date().toISOString(),
  });
}

/**
 * Runs digests for all users whose digest_send_hour matches the current UTC hour.
 * Called by the cron route handler.
 */
export async function runDigestCron(): Promise<{ processed: number; errors: number }> {
  const currentHour = new Date().getUTCHours();
  let processed = 0;
  let errors = 0;

  const prefsSnap = await db
    .collection('notification_preferences')
    .where('email_digest', '==', 'daily')
    .where('digest_send_hour', '==', currentHour)
    .get();

  for (const doc of prefsSnap.docs) {
    const userId = doc.id;
    try {
      await runDigestForUser(userId);
      processed++;
    } catch (err) {
      errors++;
      console.error(`[Digest] Failed for user ${userId}:`, err);
    }
  }

  return { processed, errors };
}
