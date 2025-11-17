'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Permission, userHasPermission } from '@/lib/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: Permission;
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  permission,
  requireAdmin,
  fallback
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/login');
      return;
    }

    if (requireAdmin && session.user.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    if (permission && !userHasPermission(session, permission)) {
      router.push('/unauthorized');
      return;
    }
  }, [session, status, router, permission, requireAdmin]);

  if (status === 'loading') {
    return fallback || <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  if (requireAdmin && session.user.role !== 'admin') {
    return null;
  }

  if (permission && !userHasPermission(session, permission)) {
    return null;
  }

  return <>{children}</>;
}
