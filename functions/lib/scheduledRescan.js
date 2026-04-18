"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledRescan = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const config_1 = require("./config");
const admin = __importStar(require("firebase-admin"));
exports.scheduledRescan = (0, scheduler_1.onSchedule)({
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
        const assetsRef = config_1.db.collection('assets');
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
                await config_1.db.collection('scans').add({
                    asset_id: assetId,
                    triggered_at: admin.firestore.FieldValue.serverTimestamp(),
                    trigger_type: 'scheduled',
                    status: status,
                    // matches_count could be updated by the endpoint itself or fetched if endpoint returns it
                });
            }
            catch (err) {
                logger.error(`Error rescanning asset ${assetId}`, err);
            }
        });
        await Promise.allSettled(promises);
        logger.info("Completed scheduled rescan execution.");
    }
    catch (error) {
        logger.error("Error in scheduled rescan routine", error);
    }
});
//# sourceMappingURL=scheduledRescan.js.map