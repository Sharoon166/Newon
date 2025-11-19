'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Invalid email or password. Please try again.';
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.';
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      default:
        return 'An error occurred during authentication. Please try again.';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-red-600">Authentication Error</h2>
          <p className="mt-4 text-gray-600">{getErrorMessage(error)}</p>
        </div>

        <div className="flex justify-center">
          <Link href="/auth/login">
            <Button>Back to Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
