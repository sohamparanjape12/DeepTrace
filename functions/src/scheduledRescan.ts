import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { db } from './config';
import * as admin from 'firebase-admin';
export const scheduledRescan = onSchedule({
  schedule: 'every 24 hours',
  timeoutSeconds: 540,
}, async (event) => {
  logger.info("Starting scheduled rescan of assets...");

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    // Query for assets scanned prior to 24h ago
    // Note: If last_scanned_at could be missing, we might need a separate query or handle it via a boolean flag / default value.
    // For simplicity, we query where last_scanned_at < 24h ago
    const assetsRef = db.collection('assets');
    const snapshot = await assetsRef.where('last_scanned_at', '<', twentyFourHoursAgo).get();

    logger.info(`Found ${snapshot.size} assets needing rescan.`);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://deeptrace.app';

    // Using Promise.allSettled to process in parallel, or iterate if large batch. Let's iterate chunks.
    const promises = snapshot.docs.map(async (doc) => {
      const assetId = doc.id;
      
      try {
        logger.info(`Triggering rescan for asset: ${assetId}`);
        // Call Next.js /api/scan/{assetId} endpoint
        const response = await fetch(`${appUrl}/api/scan/${assetId}`, {
          method: 'POST',
          headers: {
             'Content-Type': 'application/json',
             // Ideally send an API key or Admin token here
             'Authorization': `Bearer ${process.env.INTERNAL_CRON_KEY || 'default_secret_key'}`
          }
        });

        const status = response.ok ? 'success' : 'failed';
        if (!response.ok) {
           logger.error(`Rescan endpoint failed for ${assetId}: ${response.statusText}`);
        }

        // Log result to /scans
        await db.collection('scans').add({
          asset_id: assetId,
          triggered_at: admin.firestore.FieldValue.serverTimestamp(),
          trigger_type: 'scheduled',
          status: status,
          // matches_count could be updated by the endpoint itself or fetched if endpoint returns it
        });
      } catch (err) {
        logger.error(`Error rescanning asset ${assetId}`, err);
      }
    });

    await Promise.allSettled(promises);
    logger.info("Completed scheduled rescan execution.");
  } catch (error) {
    logger.error("Error in scheduled rescan routine", error);
  }
});
