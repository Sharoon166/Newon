'use client';

import { useSession } from 'next-auth/react';
import { Permission, userHasPermission } from '@/lib/rbac';

interface PermissionGateProps {
  children: React.ReactNode;
  permission: Permission;
  fallback?: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 */
export function PermissionGate({ children, permission, fallback = null }: PermissionGateProps) {
  const { data: session } = useSession();

  if (!userHasPermission(session, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface AdminGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component that only renders children for admin users
 */
export function AdminGate({ children, fallback = null }: AdminGateProps) {
  const { data: session } = useSession();

  if (session?.user?.role !== 'admin') {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
