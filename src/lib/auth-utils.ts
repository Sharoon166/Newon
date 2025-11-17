import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Permission, userHasPermission } from '@/lib/rbac';

/**
 * Get the current session on the server
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth() {
  const session = await getSession();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  return session;
}

/**
 * Require admin role - redirect if not admin
 */
export async function requireAdmin() {
  const session = await requireAuth();
  
  if (session.user.role !== 'admin') {
    redirect('/unauthorized');
  }
  
  return session;
}

/**
 * Require specific permission - redirect if not authorized
 */
export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  
  if (!userHasPermission(session, permission)) {
    redirect('/unauthorized');
  }
  
  return session;
}

/**
 * Check if user has permission (returns boolean)
 */
export async function checkPermission(permission: Permission): Promise<boolean> {
  const session = await getSession();
  return userHasPermission(session, permission);
}
