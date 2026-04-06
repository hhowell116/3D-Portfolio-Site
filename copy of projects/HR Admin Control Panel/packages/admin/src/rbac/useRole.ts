import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';
import { ROLE_PERMISSIONS } from '@rco/shared';
import type { UserRole, RolePermissions } from '@rco/shared';
import { CAPABILITIES, accessToBoolean } from '../hooks/useRolePermissions';
import type { CapabilityKey, RoleAccessMap } from '../hooks/useRolePermissions';
import type { AccessLevel } from '@rco/shared';

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

export function useRole() {
  const { appUser } = useAuth();
  const role: UserRole = appUser?.role || 'hr';
  const [accessConfig, setAccessConfig] = useState<Record<CapabilityKey, AccessLevel>>(DEFAULTS[role]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'rolePermissions', role), (snap) => {
      if (snap.exists()) {
        setAccessConfig({ ...DEFAULTS[role], ...snap.data() as Record<CapabilityKey, AccessLevel> });
      } else {
        setAccessConfig(DEFAULTS[role]);
      }
    });
    return () => unsub();
  }, [role]);

  // IT admin always has full access regardless of Firebase config
  const permissions: RolePermissions = role === 'it_admin'
    ? ROLE_PERMISSIONS.it_admin
    : accessToBoolean(accessConfig) as unknown as RolePermissions;

  return {
    role,
    permissions,
    isItAdmin: role === 'it_admin',
    isHr: role === 'hr',
    isCsuite: role === 'csuite',
    canManage: role === 'it_admin' || role === 'hr' || role === 'csuite',
  };
}
