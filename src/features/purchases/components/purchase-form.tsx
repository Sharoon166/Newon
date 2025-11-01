'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Loader2, Plus, Info } from 'lucide-react';
import { Purchase, CreatePurchaseDto, UpdatePurchaseDto } from '../types';
import { createPurchase, updatePurchase } from '../actions';
import { formatCurrency } from '@/lib/utils';

const purchaseFormSchema = z.object({
  variantId: z.string().min(1, 'Variant is required'),
  supplier: z.string().min(1, 'Supplier is required'),
  locationId: z.string().optional(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  notes: z.string().optional(),
});

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>;

interface PurchaseFormProps {
  productId: string;
  variantId?: string;
  variants?: Array<{ id: string; sku: string; attributes: Record<string, string> }>;
  purchase?: Purchase;
  locations?: Array<{ id: string; name: string; address?: string; isActive: boolean }>;
  suppliers?: string[];
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
  suppliers = [],
  open,
  onOpenChange,
  onSuccess,
}: PurchaseFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!purchase;
  // Auto-select variant if only one exists
  const defaultVariantId = variantId || (variants.length === 1 ? variants[0].id : '');

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      variantId: defaultVariantId,
      supplier: '',
      locationId: '',
      quantity: 1,
      unitPrice: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  // Reset form when purchase or open state changes
  useEffect(() => {
    if (open) {
      if (purchase) {
        const purchaseDate = purchase.purchaseDate instanceof Date
          ? purchase.purchaseDate.toISOString().split('T')[0]
          : typeof purchase.purchaseDate === 'string'
          ? purchase.purchaseDate.split('T')[0]
          : new Date().toISOString().split('T')[0];

        const editVariantId = purchase.variantId || variantId || (variants.length === 1 ? variants[0].id : '');
        form.reset({
          variantId: editVariantId,
          supplier: purchase.supplier || '',
          locationId: purchase.locationId || '',
          quantity: purchase.quantity || 1,
          unitPrice: purchase.unitPrice || 0,
          purchaseDate,
          notes: purchase.notes || '',
        });
      } else {
        form.reset({
          variantId: defaultVariantId,
          supplier: '',
          locationId: '',
          quantity: 1,
          unitPrice: 0,
          purchaseDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
      }
    }
  }, [purchase, open, form, variantId, defaultVariantId, variants]);

  const onSubmit = async (data: PurchaseFormValues) => {
    try {
      setLoading(true);

      const purchaseData = {
        ...data,
        purchaseDate: new Date(data.purchaseDate),
        locationId: data.locationId || undefined,
      };

      if (isEditMode && purchase) {
        const updateData: UpdatePurchaseDto = purchaseData;
        await updatePurchase(purchase.id || purchase._id!, updateData);
        toast.success('Purchase updated successfully');
      } else {
        const createData: CreatePurchaseDto = {
          productId,
          variantId: data.variantId,
          supplier: data.supplier,
          locationId: data.locationId || undefined,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          purchaseDate: new Date(data.purchaseDate),
          notes: data.notes,
        };
        await createPurchase(createData);
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
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Purchase' : 'Add Purchase'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the purchase details below.'
              : 'Add a new purchase record for this variant.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form 
            data-purchase-form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit(onSubmit)(e);
            }} 
            className="space-y-4"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              // Prevent Enter key from submitting parent form
              if (e.key === 'Enter' && e.target instanceof HTMLInputElement && e.target.type !== 'submit') {
                e.stopPropagation();
              }
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {variants.length > 0 ? (
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
                          onValueChange={(value) => {
                            field.onChange(value);
                          }}
                          disabled={isEditMode || variants.length === 1}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select variant" />
                          </SelectTrigger>
                          <SelectContent>
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div className="text-sm text-muted-foreground p-2">
                  No variants available. Please add variants to the product first.
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
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select or enter supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier} value={supplier}>
                                {supplier}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!suppliers.includes(field.value) && field.value && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Add as new supplier"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Purchase Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        onChange={(e) => {
                          e.stopPropagation();
                          field.onChange(e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {locations.length > 0 && (
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value || undefined}
                          onValueChange={(value) => {
                            // Convert empty string or special value to undefined
                            field.onChange(value && value !== 'none' ? value : undefined);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select location (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations
                              .filter((loc) => loc.isActive)
                              .map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quantity <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={field.value}
                        onChange={(e) => {
                          e.stopPropagation();
                          field.onChange(parseFloat(e.target.value) || 0);
                        }}
                        onKeyDown={(e) => {
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
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={field.value}
                        onChange={(e) => {
                          e.stopPropagation();
                          field.onChange(parseFloat(e.target.value) || 0);
                        }}
                        onKeyDown={(e) => {
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
                <span className="text-lg font-bold">
                  {formatCurrency(totalCost)}
                </span>
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
                      onChange={(e) => {
                        e.stopPropagation();
                        field.onChange(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Update Purchase' : 'Create Purchase'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

