'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Trash2, Package, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { createVirtualProduct, updateVirtualProduct } from '../actions';
import type { VirtualProduct } from '../types';
import type { EnhancedVariants } from '@/features/inventory/types';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';

interface VirtualProductFormProps {
  initialData?: VirtualProduct;
  variants: EnhancedVariants[];
  mode: 'create' | 'edit';
}

export function VirtualProductForm({ initialData, variants, mode }: VirtualProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<VirtualProduct, '_id' | 'createdAt' | 'updatedAt'>>({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    description: initialData?.description || '',
    components: initialData?.components || [],
    retailPrice: initialData?.retailPrice || 0,
    wholesalePrice: initialData?.wholesalePrice || 0,
    categories: initialData?.categories || [],
    disabled: initialData?.disabled || false
  });
  const [categoryInput, setCategoryInput] = useState('');

  // Filter variants based on search query - not needed with Combobox items prop
  const availableVariants = variants.filter(v => !v.disabled);

  const handleAddComponent = (variantKey: string) => {
    // variantKey format: "productName - sku"
    const variant = availableVariants.find(v => 
      `${v.productName} - ${v.sku}` === variantKey
    );
    
    if (!variant) return;

    // Check if already added
    if (formData.components.some(c => c.productId === variant.productId && c.variantId === variant.id)) {
      toast.error('Component already added');
      return;
    }

    setFormData(prev => ({
      ...prev,
      components: [
        ...prev.components,
        {
          productId: variant.productId,
          variantId: variant.id,
          quantity: 1,
          productName: variant.productName,
          sku: variant.sku,
          image: variant.image || variant.imageFile?.cloudinaryUrl,
          availableStock: variant.availableStock
        }
      ]
    }));
  };

  const handleRemoveComponent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index)
    }));
  };

  const handleComponentQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;
    
    setFormData(prev => ({
      ...prev,
      components: prev.components.map((comp, i) =>
        i === index ? { ...comp, quantity } : comp
      )
    }));
  };

  const handleAddCategory = () => {
    if (!categoryInput.trim()) return;
    
    if (formData.categories.includes(categoryInput.trim())) {
      toast.error('Category already added');
      return;
    }

    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, categoryInput.trim()]
    }));
    setCategoryInput('');
  };

  const handleRemoveCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    if (!formData.sku.trim()) {
      toast.error('Please enter a SKU');
      return;
    }

    if (formData.components.length === 0) {
      toast.error('Please add at least one component');
      return;
    }

    if (formData.retailPrice <= 0) {
      toast.error('Retail price must be greater than 0');
      return;
    }

    if (formData.wholesalePrice <= 0) {
      toast.error('Wholesale price must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'create') {
        await createVirtualProduct(formData);
        toast.success('Virtual product created successfully');
      } else {
        await updateVirtualProduct(initialData!._id!, formData);
        toast.success('Virtual product updated successfully');
      }
      router.push('/virtual-products');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save virtual product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter product name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU *</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              placeholder="Enter SKU"
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter product description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="retailPrice">Retail Price *</Label>
            <Input
              id="retailPrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.retailPrice}
              onChange={e => setFormData(prev => ({ ...prev, retailPrice: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wholesalePrice">Wholesale Price *</Label>
            <Input
              id="wholesalePrice"
              type="number"
              step="0.01"
              min="0"
              value={formData.wholesalePrice}
              onChange={e => setFormData(prev => ({ ...prev, wholesalePrice: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Categories</h3>
        <div className="flex gap-2 mb-3">
          <Input
            value={categoryInput}
            onChange={e => setCategoryInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
            placeholder="Add category"
          />
          <Button type="button" onClick={handleAddCategory}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.categories.map(category => (
            <Badge key={category} variant="secondary" className="gap-1">
              {category}
              <button
                type="button"
                onClick={() => handleRemoveCategory(category)}
                className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Components *</h3>
        <div className="space-y-4">
          <Combobox
            items={availableVariants}
            itemToStringValue={(variant: EnhancedVariants) => `${variant.productName} - ${variant.sku}`}
            onInputValueChange={handleAddComponent}
            autoHighlight
          >
            <ComboboxInput
              placeholder="Search and select product variant..."
              className="w-full"
            />
            <ComboboxContent>
              <ComboboxEmpty>No variants found</ComboboxEmpty>
              <ComboboxList>
                {(variant: EnhancedVariants) => (
                  <ComboboxItem
                    key={`${variant.productId}-${variant.id}`}
                    value={`${variant.productName} - ${variant.sku}`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar className="h-8 w-8 rounded-md">
                        <AvatarImage 
                          src={variant.image || variant.imageFile?.cloudinaryUrl} 
                          alt={variant.productName}
                          className="object-contain"
                        />
                        <AvatarFallback className="rounded-md text-xs">
                          {variant.productName?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{variant.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {variant.sku} • Stock: {variant.availableStock}
                        </div>
                      </div>
                    </div>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>

          {formData.components.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No components added yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.components.map((component, index) => (
                <Card key={`${component.productId}-${component.variantId}`} className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 rounded-md">
                      <AvatarImage src={component.image} alt={component.productName} className="object-contain" />
                      <AvatarFallback className="rounded-md">
                        {component.productName?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{component.productName}</div>
                      <div className="text-sm text-muted-foreground">SKU: {component.sku}</div>
                      <div className="text-xs text-muted-foreground">
                        Available: {component.availableStock || 0}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor={`qty-${index}`} className="text-sm whitespace-nowrap">
                        Qty:
                      </Label>
                      <Input
                        id={`qty-${index}`}
                        type="number"
                        min="1"
                        value={component.quantity}
                        onChange={e => handleComponentQuantityChange(index, parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveComponent(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : mode === 'create' ? 'Create Virtual Product' : 'Update Virtual Product'}
        </Button>
      </div>
    </form>
  );
}
