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
exports.onViolationCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const logger = __importStar(require("firebase-functions/logger"));
const nodemailer = __importStar(require("nodemailer"));
const config_1 = require("./config");
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    auth: {
        user: process.env.SMTP_USER || 'apikey',
        pass: process.env.SMTP_PASS || process.env.SENDGRID_API_KEY,
    },
});
exports.onViolationCreated = (0, firestore_1.onDocumentUpdated)('violations/{violationId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.error('No data associated with the event');
        return;
    }
    try {
        const beforeData = snapshot.before.data();
        const afterData = snapshot.after.data();
        if (!beforeData || !afterData)
            return;
        const beforeSeverity = beforeData.severity;
        const afterSeverity = afterData.severity;
        logger.info(`Processing violation update: ${event.params.violationId}`, {
            beforeSeverity,
            afterSeverity
        });
        const wasLowOrNeedsReview = beforeSeverity === 'LOW' || beforeSeverity === 'NEEDS_REVIEW';
        const isNowHighOrCritical = afterSeverity === 'HIGH' || afterSeverity === 'CRITICAL';
        // 1. Check if severity escalated from LOW/NEEDS_REVIEW to HIGH/CRITICAL:
        if (wasLowOrNeedsReview && isNowHighOrCritical) {
            const violation = afterData;
            // 2. Fetch the parent asset
            if (!violation.asset_id) {
                logger.warn(`Violation ${event.params.violationId} missing asset_id`);
                return;
            }
            const assetRef = config_1.db.collection('assets').doc(violation.asset_id);
            const assetSnap = await assetRef.get();
            if (!assetSnap.exists) {
                logger.warn(`Asset ${violation.asset_id} not found for violation ${event.params.violationId}`);
                return;
            }
            const asset = assetSnap.data();
            const ownerOrgId = asset?.owner_org;
            if (!ownerOrgId) {
                logger.warn(`Asset ${violation.asset_id} has no owner_org`);
                return;
            }
            // 3. Fetch org's alert_email and alert_threshold
            const orgRef = config_1.db.collection('organizations').doc(ownerOrgId);
            const orgSnap = await orgRef.get();
            if (!orgSnap.exists) {
                logger.warn(`Org ${ownerOrgId} not found`);
                return;
            }
            const org = orgSnap.data();
            const alertEmail = org?.alert_email;
            const alertThreshold = org?.alert_threshold || 'CRITICAL'; // Default to CRITICAL
            // Check if the current severity meets the threshold. 
            // Assumption: CRITICAL > HIGH. If threshold is CRITICAL, don't trigger for HIGH.
            let shouldSend = false;
            if (alertThreshold === 'CRITICAL' && violation.severity === 'CRITICAL')
                shouldSend = true;
            if (alertThreshold === 'HIGH' && (violation.severity === 'CRITICAL' || violation.severity === 'HIGH'))
                shouldSend = true;
            // We can extend for MEDIUM later if needed
            if (shouldSend && alertEmail) {
                // 4. Send email via Nodemailer
                logger.info(`Sending alert email to ${alertEmail} for violation ${event.params.violationId}`);
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://deeptrace.app';
                const violationUrl = `${appUrl}/violations/${event.params.violationId}`;
                await transporter.sendMail({
                    from: `"DeepTrace Alerts" <alerts@deeptrace.app>`,
                    to: alertEmail,
                    subject: `[${violation.severity}] New Copyright Violation Detected`,
                    html: `
            <h2>Violation Alert</h2>
            <p><strong>Severity:</strong> ${violation.severity}</p>
            <p><strong>Asset ID:</strong> ${violation.asset_id}</p>
            <p><strong>Matched URL:</strong> <a href="${violation.match_url}">${violation.match_url}</a></p>
            <p><strong>Match Type:</strong> ${violation.match_type}</p>
            <br/>
            <p>View full details and manage this violation in your dashboard: <a href="${violationUrl}">${violationUrl}</a></p>
          `
                });
                logger.info('Alert email sent successfully.');
            }
            else {
                logger.info(`Severity ${violation.severity} did not meet threshold ${alertThreshold} or email missing for org ${ownerOrgId}`);
            }
        }
    }
    catch (error) {
        logger.error(`Error processing violation ${event.params.violationId}`, error);
    }
});
//# sourceMappingURL=onViolationCreated.js.map