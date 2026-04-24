import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY
          ?.replace(/^"|"$/g, '')            // Remove surrounding quotes
          ?.replace(/\\n/g, '\n'),           // Replace literal \n with real newlines
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const db = admin.apps.length ? admin.firestore() : {} as any;
export const storage = admin.apps.length ? admin.storage() : {} as any;
export const auth = admin.apps.length ? admin.auth() : {} as any;
