'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <ShieldAlert className="h-24 w-24 text-red-500" />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Access Denied</h2>
          <p className="mt-4 text-gray-600">
            You don&apos;t have permission to access this resource. Please contact your administrator if you believe this is an error.
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Link href="/inventory">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
