import { Info, Lightbulb } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PricingInfoProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function PricingInfo({ variant = 'default', className }: PricingInfoProps) {
  if (variant === 'compact') {
    return (
      <div className={`border border-blue-400 rounded-lg text-xs text-blue-600 bg-blue-100/40 p-2 inline-flex items-center gap-2 ${className}`}>
        <Lightbulb /> Pricing calculated from oldest purchase with remaining inventory (FIFO method)
      </div>
    );
  }

  return (
    <Alert className={className}>
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="font-medium mb-1">FIFO Pricing Method</div>
        <div className="text-sm">
          Prices are calculated from the oldest purchase that still has remaining inventory. This ensures accurate cost
          tracking and reflects the actual cost of items being sold.
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function PricingBadge({ className }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded ${className}`}>
      <Info className="h-3 w-3" />
      FIFO Pricing
    </div>
  );
}
