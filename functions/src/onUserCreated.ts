import { auth } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { db, auth as adminAuth } from './config';
import * as admin from 'firebase-admin';

export const onUserCreated = auth.user().onCreate(async (user) => {
  logger.info(`New user created: ${user.uid}, email: ${user.email}`);

  // Create organization for the new user. 
  // Normally orgs might be separate, but the PRD states:
  // "On first sign-in, create /organizations/{uid} document with default fields"
  
  const orgId = user.uid; // Using uid as orgId as per PRD logic
  
  try {
    const orgRef = db.collection('organizations').doc(orgId);
    await orgRef.set({
      name: user.displayName ? `${user.displayName}'s Organization` : 'New Organization',
      plan: 'free',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      alert_email: user.email || '',
      alert_threshold: 'HIGH',
    });

    logger.info(`Organization ${orgId} created for user ${user.uid}`);

    // Store org_id in the user's Firebase custom claims
    await adminAuth.setCustomUserClaims(user.uid, {
      org: orgId,
    });

    logger.info(`Assigned custom claim org='${orgId}' to user ${user.uid}`);
  } catch (error) {
    logger.error(`Failed to handle user creation for ${user.uid}`, error);
  }
});
