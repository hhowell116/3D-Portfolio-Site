import * as functionsV1 from 'firebase-functions/v1';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) initializeApp();
const db = getFirestore();

const ALLOWED_DOMAIN = 'rowecasaorganics.com';

export const onUserCreate = functionsV1.auth.user().onCreate(async (user: functionsV1.auth.UserRecord) => {
  const email = user.email || '';

  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    console.log(`Rejecting non-RCO user: ${email}`);
    return;
  }

  const userRef = db.collection('users').doc(user.uid);
  const existing = await userRef.get();

  if (!existing.exists) {
    await userRef.set({
      email,
      displayName: user.displayName || email,
      role: 'viewer',
      createdAt: FieldValue.serverTimestamp(),
      lastLogin: FieldValue.serverTimestamp(),
      createdBy: 'system',
    });
    console.log(`Created user doc for ${email} with viewer role`);
  }
});
