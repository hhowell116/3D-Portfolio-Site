import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, limit, query } from 'firebase/firestore';
import { auth, db, getAuthProvider } from '../firebase';
import type { AppUser, UserRole } from '@rco/shared';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ALLOWED_DOMAIN = 'rowecasaorganics.com';

// Hardcoded role assignments by email prefix (before @)
const ROLE_OVERRIDES: Record<string, UserRole> = {
  'andre.neidly': 'it_admin',
  'chase.parrish': 'it_admin',
  'philip.williams': 'it_admin',
  'celina.bianco': 'hr',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          await signOut(auth);
          setError('Access restricted to @rowecasaorganics.com accounts.');
          setUser(null);
          setAppUser(null);
          setLoading(false);
          return;
        }

        setUser(firebaseUser);
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

        // Check for hardcoded role override
        const emailPrefix = email.split('@')[0].toLowerCase();
        const overrideRole = ROLE_OVERRIDES[emailPrefix];

        if (userDoc.exists()) {
          const data = userDoc.data() as AppUser;
          const mergeData: any = { lastLogin: serverTimestamp() };
          // Apply role override if it differs from current
          if (overrideRole && data.role !== overrideRole) {
            mergeData.role = overrideRole;
          }
          await setDoc(doc(db, 'users', firebaseUser.uid), mergeData, { merge: true });
          setAppUser({ ...data, uid: firebaseUser.uid, ...(overrideRole ? { role: overrideRole } : {}) });
        } else {
          // First-time sign-in — check if this is the very first user (bootstrap admin)
          const usersSnap = await getDocs(query(collection(db, 'users'), limit(1)));
          const isFirstUser = usersSnap.empty;

          const assignedRole = overrideRole || (isFirstUser ? 'it_admin' as UserRole : 'hr' as UserRole);

          const newUser: Omit<AppUser, 'uid'> = {
            email,
            displayName: firebaseUser.displayName || email,
            role: assignedRole,
            createdAt: serverTimestamp() as any,
            lastLogin: serverTimestamp() as any,
            createdBy: isFirstUser ? 'bootstrap' : 'system',
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setAppUser({ ...newUser, uid: firebaseUser.uid } as AppUser);
        }
        setError(null);
      } else {
        setUser(null);
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const signIn = async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, getAuthProvider());
      const email = result.user.email || '';
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        await signOut(auth);
        setError('Access restricted to @rowecasaorganics.com accounts.');
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Sign-in failed.');
      }
    }
  };

  const logOut = async () => {
    await signOut(auth);
    setAppUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, appUser, loading, error, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
