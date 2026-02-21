# Technology Stack

## Framework & Runtime

- Next.js 15 with App Router (React 19)
- TypeScript 5 with strict mode enabled
- Node.js runtime
- Turbopack for development and builds

## Database & ORM

- MongoDB as primary database
- Mongoose for ODM with pagination support (mongoose-paginate-v2)
- Auto-incrementing counters for entity IDs

## Authentication & Authorization

- NextAuth.js v4 with credentials provider
- JWT-based session management
- bcryptjs for password hashing
- Role-based access control (RBAC) with granular permissions

## UI & Styling

- Tailwind CSS 4 for styling
- Radix UI for accessible component primitives
- shadcn/ui component patterns
- Lucide React for icons
- next-themes for dark mode support
- Responsive design with mobile-first approach

## Forms & Validation

- React Hook Form for form management
- Zod for schema validation and type inference
- @hookform/resolvers for integration

## State Management

- Zustand for global state
- React Server Components for server state
- Next.js server actions for mutations

## File Uploads & Media

- Cloudinary for image storage and optimization
- next-cloudinary for Next.js integration
- react-dropzone for file upload UI

## PDF Generation

- jsPDF for PDF creation
- jspdf-autotable for table formatting
- react-to-print for print functionality

## Data Visualization

- Recharts for charts and graphs
- @tanstack/react-table for advanced tables

## Testing

- Jest for unit testing
- @testing-library/react for component testing
- @testing-library/jest-dom for DOM assertions

## Code Quality

- ESLint for linting
- Prettier for code formatting
- TypeScript strict mode for type safety

## Common Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Production build with Turbopack
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier (if configured)

# Testing
npm run test             # Run Jest tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Database Setup
npm run create-admin     # Create initial admin user
```

## Environment Variables

Required in `.env.local`:
- `MONGODB_URI` - MongoDB connection string
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - JWT secret key
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

## Path Aliases

- `@/*` maps to `src/*` for clean imports
