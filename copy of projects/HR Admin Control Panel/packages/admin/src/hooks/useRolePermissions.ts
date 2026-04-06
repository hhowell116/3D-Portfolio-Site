import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { AccessLevel, UserRole } from '@rco/shared';

/**
 * Capabilities that can be controlled per role.
 * Each maps to a human-readable label shown in the matrix.
 */
export const CAPABILITIES = [
  { key: 'viewDashboard', label: 'View dashboard & displays' },
  { key: 'manageRoster', label: 'Employee roster' },
  { key: 'manageContent', label: 'Birthdays & anniversaries' },
  { key: 'manageCampaigns', label: 'Campaigns & display settings' },
  { key: 'manageUsers', label: 'User management' },
  { key: 'viewItOverview', label: 'IT Overview' },
] as const;

export type CapabilityKey = (typeof CAPABILITIES)[number]['key'];

/** Default access levels when no Firebase config exists */
const DEFAULTS: Record<UserRole, Record<CapabilityKey, AccessLevel>> = {
  it_admin: {
    viewDashboard: 'manage',
    manageRoster: 'manage',
    manageContent: 'manage',
    manageCampaigns: 'manage',
    manageUsers: 'manage',
    viewItOverview: 'manage',
  },
  hr: {
    viewDashboard: 'manage',
    manageRoster: 'manage',
    manageContent: 'manage',
    manageCampaigns: 'manage',
    manageUsers: 'none',
    viewItOverview: 'none',
  },
  csuite: {
    viewDashboard: 'read',
    manageRoster: 'read',
    manageContent: 'read',
    manageCampaigns: 'read',
    manageUsers: 'none',
    viewItOverview: 'none',
  },
};

export type RoleAccessMap = Record<UserRole, Record<CapabilityKey, AccessLevel>>;

/**
 * Live-synced role permission matrix from Firestore.
 * Falls back to DEFAULTS if no config exists yet.
 */
export function useRolePermissions() {
  const [matrix, setMatrix] = useState<RoleAccessMap>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const roles: UserRole[] = ['it_admin', 'hr', 'csuite'];
    const unsubs = roles.map((role) =>
      onSnapshot(doc(db, 'rolePermissions', role), (snap) => {
        if (snap.exists()) {
          setMatrix((prev) => ({
            ...prev,
            [role]: { ...DEFAULTS[role], ...snap.data() },
          }));
        }
        setLoading(false);
      })
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  const updateAccess = async (role: UserRole, capability: CapabilityKey, level: AccessLevel) => {
    // IT admin always keeps full manage — protect from lockout
    if (role === 'it_admin') return;

    const updated = { ...matrix[role], [capability]: level };
    setMatrix((prev) => ({ ...prev, [role]: updated }));
    await setDoc(doc(db, 'rolePermissions', role), updated, { merge: true });
  };

  return { matrix, loading, updateAccess };
}

/**
 * Convert access matrix to the boolean RolePermissions format
 * used by useRole / RoleGuard. 'read' and 'manage' both grant access.
 */
export function accessToBoolean(access: Record<CapabilityKey, AccessLevel>) {
  const result: Record<string, boolean> = {};
  for (const cap of CAPABILITIES) {
    result[cap.key] = access[cap.key] !== 'none';
  }
  return result;
}
