import * as admin from 'firebase-admin';

// Initialize the app if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const auth = admin.auth();
