"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredData = exports.anonymizeUserData = exports.acceptPartnerInvite = exports.onboardnewuser = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
// Initialize Firebase Admin
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
/**
 * Helper function for logging audit actions
 */
async function logAuditAction(userId, action, details, resourceId, resourceType, req) {
    try {
        const auditLog = {
            userId,
            action,
            details: details || {},
            timestamp: firestore_1.FieldValue.serverTimestamp(),
            ipAddress: req?.ip || "0.0.0.0",
            userAgent: req?.get("User-Agent") || "Unknown",
        };
        if (resourceId)
            auditLog.resourceId = resourceId;
        if (resourceType)
            auditLog.resourceType = resourceType;
        await db.collection("audit_logs").add(auditLog);
    }
    catch (error) {
        v2_1.logger.error(`Audit logging failed for action: ${action}`, error);
    }
}
/**
 * User onboarding function - Creates/updates user document in Firestore.
 * Using onCall for better security and automatic auth context.
 */
exports.onboardnewuser = (0, https_1.onCall)(async (request) => {
    const { uid, email, displayName } = request.data;
    const userAuth = request.auth;
    if (!userAuth || userAuth.uid !== uid) {
        throw new https_1.HttpsError("unauthenticated", "Authentication is required to perform this action.");
    }
    try {
        const userData = {
            uid,
            email: email || null,
            displayName: displayName || null,
            role: 'primary',
            lastActiveAt: firestore_1.FieldValue.serverTimestamp(),
        };
        await db.collection("users").doc(uid).set(userData, { merge: true });
        const retentionRef = db.collection("data_retention").doc(uid);
        const retentionDoc = await retentionRef.get();
        if (!retentionDoc.exists) {
            await retentionRef.set({
                userId: uid,
                dataType: "personal",
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                retentionPeriod: 2555,
                jurisdiction: "OTHER",
            });
        }
        await logAuditAction(uid, "user_onboarded", { email, displayName }, uid, "user");
        return { success: true, message: "User onboarded or updated successfully." };
    }
    catch (error) {
        v2_1.logger.error("Onboarding error:", error);
        throw new https_1.HttpsError("internal", "Failed to onboard user.");
    }
});
/**
 * Accept partner invite function - Securely links two users.
 */
exports.acceptPartnerInvite = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be authenticated to accept an invite.");
    }
    const { inviteCode } = request.data;
    const partnerUid = request.auth.uid;
    if (!inviteCode) {
        throw new https_1.HttpsError("invalid-argument", "Invite code is required.");
    }
    const inviteRef = db.collection("invites").doc(inviteCode);
    try {
        await db.runTransaction(async (transaction) => {
            const inviteDoc = await transaction.get(inviteRef);
            if (!inviteDoc.exists)
                throw new https_1.HttpsError("not-found", "Invalid invite code.");
            const inviteData = inviteDoc.data();
            if (inviteData.status !== "pending")
                throw new https_1.HttpsError("failed-precondition", "Invite has already been used or expired.");
            if (inviteData.expiresAt.toDate() < new Date()) {
                transaction.update(inviteRef, { status: 'expired' });
                throw new https_1.HttpsError("failed-precondition", "This invite has expired.");
            }
            const primaryUserId = inviteData.fromUserId;
            const primaryUserRef = db.collection("users").doc(primaryUserId);
            const partnerUserRef = db.collection("users").doc(partnerUid);
            transaction.update(primaryUserRef, { partnerId: partnerUid });
            transaction.update(partnerUserRef, { partnerId: primaryUserId, role: "partner" });
            transaction.update(inviteRef, {
                status: "completed",
                acceptedBy: partnerUid,
                completedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        });
        await logAuditAction(partnerUid, "partner_accepted_invite", { inviteCode }, inviteRef.id, "invite");
        return { success: true, message: "Partner connection established successfully." };
    }
    catch (error) {
        v2_1.logger.error("Accept invite error:", error);
        await logAuditAction(partnerUid, "partner_invite_failed", { inviteCode, error: error instanceof Error ? error.message : 'Unknown error' });
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "An unexpected error occurred while accepting the invite.");
    }
});
/**
 * Anonymize data for research purposes
 */
exports.anonymizeUserData = (0, https_1.onCall)(async (request) => {
    // This is a placeholder for your advanced logic.
    // Ensure you have robust checks for consent before running.
    v2_1.logger.info("Anonymization function called for user:", request.auth?.uid);
    return { success: true, message: "Anonymization not yet implemented." };
});
/**
 * Data retention cleanup function
 */
exports.cleanupExpiredData = (0, https_1.onRequest)(async (req, res) => {
    // This is a placeholder for your advanced logic.
    // Ensure this is secured, e.g., by checking for a cron job header.
    v2_1.logger.info("Data cleanup function triggered.");
    res.status(200).json({ success: true, message: "Cleanup not yet implemented." });
});
//# sourceMappingURL=index.js.map