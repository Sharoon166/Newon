import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function NotAllowedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <ShieldAlert className="h-16 w-16 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground text-lg">
            You don&apos;t have permission to access this page.
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            Your account has limited access. If you believe this is an error, 
            please contact your administrator.
          </p>
        </div>

        <div className="pt-4">
          <Button asChild size="lg">
            <Link href="/inventory/staff">
              Go to Inventory
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
