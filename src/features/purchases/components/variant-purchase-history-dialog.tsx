'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PurchasesTable } from './purchases-table';
import { Purchase } from '../types';
import { getPurchasesByVariantId } from '../actions';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface VariantPurchaseHistoryDialogProps {
  productId: string;
  variantId: string;
  variantSku?: string;
  variantAttributes?: Record<string, string>;
  productAttributes?: Array<{ id: string; name: string }>;
  locations?: Array<{ id: string; name: string; address?: string; isActive: boolean }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VariantPurchaseHistoryDialog({
  productId,
  variantId,
  variantSku,
  variantAttributes = {},
  productAttributes = [],
  locations = [],
  open,
  onOpenChange,
}: VariantPurchaseHistoryDialogProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPurchases = React.useCallback(async () => {
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
    if (open && productId && variantId) {
      loadPurchases();
    }
  }, [open, productId, variantId, loadPurchases]);

  // Calculate summary stats
  const totalPurchased = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  const averageUnitPrice = purchases.length > 0
    ? purchases.reduce((sum, p) => sum + p.unitPrice, 0) / purchases.length
    : 0;

  // Format variant display name
  const variantDisplayName = (() => {
    if (variantSku) {
      const attrString = Object.entries(variantAttributes)
        .map(([attrId, value]) => {
          const attr = productAttributes.find(a => a.id === attrId);
          return attr ? `${attr.name}: ${value}` : value;
        })
        .join(', ');
      return attrString ? `${variantSku} (${attrString})` : variantSku;
    }
    return 'Variant';
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase History - {variantDisplayName}</DialogTitle>
          <DialogDescription>
            View and manage purchase records for this variant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
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
                // This dialog is read-only for viewing purchase history
              }}
              onRefresh={loadPurchases}
              readOnly={true}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

