'use client';

import { v4 as uuidv4 } from 'uuid';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductVariant, ProductAttribute } from '../../types';
import { VariantForm } from './variant-form';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type VariantsManagerProps = {
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  locations: Array<{
    id: string;
    name: string;
    address?: string;
    isActive: boolean;
  }>;
  onChange: (variants: ProductVariant[]) => void;
  isSimpleProduct?: boolean;
  productId?: string;
};

export function VariantsManager({ 
  attributes = [], 
  variants, 
  locations = [], 
  onChange, 
  isSimpleProduct = false,
  productId
}: VariantsManagerProps) {
  const updateVariant = (id: string, updates: Partial<ProductVariant>) => {
    onChange(variants.map(variant => (variant.id === id ? { ...variant, ...updates } : variant)));
  };

  const addVariant = () => {
    // Don't allow adding more than one variant for simple products
    if (isSimpleProduct && variants.length >= 1) {
      return;
    }
    
    const newVariant: ProductVariant = {
      id: `var_${uuidv4()}`,
      sku: '',
      attributes: {},
      purchasePrice: 0,
      retailPrice: 0,
      wholesalePrice: 0,
      shippingCost: 0,
      availableStock: 0,
      stockOnBackorder: 0,
      inventory: locations.map(location => ({
        locationId: location.id,
        availableStock: 0,
        backorderStock: 0
      }))
    };
    onChange([...variants, newVariant]);
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter(variant => variant.id !== id));
  };

  const isAllVariantsValid = variants.every(variant => {
    return (
      variant.sku.length > 0 &&
      variant.purchasePrice > 0 &&
      variant.retailPrice > 0 &&
      variant.wholesalePrice > 0 &&
      variant.shippingCost > 0 &&
      variant.availableStock > 0 &&
      variant.stockOnBackorder > 0
    );
  });

  return (
    <div className="space-y-4">
      {!isSimpleProduct && attributes.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Add attributes first to create variants.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {variants.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center">
              <p className="text-muted-foreground">
                {isSimpleProduct ? 'Add product details below' : 'No variants added yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {variants.map((variant, index) => (
                <Card key={variant.id} className={cn("px-6 space-y-2")}>
                  <VariantForm
                    key={variant.id}
                    variantNumber={isSimpleProduct ? undefined : index + 1}
                    variant={variant}
                    attributes={attributes}
                    onVariantChange={updatedVariant => updateVariant(variant.id, updatedVariant)}
                    onRemove={isSimpleProduct ? undefined : () => removeVariant(variant.id)}
                    locations={locations}
                    isSimpleProduct={isSimpleProduct}
                    productId={productId}
                    variantId={variant.id}
                  />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
      {!isSimpleProduct && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addVariant}
            className="w-full max-w-md"
            disabled={!isAllVariantsValid || (attributes.length === 0)}
          >
            <Plus className="h-4 w-4" />
            Add Another Variant
          </Button>
        </div>
      )}
    </div>
  );
}
