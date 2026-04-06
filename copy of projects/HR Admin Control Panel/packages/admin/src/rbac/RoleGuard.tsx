import type { ReactNode } from 'react';
import { useRole } from './useRole';
import type { UserRole, RolePermissions } from '@rco/shared';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: keyof RolePermissions;
  fallback?: ReactNode;
}

export function RoleGuard({ children, allowedRoles, requiredPermission, fallback = null }: RoleGuardProps) {
  const { role, permissions } = useRole();

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  if (requiredPermission && !permissions[requiredPermission]) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
