'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Loader2, Info, CalendarIcon } from 'lucide-react';
import { Purchase, CreatePurchaseDto, UpdatePurchaseDto } from '../types';
import { createPurchase, updatePurchase } from '../actions';
import { formatCurrency, cn } from '@/lib/utils';
import { NumberInput } from '@/components/ui/number-input';
import { ScrollArea } from '@/components/ui/scroll-area';

const purchaseFormSchema = z.object({
  productId: z.string().optional(), // Optional for when productId is provided via props
  variantId: z.string().min(1, 'Variant is required'),
  supplier: z.string().min(1, 'Supplier is required'),
  locationId: z.string().min(1, 'Location is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  retailPrice: z.number().min(0, 'Retail price must be non-negative'),
  wholesalePrice: z.number().min(0, 'Wholesale price must be non-negative'),
  shippingCost: z.number().min(0, 'Shipping cost must be non-negative'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  notes: z.string().optional()
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface PurchaseFormProps {
  productId: string;
  variantId?: string;
  variants?: Array<{
    id: string;
    sku: string;
    attributes: Record<string, string>;
    productId?: string;
    productName?: string;
    supplier?: string;
    disabled?: boolean;
    locations?: Array<{ id: string; name: string; address?: string; isActive: boolean }>;
  }>;
  purchase?: Purchase;
  locations?: Array<{ id: string; name: string; address?: string; isActive: boolean }>;
  // suppliers?: string[];
  supplier?: string; // Direct supplier prop for single-product context
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PurchaseForm({
  productId,
  variantId,
  variants = [],
  purchase,
  locations = [],
  // suppliers = [],
  supplier,
  open,
  onOpenChange,
  onSuccess
}: PurchaseFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!purchase;
  // Auto-select variant if only one exists
  const defaultVariantId = variantId || (variants.length === 1 ? variants[0].id : '');

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      productId: productId || '',
      variantId: defaultVariantId,
      supplier: '',
      locationId: 'office',
      quantity: 1,
      unitPrice: 0,
      retailPrice: 0,
      wholesalePrice: 0,
      shippingCost: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: ''
    }
  });

  // Get filtered variants based on selected product (exclude disabled variants)
  const selectedProductId = form.watch('productId') || productId;
  const filteredVariants = useMemo(() => {
    if (!selectedProductId) return [];
    // If productId is provided as prop (single product context), don't filter by productId
    if (productId) {
      return variants.filter(v => !v.disabled);
    }
    // Otherwise filter by productId (multi-product context)
    return variants.filter(v => v.productId === selectedProductId && !v.disabled);
  }, [selectedProductId, variants, productId]);

  // Get filtered locations based on selected product's variants
  const filteredLocations = useMemo(() => {
    if (!selectedProductId) return locations;

    // Find the product's locations from its variants
    const productVariant = variants.find(v => v.productId === selectedProductId);
    if (productVariant?.locations && productVariant.locations.length > 0) {
      return productVariant.locations.filter(loc => loc.isActive);
    }

    return locations;
  }, [selectedProductId, variants, locations]);

  // Get the product's supplier
  const productSupplier = useMemo(() => {
    if (!selectedProductId) return '';
    // If supplier is provided directly as prop (single product context), use it
    if (supplier) {
      return supplier;
    }
    // If productId is provided as prop, try to get supplier from first variant
    if (productId && variants.length > 0) {
      return variants[0]?.supplier || '';
    }
    // Otherwise find by productId (multi-product context)
    const productVariant = variants.find(v => v.productId === selectedProductId);
    return productVariant?.supplier || '';
  }, [selectedProductId, variants, productId, supplier]);

  // Reset form when purchase or open state changes
  useEffect(() => {
    if (open) {
      if (purchase) {
        const purchaseDate =
          purchase.purchaseDate instanceof Date
            ? purchase.purchaseDate.toISOString().split('T')[0]
            : typeof purchase.purchaseDate === 'string'
              ? purchase.purchaseDate.split('T')[0]
              : new Date().toISOString().split('T')[0];

        const editVariantId = purchase.variantId || variantId || (variants.length === 1 ? variants[0].id : '');
        form.reset({
          productId: productId || '',
          variantId: editVariantId,
          supplier: purchase.supplier || '',
          locationId: purchase.locationId || '',
          quantity: purchase.quantity || 1,
          unitPrice: purchase.unitPrice || 0,
          retailPrice: purchase.retailPrice || 0,
          wholesalePrice: purchase.wholesalePrice || 0,
          shippingCost: purchase.shippingCost || 0,
          purchaseDate,
          notes: purchase.notes || ''
        });
      } else {
        // Get supplier for initial form state
        const initialSupplier = supplier || (productId && variants.length > 0 ? variants[0]?.supplier || '' : '');
        form.reset({
          productId: productId || '',
          variantId: defaultVariantId,
          supplier: initialSupplier,
          locationId: 'office',
          quantity: 1,
          unitPrice: 0,
          retailPrice: 0,
          wholesalePrice: 0,
          shippingCost: 0,
          purchaseDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
      }
    }
  }, [supplier, purchase, open, form, variantId, defaultVariantId, variants, productId]);

  // Reset variant, location, and set supplier when product changes
  const watchedProductId = form.watch('productId');
  useEffect(() => {
    if (open && !productId && !isEditMode && watchedProductId) {
      // Reset variant and location when product changes
      form.setValue('variantId', '');
      form.setValue('locationId', '');

      // Auto-select the product's supplier
      if (productSupplier) {
        form.setValue('supplier', productSupplier);
      }
    }
  }, [watchedProductId, open, productId, isEditMode, form, productSupplier]);

  const onSubmit = async (data: PurchaseFormValues) => {
    try {
      setLoading(true);

      const purchaseData = {
        ...data,
        purchaseDate: new Date(data.purchaseDate)
      };

      if (isEditMode && purchase) {
        const updateData: UpdatePurchaseDto = purchaseData;
        await updatePurchase(purchase.id || purchase._id!, updateData);
        toast.success('Purchase updated successfully');
      } else {
        const createData: CreatePurchaseDto = {
          productId: data.productId || productId,
          variantId: data.variantId,
          supplier: data.supplier,
          locationId: data.locationId,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          retailPrice: data.retailPrice,
          wholesalePrice: data.wholesalePrice,
          shippingCost: data.shippingCost,
          purchaseDate: new Date(data.purchaseDate),
          notes: data.notes
        };
        await createPurchase(createData);
        window.location.reload(); // to update the inventory tab
        toast.success('Purchase created successfully');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while saving the purchase');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total cost for display
  const quantity = form.watch('quantity') || 0;
  const unitPrice = form.watch('unitPrice') || 0;
  const totalCost = quantity * unitPrice;

  const handleDialogOpenChange = (newOpen: boolean) => {
    // Simply call the handler without any side effects
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="sm:max-w-[600px]"
        onInteractOutside={() => {
          // Allow default behavior
        }}
        onEscapeKeyDown={() => {
          // Allow escape to close
        }}
        onClick={e => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Purchase' : 'Add Purchase'}
            {isEditMode && purchase?.purchaseId && (
              <span className="ml-2 text-sm font-mono text-muted-foreground">({purchase.purchaseId})</span>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the purchase details below.' : 'Add a new purchase record for this variant.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh] -mx-4 px-4">
          <Form {...form}>
            <form
              data-purchase-form
              onSubmit={e => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit(onSubmit)(e);
              }}
              className="space-y-4"
              onClick={e => e.stopPropagation()}
              onKeyDown={e => {
                // Prevent Enter key from submitting parent form
                if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
                  e.stopPropagation();
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Selection - only show when productId is not provided */}
                {!productId && (
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem className="">
                        <FormLabel>
                          Product <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={value => {
                              field.onChange(value);
                              // Reset variant selection when product changes
                              form.setValue('variantId', '');
                            }}
                            disabled={isEditMode}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from(new Set(variants.map(v => v.productId))).map(prodId => {
                                const variant = variants.find(v => v.productId === prodId);
                                return (
                                  <SelectItem key={prodId} value={prodId || ''}>
                                    {variant?.productName || `Product ${prodId}`}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {filteredVariants.length > 0 ? (
                  <FormField
                    control={form.control}
                    name="variantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Variant <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={value => {
                              field.onChange(value);
                            }}
                            disabled={isEditMode || filteredVariants.length === 0}
                          >
                            <SelectTrigger className="w-full truncate">
                              <SelectValue placeholder="Select variant" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredVariants.map(variant => {
                                const attrString = Object.entries(variant.attributes || {})
                                  .map(([, value]) => value)
                                  .join(', ');
                                const displayText = attrString ? `${variant.sku} (${attrString})` : variant.sku;
                                return (
                                  <SelectItem key={variant.id} value={variant.id}>
                                    {displayText}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground p-2">
                    {selectedProductId ? 'No variants available for this product.' : 'Please select a product first.'}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Supplier <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={productSupplier || field.value}
                          readOnly
                          disabled
                          className="bg-muted cursor-not-allowed"
                          placeholder={selectedProductId ? 'Select a product first' : 'No supplier set'}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        Purchase Date <span className="text-destructive">*</span>
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={date => {
                              field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            }}
                            disabled={date => date > new Date() || date < new Date('1900-01-01')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Location <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value || undefined}
                          onValueChange={value => {
                            field.onChange(value);
                          }}
                        >
                          <SelectTrigger className="w-full truncate">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredLocations.length > 0 ? (
                              filteredLocations.map(location => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.name}
                                  {!location.isActive ? ' (Inactive)' : ''}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="text-sm text-muted-foreground p-2">No locations available</div>
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Quantity <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onChange={value => {
                            field.onChange(value);
                          }}
                          min={1}
                          step={1}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Unit Price <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onChange={value => {
                            field.onChange(value);
                          }}
                          min={0}
                          step="0.01"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retailPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Retail Price <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onChange={value => {
                            field.onChange(value);
                          }}
                          min={0}
                          step="0.01"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wholesalePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Wholesale Price <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onChange={value => {
                            field.onChange(value);
                          }}
                          min={0}
                          step="0.01"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shippingCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Shipping Cost <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <NumberInput
                          value={field.value}
                          onChange={value => {
                            field.onChange(value);
                          }}
                          min={0}
                          step="0.01"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-muted p-3 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Cost:</span>
                  <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Notes
                      {field.value && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[300px]">
                            <p className="whitespace-pre-wrap">{field.value}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Add any additional notes about this purchase..."
                        {...field}
                        onChange={e => {
                          e.stopPropagation();
                          field.onChange(e.target.value);
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditMode ? 'Updating...' : 'Creating...'}
                    </>
                  ) : isEditMode ? (
                    'Update Purchase'
                  ) : (
                    'Create Purchase'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
