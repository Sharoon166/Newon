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
import { Loader2, Info, CalendarIcon, LockKeyhole } from 'lucide-react';
import { Purchase, CreatePurchaseDto, UpdatePurchaseDto } from '../types';
import { createPurchase, updatePurchase } from '../actions';
import { createAdjustmentPurchase } from '@/features/stock/actions';
import { formatCurrency, cn } from '@/lib/utils';
import { NumberInput } from '@/components/ui/number-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SupplierSelect } from '@/features/suppliers/components/supplier-select';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox';

const purchaseFormSchema = z
  .object({
    productId: z.string().optional(), // Optional for when productId is provided via props
    variantId: z.string().min(1, 'Variant is required'),
    supplier: z.string().min(1, 'Supplier is required'),
    supplierId: z.string().optional(),
    locationId: z.string().min(1, 'Location is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    /** Goods cost per unit (excludes shipping). */
    purchasePrice: z.number().min(0, 'Purchase price must be non-negative'),
    /** Derived (read-only): landed cost per unit = (quantity * purchasePrice + shippingCost) / quantity. */
    unitPrice: z.number().min(0, 'Unit price must be non-negative'),
    retailPrice: z.number().min(0, 'Retail price must be non-negative'),
    wholesalePrice: z.number().min(0, 'Wholesale price must be non-negative'),
    shippingCost: z.number().min(0, 'Shipping cost must be non-negative'),
    purchaseDate: z.string().min(1, 'Purchase date is required'),
    notes: z.string().optional()
  })
  .superRefine((data, ctx) => {
    // Validate against the landed base price (goods + shipping per unit) -
    // what the derived unitPrice becomes.
    const basePrice =
      data.quantity > 0
        ? (data.quantity * data.purchasePrice + data.shippingCost) / data.quantity
        : data.purchasePrice;
    if (data.retailPrice > 0 && basePrice > data.retailPrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Base price cannot be greater than retail price',
        path: ['purchasePrice']
      });
    }
    if (data.wholesalePrice > 0 && basePrice > data.wholesalePrice) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Base price cannot be greater than wholesale price',
        path: ['purchasePrice']
      });
    }
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
    supplierId?: string;
    disabled?: boolean;
    /** Mirrored from the Product document - imported products are admin-only to purchase. */
    origin?: 'local' | 'imported';
    locations?: Array<{ id: string; name: string; address?: string; isActive: boolean }>;
  }>;
  purchase?: Purchase;
  locations?: Array<{ id: string; name: string; address?: string; isActive: boolean }>;
  // suppliers?: string[];
  supplier?: string; // Direct supplier name prop for single-product context
  defaultSupplierId?: string; // Direct supplier id prop for single-product context
  /**
   * Locks the supplier to a fixed record and switches submit to the stock
   * page's adjustment flow ("Add to in-shop"): the server creates the
   * purchase against it, settles it in full, marks it received and bumps
   * "In shop" in one action. Passed as `{ supplierId, name }`.
   */
  lockSupplier?: { supplierId: string; name: string };
  /** When false, imported products can't be selected (and submitting is blocked). */
  canCreateImported?: boolean;
  /**
   * Origin of the fixed product in the single-product context (product form's
   * purchase tab). The variants passed there carry no origin, so the guard
   * falls back to this instead of guessing from the variant list.
   */
  origin?: 'local' | 'imported';
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
  defaultSupplierId,
  lockSupplier,
  canCreateImported = true,
  origin,
  open,
  onOpenChange,
  onSuccess
}: PurchaseFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!purchase;
  // Units already sold/allocated from this purchase. When editing, the quantity
  // cannot be reduced below this amount (remaining = quantity - usedUnits).
  const usedUnits = isEditMode ? Math.max(0, (purchase?.quantity || 0) - (purchase?.remaining || 0)) : 0;
  // Received quantity — can't order fewer than what has physically arrived.
  const receivedUnits = isEditMode ? (purchase?.receivedQuantity ?? 0) : 0;
  // The hard floor: quantity must be >= both sold units AND received units.
  const minQuantity = Math.max(1, usedUnits, receivedUnits);
  // Auto-select variant if only one exists
  const defaultVariantId = variantId || (variants.length === 1 ? variants[0].id : '');

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      productId: productId || '',
      variantId: defaultVariantId,
      supplier: lockSupplier?.name || '',
      supplierId: lockSupplier?.supplierId || defaultSupplierId || '',
      locationId: 'office',
      quantity: 1,
      purchasePrice: 0,
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

  // Products the signed-in user may record a purchase against. Staff can't
  // purchase imported products, so those never appear in the picker.
  const selectableProductIds = useMemo(() => {
    const ids = Array.from(new Set(variants.map(v => v.productId)));
    if (canCreateImported) return ids;
    return ids.filter(id => variants.find(v => v.productId === id)?.origin !== 'imported');
  }, [variants, canCreateImported]);

  // Options for the searchable product combobox - same shape the supplier
  // select uses, so the input can filter by product name as you type.
  const productOptions = useMemo(
    () =>
      selectableProductIds.map(prodId => {
        const variant = variants.find(v => v.productId === prodId);
        return { value: prodId, label: variant?.productName || `Product ${prodId}` };
      }),
    [selectableProductIds, variants]
  );

  // Origin of the product this form would create a purchase for. In the
  // single-product context the variants carry no origin, so fall back to the
  // explicit `origin` prop.
  const selectedProductOrigin = useMemo(
    () => variants.find(v => v.productId === (productId || selectedProductId))?.origin ?? origin,
    [variants, productId, selectedProductId, origin]
  );

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

  // Get the product's supplier name
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

  // Get the product's linked supplier id
  const productSupplierId = useMemo(() => {
    if (!selectedProductId) return '';
    if (defaultSupplierId) return defaultSupplierId;
    if (productId && variants.length > 0) {
      return variants[0]?.supplierId || '';
    }
    const productVariant = variants.find(v => v.productId === selectedProductId);
    return productVariant?.supplierId || '';
  }, [selectedProductId, variants, productId, defaultSupplierId]);

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
          supplierId: purchase.supplierId || '',
          locationId: purchase.locationId || 'office',
          quantity: purchase.quantity || 1,
          // Edit-time backfill: legacy purchases (no purchasePrice) start from
          // their unitPrice, so saving the form persists the goods price.
          purchasePrice: purchase.purchasePrice ?? purchase.unitPrice ?? 0,
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
        const initialSupplierId =
          defaultSupplierId || (productId && variants.length > 0 ? variants[0]?.supplierId || '' : '');
        form.reset({
          productId: productId || '',
          variantId: defaultVariantId,
          supplier: initialSupplier,
          supplierId: initialSupplierId,
          locationId: 'office',
          quantity: 1,
          purchasePrice: 0,
          unitPrice: 0,
          retailPrice: 0,
          wholesalePrice: 0,
          shippingCost: 0,
          purchaseDate: new Date().toISOString().split('T')[0],
          notes: ''
        });
      }
    }
  }, [supplier, purchase, open, form, variantId, defaultVariantId, defaultSupplierId, variants, productId]);

  // Reset variant, location, and set supplier when product changes
  const watchedProductId = form.watch('productId');
  useEffect(() => {
    if (open && !productId && !isEditMode && watchedProductId) {
      // Reset variant when product changes, but keep office as default location
      form.setValue('variantId', '');
      form.setValue('locationId', 'office');

      // Auto-select the product's supplier
      if (productSupplier) {
        form.setValue('supplier', productSupplier);
      }
      form.setValue('supplierId', productSupplierId || '');
    }
  }, [watchedProductId, open, productId, isEditMode, form, productSupplier, productSupplierId]);

  const onSubmit = async (data: PurchaseFormValues) => {
    // Staff may not record purchases against imported products - the same
    // rule the server enforces with `create:imported-purchases` (on both
    // create and update).
    if (!canCreateImported && selectedProductOrigin === 'imported') {
      toast.error('Purchases for imported products can only be recorded by an admin');
      return;
    }

    try {
      setLoading(true);

      const purchaseData = {
        ...data,
        purchaseDate: new Date(data.purchaseDate)
      };

      if (isEditMode && purchase) {
        // Units already sold/allocated from this purchase - the quantity can
        // never be edited below this amount (mirrors the server-side check).
        if (data.quantity < usedUnits) {
          form.setError('quantity', {
            message: `Quantity cannot be lower than ${usedUnits}: ${usedUnits} unit(s) have already been sold or allocated from this purchase`
          });
          return;
        }

        // The amount owed (goods cost: quantity * purchasePrice) can never
        // drop below the payments already made against the purchase - the
        // payments must be adjusted first (mirrors the server-side check).
        // Untracked purchases have no payment history.
        const isTracked = purchase.isUntracked === false || purchase.paymentsTracked === true;
        const paid = isTracked ? purchase.paidAmount || 0 : 0;
        const newAmountDue = data.quantity * data.purchasePrice;
        if (paid > 0 && newAmountDue < paid - 0.001) {
          const changedField =
            data.quantity !== purchase.quantity
              ? 'quantity'
              : data.purchasePrice !== (purchase.purchasePrice ?? purchase.unitPrice)
                ? 'purchasePrice'
                : 'shippingCost';
          form.setError(changedField, {
            message: `Total (${formatCurrency(newAmountDue, false)}) cannot be less than the ${formatCurrency(paid, false)} already paid. Please adjust the payments first, then edit this purchase.`
          });
          return;
        }

        const updateData: UpdatePurchaseDto = purchaseData;
        await updatePurchase(purchase.id || purchase._id!, updateData);
        toast.success('Purchase updated successfully');
      } else if (lockSupplier) {
        // Adjustment flow (Stock page's "Add to in-shop"): the supplier is
        // fixed, and the server settles the purchase in full, marks it fully
        // received and bumps "In shop" in one action.
        const result = await createAdjustmentPurchase({
          productId: data.productId || productId,
          variantId: data.variantId,
          quantity: data.quantity,
          purchasePrice: data.purchasePrice,
          unitPrice: data.unitPrice,
          retailPrice: data.retailPrice,
          wholesalePrice: data.wholesalePrice,
          shippingCost: data.shippingCost,
          purchaseDate: data.purchaseDate,
          notes: data.notes,
          locationId: data.locationId,
          clientRef: crypto.randomUUID()
        });
        if (!result.success) {
          toast.error(result.error || 'Failed to add stock to in-shop');
          return;
        }
        toast.success(`Added ${data.quantity} unit(s) to in-shop`);
      } else {
        const createData: CreatePurchaseDto = {
          productId: data.productId || productId,
          variantId: data.variantId,
          supplier: data.supplier,
          supplierId: data.supplierId || undefined,
          locationId: data.locationId,
          quantity: data.quantity,
          purchasePrice: data.purchasePrice,
          unitPrice: data.unitPrice,
          retailPrice: data.retailPrice,
          wholesalePrice: data.wholesalePrice,
          shippingCost: data.shippingCost,
          purchaseDate: new Date(data.purchaseDate),
          notes: data.notes
        };
        await createPurchase(createData);
        // window.location.reload(); // to update the inventory tab
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

  // Calculate total cost for display (landed: goods + shipping, shipping
  // counted once regardless of quantity).
  const quantity = form.watch('quantity') || 0;
  const purchasePrice = form.watch('purchasePrice') || 0;
  const shippingCost = form.watch('shippingCost') || 0;
  const totalCost = quantity * purchasePrice + shippingCost;
  const isBelowMinQty = isEditMode && quantity < minQuantity;

  // unitPrice is derived (read-only): landed cost per unit =
  // (quantity * purchasePrice + shippingCost) / quantity. Keep the form value
  // in sync so validations, DTOs and displays always agree with the inputs.
  useEffect(() => {
    if (!open || quantity <= 0) return;
    const derived = Math.round(((quantity * purchasePrice + shippingCost) / quantity) * 100) / 100;
    if (form.getValues('unitPrice') !== derived) {
      form.setValue('unitPrice', derived);
    }
  }, [open, quantity, purchasePrice, shippingCost, form]);

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
        <ScrollArea className="max-h-[75vh] -mx-4 px-4">
          <DialogHeader className="mb-4">
            <DialogTitle>
              {isEditMode ? 'Edit Purchase' : 'Add Purchase'}
              {isEditMode && purchase?.purchaseId && (
                <span className="ml-2 text-sm font-mono text-muted-foreground">({purchase.purchaseId})</span>
              )}
            </DialogTitle>
            <DialogDescription>
              {lockSupplier
                ? 'Add stock that is already physically in the shop. The purchase is settled in full on creation.'
                : isEditMode
                  ? 'Update the purchase details below.'
                  : 'Add a new purchase record for this variant.'}
            </DialogDescription>
          </DialogHeader>

          {/* Relationship summary — only shown in edit mode */}
          {isEditMode && purchase && (
            <div className="rounded-md border border-border bg-muted/30 mb-4 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground">Purchase usage</span>
                {purchase.purchaseId && (
                  <span className="text-xs text-muted-foreground font-mono">{purchase.purchaseId}</span>
                )}
              </div>
              <div className="divide-y divide-border">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-muted-foreground">Ordered</span>
                  <span className="text-sm font-medium tabular-nums">{purchase.quantity}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-muted-foreground">Sold / allocated</span>
                  <span className={`text-sm font-medium tabular-nums ${usedUnits > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {usedUnits}
                  </span>
                </div>
                {receivedUnits > 0 && (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-muted-foreground">Physically received</span>
                    <span className="text-sm font-medium tabular-nums">{receivedUnits}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-muted-foreground">Still available</span>
                  <span className={`text-sm font-medium tabular-nums ${purchase.remaining > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {purchase.remaining}
                  </span>
                </div>
                {purchase.quantity > 0 && usedUnits > 0 && (
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-foreground/40 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (usedUnits / purchase.quantity) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {Math.round((usedUnits / purchase.quantity) * 100)}% used
                    </span>
                  </div>
                )}
              </div>
              {minQuantity > 1 && (
                <div className="px-3 py-2 border-t border-border bg-amber-50/60 dark:bg-amber-950/20">
                  <p className="text-xs text-amber-800 dark:text-amber-400">
                    Minimum quantity is <span className="font-semibold">{minQuantity}</span>
                    {usedUnits > 0 && receivedUnits > 0
                      ? ` (${usedUnits} sold · ${receivedUnits} received)`
                      : usedUnits > 0
                        ? ` — ${usedUnits} unit${usedUnits !== 1 ? 's' : ''} already sold`
                        : ` — ${receivedUnits} unit${receivedUnits !== 1 ? 's' : ''} already received`}
                  </p>
                </div>
              )}
            </div>
          )}
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
                          {/* Searchable product picker - mirrors SupplierSelect's combobox. */}
                          <Combobox
                            items={productOptions}
                            itemToStringValue={option => option.label}
                            itemToStringLabel={option => option.label}
                            value={productOptions.find(option => option.value === field.value) ?? null}
                            onValueChange={option => {
                              field.onChange(option?.value ?? '');
                              // Reset variant selection when product changes
                              form.setValue('variantId', '');
                            }}
                            autoHighlight
                            disabled={isEditMode}
                          >
                            <ComboboxInput
                              className="w-full"
                              placeholder="Search product..."
                              disabled={isEditMode}
                            />
                            <ComboboxContent>
                              <ComboboxEmpty>No products found.</ComboboxEmpty>
                              <ComboboxList>
                                {(option: (typeof productOptions)[number]) => (
                                  <ComboboxItem key={option.value} value={option}>
                                    {option.label}
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>
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
                  render={() => (
                    <FormItem>
                      <FormLabel>
                        Supplier <span className="text-destructive">*</span>
                      </FormLabel>
                      {lockSupplier ? (
                        // Adjustment flow: the supplier is fixed server-side too.
                        <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-muted/50 px-3">
                          <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-medium">{lockSupplier.name}</span>
                          <span className="text-xs text-muted-foreground">locked for stock adjustments</span>
                        </div>
                      ) : (
                        <SupplierSelect
                          value={form.watch('supplierId')}
                          legacyName={!form.watch('supplierId') ? form.watch('supplier') : undefined}
                          currentName={form.watch('supplier')}
                          restrictToCountry={!canCreateImported ? 'PK' : undefined}
                          onChange={(supplierId, supplierName) => {
                            form.setValue('supplierId', supplierId, { shouldValidate: true });
                            form.setValue('supplier', supplierName, { shouldValidate: true });
                          }}
                        />
                      )}
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
                      {minQuantity > 1 && (
                        <p className="text-xs text-muted-foreground">
                          Minimum: {minQuantity} ({usedUnits > 0 ? `${usedUnits} sold` : ''}
                          {usedUnits > 0 && receivedUnits > 0 ? ', ' : ''}
                          {receivedUnits > 0 ? `${receivedUnits} received` : ''})
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Purchase Price <span className="text-destructive">*</span>
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
                      <p className="text-xs text-muted-foreground">Goods cost per unit (excludes shipping)</p>
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
                          disabled
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.stopPropagation();
                            }
                          }}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Derived: landed cost per unit (incl. shipping)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="retailPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retail Price</FormLabel>
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
                      <FormLabel>Wholesale Price</FormLabel>
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
                      <FormLabel>Shipping Cost</FormLabel>
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
                          className='max-w-96'
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
                <Button
                  type="submit"
                  disabled={loading || isBelowMinQty}
                  title={isBelowMinQty ? `Quantity cannot be below ${usedUnits} (units already sold)` : undefined}
                >
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
