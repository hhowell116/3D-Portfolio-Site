"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setUserRole = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const app_1 = require("firebase-admin/app");
if ((0, app_1.getApps)().length === 0)
    (0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const VALID_ROLES = ['admin', 'manager', 'viewer'];
exports.setUserRole = (0, https_1.onCall)(async (request) => {
    // Verify caller is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    // Verify caller is admin
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
        throw new https_1.HttpsError('permission-denied', 'Only admins can change roles.');
    }
    const { targetUid, newRole } = request.data;
    if (!targetUid || !newRole) {
        throw new https_1.HttpsError('invalid-argument', 'targetUid and newRole required.');
    }
    if (!VALID_ROLES.includes(newRole)) {
        throw new https_1.HttpsError('invalid-argument', `Invalid role: ${newRole}`);
    }
    // Prevent removing last admin
    if (callerDoc.data()?.role === 'admin' && request.auth.uid === targetUid && newRole !== 'admin') {
        const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
        if (adminsSnap.size <= 1) {
            throw new https_1.HttpsError('failed-precondition', 'Cannot remove the last admin.');
        }
    }
    await db.collection('users').doc(targetUid).update({
        role: newRole,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true };
});
//# sourceMappingURL=setUserRole.js.map