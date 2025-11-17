'use client';

import { useSession } from 'next-auth/react';
import { Permission, canAccess } from '@/utils/rbac';

interface RoleGuardProps {
  children: React.ReactNode;
  permission: Permission;
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, permission, fallback = null }: RoleGuardProps) {
  const { data: session } = useSession();

  if (!canAccess(session, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
