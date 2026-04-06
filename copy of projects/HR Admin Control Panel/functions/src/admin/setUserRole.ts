import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) initializeApp();
const db = getFirestore();

const VALID_ROLES = ['admin', 'manager', 'viewer'];

export const setUserRole = onCall(async (request) => {
  // Verify caller is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  // Verify caller is admin
  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can change roles.');
  }

  const { targetUid, newRole } = request.data;

  if (!targetUid || !newRole) {
    throw new HttpsError('invalid-argument', 'targetUid and newRole required.');
  }

  if (!VALID_ROLES.includes(newRole)) {
    throw new HttpsError('invalid-argument', `Invalid role: ${newRole}`);
  }

  // Prevent removing last admin
  if (callerDoc.data()?.role === 'admin' && request.auth.uid === targetUid && newRole !== 'admin') {
    const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
    if (adminsSnap.size <= 1) {
      throw new HttpsError('failed-precondition', 'Cannot remove the last admin.');
    }
  }

  await db.collection('users').doc(targetUid).update({
    role: newRole,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
