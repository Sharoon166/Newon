import type { Session } from 'next-auth';

export type Role = 'admin' | 'staff';

export type Permission = 
  | 'view:inventory'
  | 'edit:inventory'
  | 'delete:inventory'
  | 'view:invoices'
  | 'create:invoices'
  | 'edit:invoices'
  | 'delete:invoices'
  | 'view:purchases'
  | 'create:purchases'
  | 'edit:purchases'
  | 'delete:purchases'
  | 'view:staff'
  | 'create:staff'
  | 'edit:staff'
  | 'delete:staff'
  | 'view:settings'
  | 'edit:settings';

// Define permissions for each role
const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    'view:inventory',
    'edit:inventory',
    'delete:inventory',
    'view:invoices',
    'create:invoices',
    'edit:invoices',
    'delete:invoices',
    'view:purchases',
    'create:purchases',
    'edit:purchases',
    'delete:purchases',
    'view:staff',
    'create:staff',
    'edit:staff',
    'delete:staff',
    'view:settings',
    'edit:settings'
  ],
  staff: [
    'view:inventory',
    'view:invoices',
    'create:invoices',
    'view:purchases'
  ]
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Check if a user has a specific permission
 */
export function userHasPermission(session: Session | null, permission: Permission): boolean {
  if (!session?.user?.role) return false;
  return hasPermission(session.user.role, permission);
}

/**
 * Check if user is admin
 */
export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === 'admin';
}

/**
 * Check if user is staff
 */
export function isStaff(session: Session | null): boolean {
  return session?.user?.role === 'staff';
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}
