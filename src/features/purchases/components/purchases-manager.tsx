'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { PurchaseForm } from './purchase-form';
import { PurchasesTable } from './purchases-table';
import { Purchase } from '../types';
import { getPurchasesByProductId, getPurchasesByVariantId } from '../actions';
import { formatCurrency } from '@/lib/utils';

interface PurchasesManagerProps {
  productId: string;
  variantId?: string;
  variants?: Array<{ id: string; sku: string; attributes: Record<string, string> }>;
  locations?: Array<{ id: string; name: string; address?: string; isActive: boolean }>;
  suppliers?: string[];
}

export function PurchasesManager({
  productId,
  variantId,
  variants = [],
  locations = [],
  suppliers = [],
}: PurchasesManagerProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | undefined>(undefined);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variantId || 'all');

  const loadPurchases = React.useCallback(async () => {
    try {
      setLoading(true);
      if (selectedVariantId && selectedVariantId !== 'all') {
        const data = await getPurchasesByVariantId(productId, selectedVariantId);
        setPurchases(data as unknown as Purchase[]);
      } else {
        // If no variant selected, show all purchases for the product
        const data = await getPurchasesByProductId(productId);
        setPurchases(data as unknown as Purchase[]);
      }
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  }, [productId, selectedVariantId]);

  useEffect(() => {
    if (productId) {
      if (variantId && (selectedVariantId === 'all' || !selectedVariantId)) {
        setSelectedVariantId(variantId);
      }
    }
  }, [productId, variantId, selectedVariantId]);

  useEffect(() => {
    if (productId) {
      loadPurchases();
    }
  }, [productId, selectedVariantId, loadPurchases]);

  const handleAddClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
    }
    setEditingPurchase(undefined);
    setFormOpen(true);
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setFormOpen(true);
  };

  const handleFormSuccess = () => {
    loadPurchases();
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingPurchase(undefined);
  };

  // Calculate summary stats
  const totalPurchased = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  const averageUnitPrice = purchases.length > 0
    ? purchases.reduce((sum, p) => sum + p.unitPrice, 0) / purchases.length
    : 0;

  // Extract unique suppliers from purchases and product supplier
  const uniqueSuppliers = Array.from(
    new Set([
      ...suppliers,
      ...purchases.map((p) => p.supplier),
    ])
  ).filter(Boolean);

  return (
    <div 
      className="space-y-6"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
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

      {/* Actions */}
      <div className="flex max-md:flex-col justify-between md:items-center flex-wrap gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Purchase History</h3>
          <p className="text-sm text-muted-foreground">
            Manage purchase records for {selectedVariantId && selectedVariantId !== 'all' ? 'this variant' : 'this product'}
          </p>
        </div>
        {variants.length > 0 && !variantId && (
          <div className="flex items-center gap-2">
            <label htmlFor="variant-select" className="text-sm font-medium">
              Filter by variant:
            </label>
            <Select
              value={selectedVariantId}
              onValueChange={(value) => {
                setSelectedVariantId(value);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All variants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All variants</SelectItem>
                {variants.map((variant) => {
                  const attrString = Object.entries(variant.attributes || {})
                    .map(([, value]) => value)
                    .join(', ');
                  const displayText = attrString 
                    ? `${variant.sku} (${attrString})`
                    : variant.sku;
                  return (
                    <SelectItem key={variant.id} value={variant.id}>
                      {displayText}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            handleAddClick(e);
          }}
          onMouseDown={(e) => {
            // Prevent form submission on mouse down as well
            if (e.button === 0) {
              e.preventDefault();
            }
          }}
          disabled={(!selectedVariantId || selectedVariantId === 'all') && variants.length > 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Purchase
        </Button>
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
          onEdit={handleEdit}
          onRefresh={loadPurchases}
        />
      )}

      {/* Purchase Form Dialog */}
      <PurchaseForm
        productId={productId}
        variantId={selectedVariantId && selectedVariantId !== 'all' ? selectedVariantId : undefined}
        variants={variants}
        purchase={editingPurchase}
        locations={locations}
        suppliers={uniqueSuppliers}
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}

