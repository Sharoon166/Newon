'use client';

import { useSession } from 'next-auth/react';
import { Permission, hasPermission } from '@/lib/rbac';

interface RoleGuardProps {
  children: React.ReactNode;
  permission: Permission;
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, permission, fallback = null }: RoleGuardProps) {
  const { data: session } = useSession();
  if (!session?.user?.role) {
    return <>{fallback}</>;
  }

  if (!hasPermission(session?.user.role, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
