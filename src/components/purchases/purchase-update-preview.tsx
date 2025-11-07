'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, TrendingDown, Package } from 'lucide-react';

interface PurchaseUpdatePreviewProps {
  originalQuantity: number;
  originalRemaining: number;
  newQuantity: number;
  locationName?: string;
  currentVariantStock?: number;
  className?: string;
}

export function PurchaseUpdatePreview({
  originalQuantity,
  originalRemaining,
  newQuantity,
  locationName,
  currentVariantStock = 0,
  className
}: PurchaseUpdatePreviewProps) {
  const [newRemaining, setNewRemaining] = useState(originalRemaining);
  const [inventoryChange, setInventoryChange] = useState(0);
  const [newVariantStock, setNewVariantStock] = useState(currentVariantStock);

  useEffect(() => {
    if (newQuantity !== originalQuantity) {
      if (newQuantity > originalQuantity) {
        // Quantity increased - add difference to remaining
        const increase = newQuantity - originalQuantity;
        setNewRemaining(originalRemaining + increase);
        setInventoryChange(increase);
        setNewVariantStock(currentVariantStock + increase);
      } else if (newQuantity < originalQuantity) {
        // Quantity decreased - adjust remaining proportionally
        const ratio = newQuantity / originalQuantity;
        const adjustedRemaining = Math.min(Math.floor(originalRemaining * ratio), newQuantity);
        const decrease = originalQuantity - newQuantity;
        setNewRemaining(adjustedRemaining);
        setInventoryChange(-decrease);
        setNewVariantStock(Math.max(0, currentVariantStock - decrease));
      }
    } else {
      setNewRemaining(originalRemaining);
      setInventoryChange(0);
      setNewVariantStock(currentVariantStock);
    }
  }, [originalQuantity, originalRemaining, newQuantity, currentVariantStock]);

  if (newQuantity === originalQuantity) {
    return null; // No changes to show
  }

  const isIncrease = newQuantity > originalQuantity;
  const quantityDiff = newQuantity - originalQuantity;
  const remainingDiff = newRemaining - originalRemaining;
  const variantStockDiff = newVariantStock - currentVariantStock;

  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-blue-900 flex items-center gap-2">
          {isIncrease ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          Purchase Update Preview
        </CardTitle>
        <CardDescription className="text-blue-700">
          {locationName && `Location: ${locationName}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quantity Change */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">Quantity:</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white">
              {originalQuantity}
            </Badge>
            <ArrowRight className="h-3 w-3 text-blue-600" />
            <Badge variant={isIncrease ? "default" : "destructive"}>
              {newQuantity}
            </Badge>
            <span className={`text-xs font-medium ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
              ({isIncrease ? '+' : ''}{quantityDiff})
            </span>
          </div>
        </div>

        {/* Remaining Change */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">Remaining:</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white">
              {originalRemaining}
            </Badge>
            <ArrowRight className="h-3 w-3 text-blue-600" />
            <Badge variant={remainingDiff >= 0 ? "default" : "destructive"}>
              {newRemaining}
            </Badge>
            <span className={`text-xs font-medium ${remainingDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({remainingDiff >= 0 ? '+' : ''}{remainingDiff})
            </span>
          </div>
        </div>

        {/* Variant Stock Change */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900 flex items-center gap-1">
            <Package className="h-3 w-3" />
            Variant Stock:
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white">
              {currentVariantStock}
            </Badge>
            <ArrowRight className="h-3 w-3 text-blue-600" />
            <Badge variant={variantStockDiff >= 0 ? "default" : "destructive"}>
              {newVariantStock}
            </Badge>
            <span className={`text-xs font-medium ${variantStockDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({variantStockDiff >= 0 ? '+' : ''}{variantStockDiff})
            </span>
          </div>
        </div>

        {/* Impact Summary */}
        <div className="pt-2 border-t border-blue-200">
          <div className="text-sm font-medium text-blue-900 mb-1">Impact Summary:</div>
          <div className="space-y-1 text-xs text-blue-700">
            <div>• Location inventory: {inventoryChange >= 0 ? '+' : ''}{inventoryChange} units</div>
            <div>• Variant total stock: {variantStockDiff >= 0 ? '+' : ''}{variantStockDiff} units</div>
            <div>• Purchase remaining: {remainingDiff >= 0 ? '+' : ''}{remainingDiff} units</div>
          </div>
        </div>

        {/* Calculation Explanation */}
        <div className="bg-blue-100 p-2 rounded text-xs text-blue-800">
          <strong>Calculation:</strong> {isIncrease 
            ? `Remaining: ${originalRemaining} + ${quantityDiff} = ${newRemaining}`
            : `Remaining: ${originalRemaining} × (${newQuantity}/${originalQuantity}) = ${newRemaining}`
          }
        </div>
      </CardContent>
    </Card>
  );
}