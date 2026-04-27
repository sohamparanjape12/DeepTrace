import { db } from '../firebase-admin';
import type { NotificationPreferences } from './types';

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  channels: {
    violations: { in_app: true,  toast: true,  email: true  },
    pipeline:   { in_app: true,  toast: true,  email: false },
    dmca:       { in_app: true,  toast: true,  email: true  },
    system:     { in_app: true,  toast: false, email: false },
  },
  quiet_hours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    tz: 'UTC',
  },
  email_digest: 'immediate',
  digest_send_hour: 9,
};

export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const doc = await db.collection('notification_preferences').doc(userId).get();
    if (!doc.exists) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...doc.data() } as NotificationPreferences;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<void> {
  await db.collection('notification_preferences').doc(userId).set(
    { ...prefs, updated_at: new Date().toISOString() },
    { merge: true }
  );
}

/**
 * Returns true if the current time falls within the user's quiet hours.
 * Safe to call even if quiet hours are misconfigured — always returns false on error.
 */
export function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quiet_hours.enabled) return false;
  try {
    const now = new Date();
    const [startH, startM] = prefs.quiet_hours.start.split(':').map(Number);
    const [endH, endM]     = prefs.quiet_hours.end.split(':').map(Number);
    const currentMins = now.getUTCHours() * 60 + now.getUTCMinutes();
    const startMins   = startH * 60 + startM;
    const endMins     = endH   * 60 + endM;

    // Handle overnight quiet hours (e.g. 22:00 → 08:00)
    if (startMins > endMins) {
      return currentMins >= startMins || currentMins < endMins;
    }
    return currentMins >= startMins && currentMins < endMins;
  } catch {
    return false;
  }
}
