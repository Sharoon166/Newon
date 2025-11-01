'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { PurchasesTable } from './purchases-table';
import { Purchase } from '../types';
import { getPurchasesByVariantId } from '../actions';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface VariantPurchaseHistoryButtonProps {
  productId: string;
  variantId: string;
  variantSku?: string;
  variantAttributes?: Record<string, string>;
  productAttributes?: Array<{ id: string; name: string }>;
  locations?: Array<{ id: string; name: string; address?: string; isActive: boolean }>;
}

export function VariantPurchaseHistoryButton({
  productId,
  variantId,
  locations = [],
}: VariantPurchaseHistoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPurchases = useCallback(async () => {
    if (!productId || !variantId) return;
    
    try {
      setLoading(true);
      const data = await getPurchasesByVariantId(productId, variantId);
      setPurchases(data as unknown as Purchase[]);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  }, [productId, variantId]);

  useEffect(() => {
    if (isOpen && productId && variantId) {
      loadPurchases();
    }
  }, [isOpen, productId, variantId, loadPurchases]);

  // Calculate summary stats
  const totalPurchased = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  const averageUnitPrice = purchases.length > 0
    ? purchases.reduce((sum, p) => sum + p.unitPrice, 0) / purchases.length
    : 0;

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto"
      >
        <History className="mr-2 h-4 w-4" />
        View Purchase History
        {isOpen ? (
          <ChevronUp className="ml-2 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-2 h-4 w-4" />
        )}
      </Button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {isOpen && (
          <div className="space-y-6 pt-4 border-t">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Purchased
                </CardTitle>
                <CardContent className="p-0 text-2xl font-semibold mt-2">
                  {totalPurchased.toLocaleString()}
                </CardContent>
              </Card>
              <Card className="p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Cost
                </CardTitle>
                <CardContent className="p-0 text-2xl font-semibold mt-2">
                  {formatCurrency(totalCost)}
                </CardContent>
              </Card>
              <Card className="p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Unit Price
                </CardTitle>
                <CardContent className="p-0 text-2xl font-semibold mt-2">
                  {formatCurrency(averageUnitPrice)}
                </CardContent>
              </Card>
            </div>

            {/* Purchases Table */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading purchases...
              </div>
            ) : (
              <PurchasesTable
                purchases={purchases}
                locations={locations}
                onEdit={() => {
                  // Purchase editing should be done from the product edit page
                  // This section is read-only for viewing purchase history
                }}
                onRefresh={loadPurchases}
                readOnly={true}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

