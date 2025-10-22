'use client';

import { v4 as uuidv4 } from 'uuid';
import { ProductVariant, ProductAttribute } from '../../types';
import { VariantForm } from './variant-form';

type VariantsManagerProps = {
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
};

export function VariantsManager({ attributes = [], variants, onChange }: VariantsManagerProps) {
  const updateVariant = (id: string, updates: Partial<ProductVariant>) => {
    onChange(variants.map(variant => (variant.id === id ? { ...variant, ...updates } : variant)));
  };

  const removeVariant = (id: string) => {
    onChange(variants.filter(variant => variant.id !== id));
  };

  return (
    <div className="space-y-4">
      {attributes.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">Add attributes first to create variants.</p>
        </div>
      ) : variants.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No variants added yet. Click &quot;Add Variant&quot; to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={variant.id} className="space-y-2">
              <h3>Variant {index + 1}</h3>
              <VariantForm
                key={variant.id}
                variant={variant}
                attributes={attributes}
                onVariantChange={updatedVariant => updateVariant(variant.id, updatedVariant)}
                onRemove={() => removeVariant(variant.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function generateVariantsFromAttributes(attributes: ProductAttribute[]): ProductVariant[] {
  if (attributes.length === 0) return [];

  // Generate all possible combinations of attribute values
  const combinations: Record<string, string>[] = [];

  function generateCombinations(index: number, current: Record<string, string>) {
    if (index === attributes.length) {
      combinations.push({ ...current });
      return;
    }

    const attribute = attributes[index];
    for (const value of attribute.values) {
      current[attribute.id] = value;
      generateCombinations(index + 1, current);
    }
  }

  generateCombinations(0, {});

  // Convert combinations to variants
  return combinations.map((attributes, index) => ({
    id: `var_${uuidv4()}`,
    sku: `SKU-${index + 1}`,
    attributes,
    image: '',
    purchasePrice: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    shippingCost: 0,
    availableStock: 0,
    stockOnBackorder: 0
  }));
}
