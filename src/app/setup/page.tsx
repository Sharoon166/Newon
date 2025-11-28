'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { checkAndCreateOtcCustomer } from './actions';

export default function SetupPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'creating' | 'success' | 'error'>('checking');
  const [message, setMessage] = useState('Checking OTC customer...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const setupOtcCustomer = async () => {
      try {
        setStatus('checking');
        setMessage('Checking if OTC customer exists...');
        
        const result = await checkAndCreateOtcCustomer();
        
        if (result.created) {
          setStatus('creating');
          setMessage('Creating OTC customer...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        setStatus('success');
        setMessage(result.message);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to setup OTC customer');
      }
    };

    setupOtcCustomer();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">System Setup</CardTitle>
          <CardDescription>
            Setting up required system customers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {status === 'checking' || status === 'creating' ? (
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            ) : status === 'success' ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-500" />
            )}
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {status === 'success' && (
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          )}

          {status === 'error' && (
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Retry Setup
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
