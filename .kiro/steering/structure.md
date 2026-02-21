# Project Structure

## Architecture Pattern

Feature-based architecture with clear separation of concerns. Each domain feature is self-contained with its own components, actions, and types.

## Directory Organization

```
src/
├── actions/           # Global server actions (auth, etc.)
├── app/              # Next.js App Router pages
│   ├── (dashboard)/  # Protected dashboard routes
│   ├── api/          # API routes (NextAuth, etc.)
│   ├── auth/         # Authentication pages
│   └── setup/        # Initial setup page
├── components/       # Shared UI components
│   ├── auth/         # Auth-related components
│   ├── general/      # Generic reusable components
│   ├── inventory/    # Shared inventory components
│   ├── layout/       # Layout components (sidebar, header)
│   └── ui/           # shadcn/ui primitives
├── features/         # Feature modules (domain-driven)
│   ├── auth/
│   ├── customers/
│   ├── dashboard/
│   ├── inventory/
│   ├── invoices/
│   ├── ledger/
│   ├── projects/
│   ├── purchases/
│   ├── settings/
│   ├── staff/
│   └── virtual-products/
├── hooks/            # Custom React hooks
├── lib/              # Utility libraries and configs
├── models/           # Mongoose schemas
├── services/         # Business logic services
├── stores/           # Zustand state stores
├── types/            # TypeScript type definitions
└── utils/            # Helper functions

docs/                 # Documentation
scripts/              # Database migration scripts
public/               # Static assets
```

## Feature Module Structure

Each feature follows a consistent pattern:

```
features/[feature-name]/
├── actions/          # Server actions for data mutations
│   └── index.ts
├── components/       # Feature-specific components
│   ├── [feature]-table.tsx
│   ├── [feature]-form.tsx
│   └── [feature]-dialog.tsx
├── types.ts          # Feature-specific types
└── utils.ts          # Feature-specific utilities (optional)
```

## Key Conventions

### Naming Patterns

- Models: PascalCase singular (e.g., `Customer.ts`, `Invoice.ts`)
- Components: PascalCase with descriptive names (e.g., `CustomerTable.tsx`, `AddPaymentDialog.tsx`)
- Server actions: camelCase verbs (e.g., `getCustomers`, `createInvoice`)
- Types/Interfaces: PascalCase (e.g., `Customer`, `InvoiceFormData`)
- Utilities: camelCase (e.g., `formatCurrency`, `calculateTotal`)

### File Patterns

- Page components: `page.tsx` (Next.js convention)
- Client components: Suffix with `-client.tsx` when needed (e.g., `project-page-client.tsx`)
- Form wrappers: Suffix with `-wrapper.tsx` (e.g., `invoice-form-wrapper.tsx`)
- Dialogs: Suffix with `-dialog.tsx` (e.g., `add-payment-dialog.tsx`)

### Component Organization

- Server Components by default (Next.js 15)
- Use `'use client'` directive only when needed (hooks, interactivity)
- Separate client logic into wrapper components when mixing server/client
- Co-locate related components within feature directories

### Data Flow

1. Pages (Server Components) fetch data via server actions
2. Pass data to client components as props
3. Client components handle user interactions
4. Mutations trigger server actions with revalidation
5. UI updates automatically via Next.js cache invalidation

### Authentication & Authorization

- Use `requireAuth()` in server components for authentication
- Use `requirePermission()` for permission checks
- Use `usePermission()` hook in client components
- Wrap admin-only UI with `<AdminGate>` or `<PermissionGate>`

### Database Patterns

- All models use Mongoose schemas
- Auto-generated IDs with format: `[PREFIX]-YYYY-XXXX` (e.g., `INV-2026-0001`)
- Use Counter model for ID generation
- Pagination via mongoose-paginate-v2
- Lean queries for read operations, full documents for mutations

### Form Handling

- React Hook Form for all forms
- Zod schemas for validation
- Server actions for form submission
- Optimistic updates where appropriate
- Toast notifications for feedback (sonner)

### Styling Conventions

- Tailwind utility classes
- Component variants via class-variance-authority
- Consistent spacing and sizing tokens
- Dark mode support via next-themes
- Responsive design with mobile-first approach

### Error Handling

- Try-catch blocks in server actions
- Return structured error objects: `{ success: false, error: string }`
- Display errors via toast notifications
- Graceful fallbacks for missing data

### Type Safety

- Strict TypeScript mode enabled
- No implicit any
- Proper typing for all functions and components
- Use Zod for runtime validation and type inference
- Extend NextAuth types in `next-auth.d.ts`
