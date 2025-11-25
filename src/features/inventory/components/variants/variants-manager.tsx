'use client';

import { v4 as uuidv4 } from 'uuid';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductVariant, ProductAttribute } from '../../types';
import { VariantForm } from './variant-form';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { deleteProductVariant, toggleVariantDisabled } from '../../actions';
import { toast } from 'sonner';
import { useState } from 'react';

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
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);

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
      disabled: false,
      attributes: {},
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

  const removeVariant = async (id: string) => {
    // If this is a new variant (not saved to DB yet), just remove from local state
    if (!productId || id.startsWith('var_')) {
      onChange(variants.filter(variant => variant.id !== id));
      return;
    }

    // For existing variants, call the server action
    setDeletingVariantId(id);
    try {
      const result = await deleteProductVariant(id);
      
      if (!result.success) {
        toast.error(result.message);
        
        // If deletion failed because variant was sold, offer to disable instead
        if (result.canDisable) {
          toast.info('You can disable this variant instead to hide it from new orders', {
            action: {
              label: 'Disable Variant',
              onClick: async () => {
                const toggleResult = await toggleVariantDisabled(productId, id);
                if (toggleResult.success) {
                  toast.success(toggleResult.message);
                  // Update local state to reflect disabled status
                  updateVariant(id, { disabled: true });
                } else {
                  toast.error(toggleResult.message);
                }
              }
            }
          });
        }
        return;
      }

      // If successful, remove from local state
      onChange(variants.filter(variant => variant.id !== id));
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete variant');
    } finally {
      setDeletingVariantId(null);
    }
  };

  const isAllVariantsValid = variants.every(variant => {
    return (
      variant.sku.length > 0
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
                    isDeleting={deletingVariantId === variant.id}
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
