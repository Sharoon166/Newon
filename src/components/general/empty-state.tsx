import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional call to action, e.g. a "Clear search" button. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Centered empty/no-results block. Designed to be dropped inside a table
 * body cell (pass a colSpan-ful wrapper) so borders and layout stay intact.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-10 text-center', className)}>
      {Icon && <Icon className="h-8 w-8 text-muted-foreground/60" aria-hidden />}
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
