'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const createAdmin = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/setup/create-admin', {
        method: 'POST'
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, data });
        toast.success('Admin created successfully!');
      } else {
        setResult({ success: false, error: data.error });
        toast.error(data.error || 'Failed to create admin');
      }
    } catch (error) {
      setResult({ success: false, error: 'Network error' });
      toast.error('Failed to create admin');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Initial Setup</h1>
          <p className="mt-2 text-gray-600">Create your first admin user</p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow space-y-6">
          <div className="space-y-2">
            <h2 className="font-semibold">Admin Credentials</h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>📧 Email: <span className="font-mono">sharoon@newon.com</span></p>
              <p>🔑 Password: <span className="font-mono">admin123</span></p>
            </div>
          </div>

          <Button
            onClick={createAdmin}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating Admin...' : 'Create Admin User'}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  {result.success ? (
                    <div className="space-y-2">
                      <p className="font-semibold text-green-900">Success!</p>
                      <div className="text-sm text-green-800 space-y-1">
                        <p>📧 Email: {result.data.data.email}</p>
                        <p>🆔 Staff ID: {result.data.data.staffId}</p>
                        <p className="text-orange-600 font-medium mt-2">
                          ⚠️ {result.data.data.note}
                        </p>
                      </div>
                      <Button
                        onClick={() => window.location.href = '/auth/login'}
                        className="mt-4 w-full"
                      >
                        Go to Login
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-red-900">Error</p>
                      <p className="text-sm text-red-800">{result.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 text-center">
            This page should only be used for initial setup
          </div>
        </div>
      </div>
    </div>
  );
}
