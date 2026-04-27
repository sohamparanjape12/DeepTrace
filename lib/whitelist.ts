import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export interface WhitelistItem {
  id: string;
  pattern: string;
  label: string;
  type: 'domain' | 'exact';
  owner_id: string;
  added_at: any;
}

/**
 * Checks if a given URL is authorized by the user's whitelist.
 */
export async function isUrlWhitelisted(url: string, userId: string): Promise<WhitelistItem | null> {
  try {
    const q = query(collection(db, 'whitelist'), where('owner_id', '==', userId));
    const snapshot = await getDocs(q);
    
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WhitelistItem));
    
    // Check for matches
    for (const item of items) {
      if (item.type === 'exact') {
        if (url === item.pattern) return item;
      } else {
        // Domain match (e.g., "youtube.com" matches "https://youtube.com/watch?v=...")
        const domain = new URL(url).hostname.replace('www.', '');
        const patternDomain = item.pattern.replace('www.', '').replace(/https?:\/\//, '').split('/')[0];
        
        if (domain === patternDomain || domain.endsWith('.' + patternDomain)) {
          return item;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Whitelist check failed:', error);
    return null;
  }
}

/**
 * Adds a new item to the whitelist.
 */
export async function addToWhitelist(pattern: string, label: string, userId: string, type: 'domain' | 'exact' = 'domain') {
  return await addDoc(collection(db, 'whitelist'), {
    pattern,
    label,
    type,
    owner_id: userId,
    added_at: serverTimestamp(),
  });
}

/**
 * Removes an item from the whitelist.
 */
export async function removeFromWhitelist(id: string) {
  await deleteDoc(doc(db, 'whitelist', id));
}
