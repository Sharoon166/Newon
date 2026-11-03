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
  | 'reverse:stock'
  // Printing stock slips and challans is admin-only.
  | 'print:stock';

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
    'reverse:stock',
    'print:stock'
  ],
  // Staff cannot access the invoices or purchases pages (or any subpage) —
  // those sections are admin-only for now. `create:purchases` is kept because
  // the stock page's "add to in-shop" adjustment reuses the purchase creation
  // action, and staff still record what physically arrives/leaves the shop.
  staff: [
    'view:inventory',
    'view:projects',
    'add:expenses',
    // Staff can read the manual expense ledger but cannot manage every entry —
    // writes are limited by ownership checks in the expense actions, and
    // deletion stays admin-only.
    'view:expenses',
    'create:purchases',
    'view:suppliers',
    'create:suppliers',
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
