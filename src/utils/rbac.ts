import { Session } from 'next-auth';

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
    'view:purchases',
    'create:purchases'
  ]
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

export function canAccess(session: Session | null, permission: Permission): boolean {
  if (!session?.user?.role) return false;
  return hasPermission(session.user.role, permission);
}

export function isAdmin(session: Session | null): boolean {
  return session?.user?.role === 'admin';
}

export function isStaff(session: Session | null): boolean {
  return session?.user?.role === 'staff';
}
