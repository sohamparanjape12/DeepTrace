import { db } from '../firebase-admin';
import type { NotificationPreferences } from './types';
import { DEFAULT_PREFERENCES } from './shared';

export { DEFAULT_PREFERENCES, isInQuietHours } from './shared';

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
