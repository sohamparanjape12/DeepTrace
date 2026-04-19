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
exports.onUserCreated = void 0;
const v1_1 = require("firebase-functions/v1");
const logger = __importStar(require("firebase-functions/logger"));
const config_1 = require("./config");
const admin = __importStar(require("firebase-admin"));
exports.onUserCreated = v1_1.auth.user().onCreate(async (user) => {
    logger.info(`New user created: ${user.uid}, email: ${user.email}`);
    // Create organization for the new user. 
    // Normally orgs might be separate, but the PRD states:
    // "On first sign-in, create /organizations/{uid} document with default fields"
    const orgId = user.uid; // Using uid as orgId as per PRD logic
    try {
        const orgRef = config_1.db.collection('organizations').doc(orgId);
        await orgRef.set({
            name: user.displayName ? `${user.displayName}'s Organization` : 'New Organization',
            plan: 'free',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            alert_email: user.email || '',
            alert_threshold: 'HIGH',
        });
        logger.info(`Organization ${orgId} created for user ${user.uid}`);
        // Store org_id in the user's Firebase custom claims
        await config_1.auth.setCustomUserClaims(user.uid, {
            org: orgId,
        });
        logger.info(`Assigned custom claim org='${orgId}' to user ${user.uid}`);
    }
    catch (error) {
        logger.error(`Failed to handle user creation for ${user.uid}`, error);
    }
});
//# sourceMappingURL=onUserCreated.js.map