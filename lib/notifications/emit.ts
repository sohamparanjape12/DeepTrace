import { db, auth } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';
import { EmitInputSchema, type EmitInput } from './types';
import { TAXONOMY, TEMPLATES } from './taxonomy';
import { getPreferences, isInQuietHours } from './preferences';
import { sendImmediateEmail, appendToDigestBucket } from './delivery/email';

/**
 * The single fire-and-forget entry point for the notification system.
 *
 * Pipeline code calls this as: void emitNotification({ ... })
 *
 * It NEVER throws — all failures are swallowed after logging so the caller
 * (classifier, dispatcher, scan route) is never blocked.
 */
export async function emitNotification(input: EmitInput): Promise<void> {
  try {
    // 1. Validate input
    const parsed = EmitInputSchema.safeParse(input);
    if (!parsed.success) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Notifications] Invalid emit input:', parsed.error.flatten());
      }
      return;
    }
    const data = parsed.data;

    if (!data.user_id && !data.org_id) {
      console.warn('[Notifications] emit called with neither user_id nor org_id — skipping');
      return;
    }

    // 2. Idempotency check
    const existing = await db
      .collection('notifications')
      .where('source_event_id', '==', data.source_event_id)
      .limit(1)
      .get();
    if (!existing.empty) return;

    // 3. Resolve recipient user IDs
    let recipientIds: string[] = [];
    if (data.user_id) {
      recipientIds = [data.user_id];
    } else if (data.org_id) {
      // Fan out to all org members
      const usersSnap = await db
        .collection('assets')
        .where('org_id', '==', data.org_id)
        .select('owner_id')
        .limit(50)
        .get();
      const ids = new Set<string>();
      usersSnap.docs.forEach((d) => {
        const ownerId = d.data().owner_id;
        if (ownerId) ids.add(ownerId);
      });
      recipientIds = [...ids];
    }

    if (recipientIds.length === 0) return;

    // 4. Resolve taxonomy + render templates
    const taxonomy = TAXONOMY[data.event_type];
    const templateFn = TEMPLATES[data.event_type];
    const rendered = templateFn(data.payload);

    console.log(`[Notifications] Emitting "${data.event_type}" to ${recipientIds.length} users`);

    // 5. Fan-out: write one doc per recipient
    for (const userId of recipientIds) {
      try {
        const prefs = await getPreferences(userId);
        const inQuiet = isInQuietHours(prefs);
        const catChannels = prefs.channels[taxonomy.category];

        // Determine channels to deliver
        let channels = data.override_channels ?? taxonomy.defaultChannels;

        // Filter against user channel prefs
        channels = channels.filter((ch) => {
          if (ch === 'in_app')           return catChannels.in_app;
          if (ch === 'toast')            return catChannels.toast && !inQuiet;
          if (ch === 'email_immediate')  return catChannels.email && !inQuiet;
          return true;
        });

        // Critical in_app is always delivered regardless of prefs
        if (taxonomy.severity === 'critical' && !channels.includes('in_app')) {
          channels = ['in_app', ...channels];
        }

        // Write notification doc
        const notifId = uuidv4();
        const docData = {
          user_id: userId,
          org_id: data.org_id ?? null,
          event_type: data.event_type,
          category: taxonomy.category,
          severity: taxonomy.severity,
          title: rendered.title,
          body: rendered.body,
          action: rendered.action ?? null,
          payload: data.payload,
          channels_delivered: channels,
          read_at: null,
          archived_at: null,
          created_at: FieldValue.serverTimestamp(),
          source_event_id: data.source_event_id,
        };

        await db.collection('notifications').doc(notifId).set(docData);

        // 6. Email delivery
        if (channels.includes('email_immediate') && prefs.email_digest === 'immediate') {
          try {
            const userRecord = await auth.getUser(userId).catch(() => null);
            if (userRecord?.email) {
              // Fire-and-forget email — don't await to avoid blocking
              sendImmediateEmail({ ...docData, id: notifId } as any, userRecord.email)
                .catch((e) => console.error('[Notifications] Email send error:', e));
            }
          } catch (e) {
            console.error('[Notifications] Failed to look up user email:', e);
          }
        } else if (prefs.email_digest === 'daily' && catChannels.email) {
          appendToDigestBucket(userId, notifId)
            .catch((e) => console.error('[Notifications] Digest bucket append error:', e));
        }
      } catch (userErr) {
        console.error(`[Notifications] Failed to emit for user ${userId}:`, userErr);
        // Continue to next recipient
      }
    }
  } catch (err) {
    // Top-level catch — notifications MUST NEVER crash the caller
    console.error('[Notifications] Unhandled error in emitNotification:', err);
  }
}
