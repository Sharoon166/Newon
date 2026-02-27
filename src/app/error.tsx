'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="h-dvh grid place-content-center place-items-center gap-8">
      <h2 className="text-destructive inline-flex items-center gap-2 text-4xl font-semibold">
        <AlertTriangle className="size-8" />
        Error
      </h2>
      <div className="space-y-4">
        <p>{error.message}</p>
        <p className="text-muted-foreground text-sm">Contact the dev team for support and further instructions</p>
      </div>
      <Button variant="secondary" onClick={reset}>
        <RefreshCw /> Try again
      </Button>
    </div>
  );
}
