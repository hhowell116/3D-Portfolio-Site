import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, type AuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// IdP-agnostic auth provider — switch via env variable
const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER || 'google';

export function getAuthProvider(): AuthProvider {
  switch (AUTH_PROVIDER) {
    case 'microsoft': {
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({
        tenant: import.meta.env.VITE_MS_TENANT_ID || 'common',
      });
      provider.addScope('user.read');
      return provider;
    }
    case 'google':
    default: {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: 'rowecasaorganics.com' });
      return provider;
    }
  }
}
