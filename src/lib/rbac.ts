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
  // Cost data of purchases belonging to imported products is admin-only.
  | 'view:imported-purchase-costs'
  // Recording a purchase against an imported product is admin-only.
  | 'create:imported-purchases'
  | 'view:suppliers'
  | 'create:suppliers'
  | 'edit:suppliers'
  | 'delete:suppliers'
  | 'view:staff'
  | 'create:staff'
  | 'edit:staff'
  | 'delete:staff'
  | 'view:settings'
  | 'edit:settings'
  | 'view:projects'
  | 'create:projects'
  | 'edit:projects'
  | 'delete:projects'
  | 'view:expenses'
  | 'add:expenses'
  | 'view:budget'
  | 'view:project-inventory'
  | 'add:project-inventory'
  | 'edit:project-inventory'
  | 'delete:project-inventory'
  | 'view:audit-logs'
  | 'view:client-financials'
  | 'view:project-invoices'
  // Physical stock tracking
  | 'view:stock'
  | 'edit:stock'
  | 'reverse:stock';

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
    'view:imported-purchase-costs',
    'create:imported-purchases',
    'view:suppliers',
    'create:suppliers',
    'edit:suppliers',
    'delete:suppliers',
    'view:staff',
    'create:staff',
    'edit:staff',
    'delete:staff',
    'view:settings',
    'edit:settings',
    'view:projects',
    'create:projects',
    'edit:projects',
    'delete:projects',
    'view:expenses',
    'add:expenses',
    'view:budget',
    'view:project-inventory',
    'add:project-inventory',
    'edit:project-inventory',
    'delete:project-inventory',
    'view:audit-logs',
    'view:client-financials',
    'view:project-invoices',
    'view:stock',
    'edit:stock',
    'reverse:stock'
  ],
  // Staff can view invoices and create purchases/suppliers, but never create,
  // edit or delete invoices (quotations included — same permission), and never
  // edit or delete purchases.
  staff: [
    'view:inventory',
    'view:projects',
    'add:expenses',
    'view:invoices',
    'view:purchases',
    'create:purchases',
    'view:suppliers',
    'create:suppliers',
    // Staff record what physically arrives / leaves the shop.
    'view:stock',
    'edit:stock'
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
