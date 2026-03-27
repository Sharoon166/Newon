# Coding Standards

## Core Behavior

- Implement only what is explicitly requested
- Do not generate documentation unless explicitly asked
- Do not create extra files unless required
- Do not refactor unrelated code
- Do not rename identifiers unless necessary
- Do not invent APIs, routes, database fields, or schemas
- If something is unclear, ask one concise clarification question instead of assuming
- No filler. No placeholders. No mock content unless explicitly requested

## TypeScript Rules (MANDATORY)

### Strict Mode Enforcement

TypeScript strict mode is enabled. The following are FORBIDDEN:

- `any` type
- `as any` casts
- `// @ts-ignore` comments
- Non-null assertions (`!`) unless absolutely unavoidable

### Type Creation Guidelines

Before creating a new type:

1. Check if a similar type already exists
2. Reuse or extend existing types
3. Prefer inferred types (`z.infer`, `ReturnType`, `typeof`)

If a shape is unknown, use `unknown` and narrow it properly.

### Function Typing

- All functions must have explicit return types
- Server actions must return structured discriminated unions:

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

- Never return raw primitives from server actions

### Example

```typescript
// ❌ BAD
async function getCustomer(id: string) {
  const customer = await Customer.findOne({ customerId: id });
  return customer;
}

// ✅ GOOD
async function getCustomer(
  id: string
): Promise<ActionResult<CustomerData>> {
  try {
    const customer = await Customer.findOne({ customerId: id }).lean();
    if (!customer) {
      return { success: false, error: "Customer not found" };
    }
    return { success: true, data: customer };
  } catch (error) {
    return { success: false, error: "Failed to fetch customer" };
  }
}
```

## Server Action Rules

### Required Patterns

1. Always include `"use server"` directive
2. Validate input with Zod
3. Type input and output explicitly
4. Never mix client logic inside server actions
5. Never expose raw database models directly to the client

### Structure Template

```typescript
"use server";

import { z } from "zod";

const inputSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
});

type Input = z.infer<typeof inputSchema>;
type Output = ActionResult<{ id: string; name: string }>;

export async function updateItem(input: Input): Promise<Output> {
  try {
    const validated = inputSchema.parse(input);
    // Business logic here
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Operation failed" };
  }
}
```

## Component Rules

### Server vs Client Components

- Default to Server Components
- Use `"use client"` only when necessary:
  - Using React hooks (useState, useEffect, etc.)
  - Event handlers
  - Browser APIs
  - Third-party libraries that require client-side

### Component Structure

- Strongly type props
- Keep components small and composable
- Extract reusable UI patterns instead of duplicating markup
- Keep business logic outside JSX when possible

### Example

```typescript
// ❌ BAD - Mixing concerns
"use client";

export default function CustomerCard({ id }: { id: string }) {
  const [customer, setCustomer] = useState(null);
  
  useEffect(() => {
    fetch(`/api/customers/${id}`).then(/* ... */);
  }, [id]);
  
  return <div>{/* ... */}</div>;
}

// ✅ GOOD - Server Component with typed props
interface CustomerCardProps {
  customer: {
    id: string;
    name: string;
    email: string;
  };
}

export function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{customer.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{customer.email}</p>
      </CardContent>
    </Card>
  );
}
```

## Design Standards (MANDATORY)

You are not a code generator. You are a product designer who writes code.

Avoid "vibe-coded" UI. Avoid random spacing, arbitrary sizes, and visual noise.

### 1. Clear Hierarchy

- Obvious primary vs secondary elements
- Proper font scaling (title → subtitle → body → meta)
- Visual grouping using spacing, borders, and background contrast

```tsx
// ✅ GOOD - Clear hierarchy
<Card>
  <CardHeader>
    <CardTitle className="text-2xl font-bold">Customer Details</CardTitle>
    <CardDescription>Manage customer information</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div>
      <p className="text-sm font-medium">Name</p>
      <p className="text-sm text-muted-foreground">{customer.name}</p>
    </div>
  </CardContent>
</Card>
```

### 2. Intentional Spacing

- Use consistent Tailwind spacing scale
- Prefer `gap`, `space-y`, `p-6`, `p-4`
- No arbitrary pixel values unless justified

```tsx
// ❌ BAD
<div className="px-[13px] py-[7px] mb-[22px]">

// ✅ GOOD
<div className="p-4 mb-6">
```

### 3. Layout Discipline

- Use grid or flex intentionally
- Align edges
- Avoid overcrowding
- Use max widths where appropriate

```tsx
// ✅ GOOD - Intentional layout
<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <Card key={item.id}>
      {/* ... */}
    </Card>
  ))}
</div>
```

### 4. Visual Consistency

- Use shadcn primitives when possible
- Extend with `className`, don't rebuild components
- Use `text-muted-foreground` for secondary info
- Use subtle shadows and rounded corners consistently

### 5. Data-Dense UI Rules (Dashboards / Admin Panels)

- Group related information into Cards
- Use clear section headers
- Avoid unnecessary icons
- Charts and numbers must have context labels
- No decorative elements without purpose

```tsx
// ✅ GOOD - Data-dense dashboard card
<Card>
  <CardHeader>
    <CardTitle>Revenue</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold">$45,231.89</div>
    <p className="text-sm text-muted-foreground">
      +20.1% from last month
    </p>
  </CardContent>
</Card>
```

### 6. Interaction Discipline

- Hover states must be subtle
- Avoid excessive animation
- Buttons must have clear primary vs secondary distinction
- Destructive actions must be visually differentiated

```tsx
// ✅ GOOD - Clear button hierarchy
<div className="flex gap-2">
  <Button>Save Changes</Button>
  <Button variant="outline">Cancel</Button>
  <Button variant="destructive">Delete</Button>
</div>
```

## Tailwind Rules

- No inline styles
- Avoid arbitrary values like `px-[13px]` unless justified
- Keep class chains readable
- Maintain consistent radius and shadow usage

## shadcn/ui Rules

- Use provided primitives first
- Follow proper structure:
  - Card → CardHeader → CardContent → CardFooter
  - Dialog → DialogContent → DialogHeader → DialogTitle
- Do not rewrite built-in components

## File Structure Discipline

Respect existing structure:

```
app/
components/
actions/
lib/
types/
```

Do not duplicate types or utilities.

## Pre-Flight Checklist

Before returning code, internally verify:

- [ ] No `any` exists
- [ ] No duplicate types were created unnecessarily
- [ ] Layout has clear hierarchy
- [ ] Spacing is consistent
- [ ] The UI looks intentional and professional
- [ ] Only requested changes were made

## Priority Order

1. Correctness
2. Type safety
3. Design quality
4. Reusability
5. Simplicity

Never sacrifice type safety or design clarity for speed.
