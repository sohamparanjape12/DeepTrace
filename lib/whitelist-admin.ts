import { db } from './firebase-admin';

/**
 * Server-side check if a URL is whitelisted.
 */
export async function isUrlWhitelistedAdmin(url: string, userId: string) {
  try {
    const snapshot = await db.collection('whitelist')
      .where('owner_id', '==', userId)
      .get();
    
    const items = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    
    for (const item of items) {
      if (item.type === 'exact') {
        if (url === item.pattern) return item;
      } else {
        const domain = new URL(url).hostname.replace('www.', '');
        const patternDomain = item.pattern.replace('www.', '').replace(/https?:\/\//, '').split('/')[0];
        
        if (domain === patternDomain || domain.endsWith('.' + patternDomain)) {
          return item;
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Whitelist admin check failed:', error);
    return null;
  }
}
