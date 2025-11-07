# Newon

A comprehensive inventory management system built with Next.js, designed to streamline business operations with multi-brand support.

## Features

- **Inventory Management** - Track products, variants, attributes, and stock levels with advanced pricing controls
- **Purchase Management** - Record and manage supplier purchases with export capabilities
- **Customer Management** - Maintain customer records and transaction history
- **Staff Management** - User authentication and role-based access control
- **Invoices & Quotations** - Generate professional invoices and quotations with PDF export
- **Ledger** - Financial tracking and reporting
- **Multi-Brand Support** - Manage multiple brands (Newon, Waymor) from a single dashboard
- **Image Management** - Cloudinary integration for product images
- **Responsive UI** - Modern interface built with Radix UI and Tailwind CSS

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- MongoDB with Mongoose
- Better Auth for authentication
- Radix UI components
- Tailwind CSS
- React Hook Form with Zod validation
- Zustand for state management
- jsPDF for document generation

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables in `.env.local`:

```bash
# MongoDB connection
MONGODB_URI=your_mongodb_uri

# Cloudinary (for image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Better Auth
BETTER_AUTH_SECRET=your_auth_secret
BETTER_AUTH_URL=http://localhost:3000
```

3. Create an admin user:

```bash
npm run create-admin
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## Project Structure

- `/src/app` - Next.js app router pages
- `/src/features` - Feature-based modules (inventory, purchases, invoices, etc.)
- `/src/components` - Reusable UI components
- `/src/models` - MongoDB schemas
- `/src/services` - Business logic and API services
- `/src/stores` - Zustand state management
- `/src/types` - TypeScript type definitions

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run create-admin` - Create admin user
