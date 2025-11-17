'use client';

import { useSession } from 'next-auth/react';
import { Permission, userHasPermission, isAdmin as checkIsAdmin } from '@/lib/rbac';

/**
 * Hook to check user permissions
 */
export function usePermission(permission: Permission): boolean {
  const { data: session } = useSession();
  return userHasPermission(session, permission);
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  const { data: session } = useSession();
  return checkIsAdmin(session);
}

/**
 * Hook to get current user session
 */
export function useCurrentUser() {
  const { data: session, status } = useSession();
  
  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: !!session,
    isAdmin: checkIsAdmin(session)
  };
}
