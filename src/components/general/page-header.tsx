import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  backLink?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, backLink, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="space-y-1">
          {backLink && backLink !== '/' && (
            <Button variant="ghost" asChild>
              <Link href={backLink}>
                <ArrowLeft className="h-4 w-4" />
                <span>Back to {backLink.split('/').pop()}</span>
              </Link>
            </Button>
          )}
          <h1 className="text-2xl md:text-4xl text-primary font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
