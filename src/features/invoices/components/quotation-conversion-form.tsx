'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Percent,
  NotebookTabs as NotebookTabsIcon,
  ChevronsUpDown,
  Package,
  Save,
  Calendar as CalendarIcon,
  FileText,
  Loader2
} from 'lucide-react';
import { cn, formatCurrency, getToday } from '@/lib/utils';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { convertToWords } from '../utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { ProductSelector } from './product-selector';
import { v4 as uuidv4 } from 'uuid';

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  items: z
    .array(
      z.object({
        id: z.string(),
        description: z.string().min(1, 'Description is required'),
        quantity: z.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1'),
        rate: z.number().min(0, 'Rate must be 0 or greater'),
        amount: z.number().min(0, 'Amount must be 0 or greater'),
        productId: z.string().optional(),
        variantId: z.string().optional(),
        variantSKU: z.string().optional(),
        purchaseId: z.string().optional(),
        originalRate: z.number().optional(),
        saleRate: z.number().optional()
      })
    )
    .min(1, 'At least one item is required'),
  taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100').default(0),
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  discountType: z.enum(['percentage', 'fixed']).default('fixed'),
  amountInWords: z.string().optional(),
  paid: z.number().min(0, 'Cannot be negative').default(0),
  remainingPayment: z.number().min(0, 'Cannot be negative').default(0),
  profit: z.number().min(0, 'Profit cannot be negative').default(0),
  description: z.string().optional(),
  notes: z.string().optional()
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface QuotationConversionFormProps {
  quotation: {
    quotationNumber: string;
    date: string;
    validUntil: string;
    customerName: string;
    customerCompany?: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;
    customerCity?: string;
    customerState?: string;
    customerZip?: string;
    customerId?: string;
    items: Array<{
      id: string;
      productName: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      unit: string;
      variantId?: string;
      variantSKU?: string;
      productId?: string;
      purchaseId?: string;
      totalPrice: number;
    }>;
    subtotal: number;
    discountType: 'fixed' | 'percentage';
    discountValue: number;
    discountAmount: number;
    gstValue?: number;
    gstAmount?: number;
    taxRate?: number;
    taxAmount?: number;
    totalAmount: number;
    amountInWords?: string;
    description?: string;
    notes?: string;
    termsAndConditions?: string;
    terms?: string;
    billingType?: 'wholesale' | 'retail';
    market?: 'newon' | 'waymor';
  };
  quotationId: string;
  customerData: {
    customerName: string;
    customerCompany?: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    customerCity: string | null;
    customerState: string | null;
    customerZip: string | null;
    customerId?: string;
  };
  variants?: EnhancedVariants[];
  purchases?: Purchase[];
}

export function QuotationConversionForm({
  quotation,
  quotationId,
  customerData,
  variants = [],
  purchases = []
}: QuotationConversionFormProps) {
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>('Loading...');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch next invoice number on mount
  useEffect(() => {
    const fetchNextInvoiceNumber = async () => {
      try {
        const { getNextInvoiceNumber } = await import('@/features/invoices/actions');
        const number = await getNextInvoiceNumber('invoice');
        setNextInvoiceNumber(number);
      } catch (error) {
        console.error('Error fetching next invoice number:', error);
        setNextInvoiceNumber('Error loading');
      }
    };

    fetchNextInvoiceNumber();
  }, []);

  const form = useForm<InvoiceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: {
      invoiceNumber: '',
      date: getToday(),
      dueDate: getToday(),
      items: quotation.items.map(item => {
        // Validate and cap quantity based on purchase stock limit
        let validatedQuantity = item.quantity;
        if (item.purchaseId) {
          const purchase = purchases.find(p => p.purchaseId === item.purchaseId);
          if (purchase) {
            if (purchase.remaining === 0) {
              // Purchase is depleted - set to 1 and clear purchaseId so user can select another
              validatedQuantity = 1;
            } else if (item.quantity > purchase.remaining) {
              // Cap to available stock
              validatedQuantity = purchase.remaining;
            }
          }
        }
        
        return {
          id: item.id,
          description: item.description || item.productName,
          quantity: validatedQuantity,
          rate: item.unitPrice,
          amount: validatedQuantity * item.unitPrice,
          productId: item.productId,
          variantId: item.variantId,
          variantSKU: item.variantSKU,
          // Clear purchaseId if the purchase is depleted
          purchaseId: item.purchaseId && purchases.find(p => p.purchaseId === item.purchaseId)?.remaining === 0 
            ? undefined 
            : item.purchaseId,
          originalRate: item.unitPrice // Store original rate to detect custom pricing
        };
      }),
      taxRate: quotation.taxRate || quotation.gstValue || 0,
      discount: quotation.discountValue || 0,
      discountType: quotation.discountType || 'fixed',
      amountInWords: quotation.amountInWords || 'Zero Rupees Only',
      paid: 0,
      remainingPayment: 0,
      description: quotation.description || '',
      notes: quotation.notes
    }
  });

  // Update invoice number when fetched
  // Invoice number is display-only, not set in form to avoid race conditions

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const subtotal = form.watch('items').reduce((sum, item) => sum + item.amount, 0);
  const taxRate = form.watch('taxRate');
  const discount = form.watch('discount');
  const discountType = form.watch('discountType');
  const taxAmount = (subtotal * taxRate) / 100;
  const discountAmount = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;
  const total = subtotal + taxAmount - discountAmount;

  // Calculate profit in real-time
  const items = form.watch('items');
  const calculatedProfit = items.reduce((sum, item) => {
    const costPrice = item.originalRate ?? 0;
    const sellingPrice = item.rate;
    const profitPerUnit = sellingPrice - costPrice;
    return sum + (profitPerUnit * item.quantity);
  }, 0) - discountAmount;

  // Update profit field with calculated value
  useEffect(() => {
    form.setValue('profit', calculatedProfit, { shouldValidate: false });
  }, [calculatedProfit, form]);

  const paid = form.watch('paid') || 0;
  
  // Get outstanding balance from customer (0 for OTC) - for display only
  const isOtcCustomer = customerData.customerId === 'otc';
  const outstandingBalance = isOtcCustomer ? 0 : 0; // Will be fetched from customer data if needed
  
  // For OTC customers, automatically set paid amount to total
  useEffect(() => {
    if (isOtcCustomer && total > 0 && paid !== total) {
      form.setValue('paid', total);
    }
  }, [isOtcCustomer, total, paid, form]);
  
  // Grand total is just invoice total - paid (outstanding balance is separate)
  const grandTotal = Math.max(0, total - paid);

  form.setValue('remainingPayment', grandTotal, { shouldValidate: true });

  // Safely convert to words with validation
  const safeGrandTotal = isNaN(grandTotal) || !isFinite(grandTotal) ? 0 : Math.max(0, Math.round(grandTotal));
  const amountInWords = `${convertToWords(safeGrandTotal)} Rupees Only`;
  form.setValue('amountInWords', amountInWords, { shouldValidate: true });

  // Helper function to get available stock for an item
  const getAvailableStock = (variantId?: string) => {
    if (!variantId) return Infinity; // No limit if no variant ID

    const variantPurchases = purchases.filter(p => p.variantId === variantId && p.remaining > 0);

    return variantPurchases.reduce((sum, p) => sum + p.remaining, 0);
  };

  // Helper function to check if an item is out of stock
  const isItemOutOfStock = (variantId?: string, requestedQuantity?: number) => {
    if (!variantId) return false; // Custom items don't have stock tracking
    const available = getAvailableStock(variantId);
    return available === 0 || (requestedQuantity && available < requestedQuantity);
  };

  // Check for out of stock items on mount and show warning
  useEffect(() => {
    const outOfStockItems = quotation.items.filter(
      item => item.variantId && isItemOutOfStock(item.variantId, item.quantity)
    );

    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map(item => item.productName).join(', ');
      toast.warning('Some items are out of stock', {
        description: `The following items from the quotation are no longer available or have insufficient stock: ${itemNames}`,
        duration: 8000
      });
    }

    // Check if any quantities were adjusted due to purchase stock limits
    const depletedItems = quotation.items.filter(item => {
      if (item.purchaseId) {
        const purchase = purchases.find(p => p.purchaseId === item.purchaseId);
        return purchase && purchase.remaining === 0;
      }
      return false;
    });

    const adjustedItems = quotation.items.filter(item => {
      if (item.purchaseId) {
        const purchase = purchases.find(p => p.purchaseId === item.purchaseId);
        return purchase && purchase.remaining > 0 && item.quantity > purchase.remaining;
      }
      return false;
    });

    if (depletedItems.length > 0) {
      const itemNames = depletedItems.map(item => item.productName || item.description).join(', ');
      toast.error('Purchases depleted', {
        description: `The following items have depleted purchases and need to be sourced from available stock: ${itemNames}`,
        duration: 8000
      });
    } else if (adjustedItems.length > 0) {
      toast.warning('Quantities adjusted', {
        description: 'Some item quantities were reduced to match available stock in their purchases.',
        duration: 6000
      });
    }
  }, []);

  const handleAddItemFromSelector = (item: {
    productId?: string;
    variantId: string;
    productName: string;
    sku: string;
    description: string;
    quantity: number;
    rate: number;
    originalRate?: number;
    purchaseId?: string;
  }) => {
    // Validate item data
    if (!item.description || item.description.trim() === '') {
      toast.error('Invalid item', {
        description: 'Item description is required.'
      });
      return;
    }

    if (item.quantity <= 0) {
      toast.error('Invalid quantity', {
        description: 'Quantity must be greater than 0.'
      });
      return;
    }

    if (item.rate < 0) {
      toast.error('Invalid rate', {
        description: 'Rate cannot be negative.'
      });
      return;
    }

    // Check if item from the SAME purchase already exists in the table
    const existingItemIndex = form.watch('items').findIndex(
      (formItem) =>
        formItem.variantId === item.variantId && 
        formItem.variantSKU === item.sku &&
        formItem.purchaseId === item.purchaseId
      );

    if (existingItemIndex !== -1) {
      // Item from same purchase exists, update its quantity
      const currentItems = form.getValues('items');
      const existingItem = currentItems[existingItemIndex];
      const newQuantity = existingItem.quantity + item.quantity;
      
      // Update the entire items array to trigger re-render
      const updatedItems = [...currentItems];
      updatedItems[existingItemIndex] = {
        ...existingItem,
        quantity: newQuantity,
        amount: newQuantity * existingItem.rate
      };
      
      form.setValue('items', updatedItems, { shouldValidate: true });

    } else {
      // Item doesn't exist or is from a different purchase, add new entry
      append({
        id: uuidv4(),
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate,
        productId: item.productId,
        variantId: item.variantId,
        variantSKU: item.sku,
        purchaseId: item.purchaseId,
        originalRate: item.originalRate
      });
    }
  };

  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: { onChange: (value: number) => void; value: number },
    fieldName?: string
  ) => {
    const value = e.target.value;
    if (value === '') {
      field.onChange(0);
      return;
    }
    const numericString = value.replace(/[^0-9.]/g, '');
    const numericValue = parseFloat(numericString);
    if (!isNaN(numericValue)) {
      if (fieldName === 'taxRate' && numericValue > 100) {
        toast.error('Invalid tax rate', {
          description: 'Tax rate cannot exceed 100%'
        });
        field.onChange(100);
        return;
      }
      if (fieldName === 'discount' && numericValue < 0) {
        toast.error('Invalid discount', {
          description: 'Discount cannot be negative'
        });
        field.onChange(0);
        return;
      }
      if (fieldName === 'paid') {
        if (numericValue < 0) {
          toast.error('Invalid amount', {
            description: 'Amount cannot be negative'
          });
          field.onChange(0);
          return;
        }
        // Get current total to validate paid amount
        const currentSubtotal = form.watch('items').reduce((sum, item) => sum + item.amount, 0);
        const currentTaxRate = form.watch('taxRate');
        const currentDiscount = form.watch('discount');
        const currentDiscountType = form.watch('discountType');
        const currentTaxAmount = (currentSubtotal * currentTaxRate) / 100;
        const currentDiscountAmount = currentDiscountType === 'percentage' ? (currentSubtotal * currentDiscount) / 100 : currentDiscount;
        const currentTotal = currentSubtotal + currentTaxAmount - currentDiscountAmount;
        
        if (numericValue > currentTotal) {
          toast.error('Invalid paid amount', {
            description: 'Paid amount cannot exceed the invoice total'
          });
          field.onChange(currentTotal);
          return;
        }
      }
      field.onChange(numericValue);
    } else {
      field.onChange(0);
    }
  };

  const validateInvoiceData = (data: InvoiceFormValues): boolean => {
    if (data.items.length === 0) {
      toast.error('Cannot create invoice', {
        description: 'Please add at least one item to the invoice.'
      });
      return false;
    }

    // Check for out of stock items
    const outOfStockItems = data.items.filter(item => isItemOutOfStock(item.variantId, item.quantity));

    if (outOfStockItems.length > 0) {
      const itemDescriptions = outOfStockItems.map(item => item.description).join(', ');
      toast.error('Cannot create invoice with out of stock items', {
        description: `The following items are out of stock or have insufficient quantity: ${itemDescriptions}. Please remove them or adjust quantities.`,
        duration: 8000
      });
      return false;
    }

    // Validate due date is not in the past
    const dueDate = new Date(data.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      toast.error('Invalid due date', {
        description: 'Due date cannot be in the past.'
      });
      return false;
    }

    return true;
  };

  // Handle form validation errors with specific messages
  const handleFormErrors = (errors: typeof form.formState.errors) => {
    console.error('Form validation errors:', errors);

    // Handle items array errors
    if (errors.items) {
      if (errors.items.message) {
        toast.error('Form validation failed', {
          description: errors.items.message
        });
        return;
      }
      // Handle individual item errors
      if (Array.isArray(errors.items)) {
        const firstItemError = errors.items.find(item => item);
        if (firstItemError) {
          const errorField = Object.keys(firstItemError)[0];
          const errorMessage = firstItemError[errorField]?.message || 'Invalid item data';
          toast.error('Form validation failed', {
            description: errorMessage
          });
          return;
        }
      }
    }

    // Handle other field errors
    const errorFields = Object.keys(errors).filter(key => key !== 'items');
    if (errorFields.length > 0) {
      const firstError = errors[errorFields[0] as keyof typeof errors];
      const errorMessage = (firstError as { message?: string })?.message || 'Please check the form for errors';

      toast.error('Form validation failed', {
        description: errorMessage
      });
    }
  };

  const handleSave = () => {
    form.handleSubmit(
      async data => {
        if (!validateInvoiceData(data)) return;

        try {
          setIsSubmitting(true);
          const { createInvoice } = await import('@/features/invoices/actions');
          const { getSession } = await import('next-auth/react');

          const session = await getSession();
          const createdBy = session?.user?.email || 'unknown';

          // Check if invoice has custom items
          // An item is custom if:
          // 1. It has no productId (custom item)
          // 2. It has productId === 'custom-item' (manually entered)
          // 3. The rate has been modified from the original rate
          const hasCustomItems = data.items.some(
            item => !item.productId || 
                    item.productId === 'custom-item' || 
                    (item.saleRate !== undefined && item.rate !== item.saleRate)
          );

          // Create the invoice with modified data
          // Note: invoiceNumber is not passed - it will be auto-generated to avoid race conditions
          const newInvoice = await createInvoice({
            type: 'invoice' as const,
            date: new Date(data.date),
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            billingType: quotation.billingType || 'retail',
            market: quotation.market || 'newon',
            customerId: customerData.customerId ?? '',
            customerName: customerData.customerName,
            customerCompany: customerData.customerCompany || undefined,
            customerEmail: customerData.customerEmail,
            customerPhone: customerData.customerPhone,
            customerAddress: customerData.customerAddress,
            customerCity: customerData.customerCity ?? '',
            customerState: customerData.customerState ?? '',
            customerZip: customerData.customerZip ?? '',
            items: data.items.map(item => ({
              productId: item.productId || 'custom-item',
              productName: item.description,
              variantId: item.variantId,
              variantSKU: item.variantSKU,
              quantity: item.quantity,
              unit: 'pcs',
              unitPrice: item.rate,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              totalPrice: item.amount,
              purchaseId: item.purchaseId
            })),
            subtotal: data.items.reduce((sum, item) => sum + item.amount, 0),
            discountType: data.discountType,
            discountValue: data.discount,
            discountAmount:
              data.discountType === 'percentage'
                ? (data.items.reduce((sum, item) => sum + item.amount, 0) * data.discount) / 100
                : data.discount,
            gstType: 'percentage',
            gstValue: data.taxRate,
            gstAmount: (data.items.reduce((sum, item) => sum + item.amount, 0) * data.taxRate) / 100,
            totalAmount:
              data.items.reduce((sum, item) => sum + item.amount, 0) +
              (data.items.reduce((sum, item) => sum + item.amount, 0) * data.taxRate) / 100 -
              (data.discountType === 'percentage'
                ? (data.items.reduce((sum, item) => sum + item.amount, 0) * data.discount) / 100
                : data.discount),
            status: isOtcCustomer ? 'paid' : 'pending',
            paidAmount: data.paid,
            balanceAmount: grandTotal,
            profit: data.profit || 0,
            description: data.description,
            notes: data.notes,
            termsAndConditions: quotation.termsAndConditions,
            custom: hasCustomItems,
            createdBy
          });

          // Mark the original quotation as converted
          const { updateInvoice } = await import('@/features/invoices/actions');
          await updateInvoice(quotationId, {
            status: 'converted',
            convertedToInvoice: true,
            convertedInvoiceId: newInvoice.id
          });

          toast.success('Invoice created successfully', {
            description: 'Redirecting to invoices page...'
          });

          // Redirect to invoices page
          window.location.href = '/invoices';
        } catch (error) {
          console.error('Error saving invoice:', error);
          toast.error('Failed to save invoice', {
            description: error instanceof Error ? error.message : 'An unexpected error occurred.'
          });
        } finally {
          setIsSubmitting(false);
        }
      },
      handleFormErrors
    )();
  };

  // Get today's date in YYYY-MM-DD format for the min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <Form {...form}>
      <form className="space-y-8">
        <div className="flex flex-wrap-reverse gap-y-6 justify-between items-center gap-2 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-lg font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Invoice Date
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full max-w-sm justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), 'PPP') : <span>Pick invoice date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={date => {
                          const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
                          field.onChange(formattedDate);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-lg font-semibold flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Due Date
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full max-w-sm justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a due date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={date => {
                          const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
                          field.onChange(formattedDate);
                        }}
                        disabled={date => date < new Date(today + 'T00:00:00')}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-semibold text-primary">{nextInvoiceNumber}</span>
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="border rounded-lg p-6">
          <div className="space-y-1 mb-6">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div>
                <div className="flex gap-2 items-center">
                  <ShoppingCart className="h-5 w-5" />
                  <h2 className="text-lg font-semibold flex items-center gap-2">Items</h2>
                </div>
                <h3 className="text-sm mb-4 flex items-center gap-2 text-muted-foreground">
                  Add Products or Custom Items
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  append({
                    id: uuidv4(),
                    description: '',
                    quantity: 1,
                    rate: 0,
                    amount: 0,
                    productId: 'custom-item' // Required by Invoice model for custom items
                  });
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Item
              </Button>
            </div>
          </div>

          <div className="gap-6 grid lg:grid-cols-2">
            {/* Product Selector */}
            {variants.length > 0 && (
              <div className="bg-muted/30 md:p-4 rounded-lg">
                <ProductSelector
                  variants={variants}
                  purchases={purchases}
                  currentItems={form.watch('items')}
                  onAddItem={handleAddItemFromSelector}
                />
              </div>
            )}

            {/* Invoice Items Table with Container Query */}
            <div className="border rounded-lg overflow-auto shadow-sm @container max-h-[665px]">
              <div className="bg-primary text-white px-4 py-3">
                <h3 className="text-sm font-semibold">Invoice Items</h3>
              </div>

              {fields.length === 0 && (
                <div className="text-center text-muted-foreground py-20">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm max-w-sm mx-auto">No items added yet.</p>
                </div>
              )}

              {/* Card view */}
              <div className="divide-y">
                {fields.map((item, index) => {
                  const currentQuantity = form.watch(`items.${index}.quantity`) || 0;
                  const currentRate = form.watch(`items.${index}.rate`) || 0;
                  const variantId = form.watch(`items.${index}.variantId`);
                  const purchaseId = form.watch(`items.${index}.purchaseId`);
                  const availableStock = getAvailableStock(variantId);
                  
                  // Get stock limit for this specific purchase
                  const purchaseStockLimit = purchaseId 
                    ? (() => {
                        const purchase = purchases.find(p => p.purchaseId === purchaseId);
                        if (!purchase) return 0;
                        
                        // The max this item can have is simply the purchase's remaining stock
                        // No need to add current quantity since 'remaining' already represents available stock
                        return purchase.remaining;
                      })()
                    : Infinity;

                  return (
                    <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                          <div className="flex-1">
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <InputGroup>
                                      <InputGroupInput
                                        placeholder="Item description (e.g., Labor, Fuel, etc.)"
                                        {...field}
                                        className="text-sm"
                                      />
                                    </InputGroup>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-8 w-8 -mt-1"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-12">Qty:</span>
                          <div className="flex items-center gap-1 flex-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const newQuantity = Math.max(1, currentQuantity - 1);
                                form.setValue(`items.${index}.quantity`, newQuantity);
                                form.setValue(`items.${index}.amount`, newQuantity * currentRate);
                              }}
                              disabled={currentQuantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <InputGroup>
                                      <InputGroupInput
                                        type="number"
                                        min="1"
                                        max={purchaseId 
                                          ? (purchaseStockLimit < Infinity ? purchaseStockLimit : undefined)
                                          : (availableStock < Infinity ? availableStock : undefined)}
                                        step="1"
                                        {...field}
                                        className="h-8 text-sm text-center"
                                        onChange={e => {
                                          const value = e.target.value;
                                          if (value === '') {
                                            field.onChange(1);
                                            form.setValue(`items.${index}.amount`, 1 * currentRate);
                                            return;
                                          }
                                          const numericValue = parseInt(value, 10);
                                          if (isNaN(numericValue) || numericValue < 1) {
                                            toast.error('Invalid quantity', {
                                              description: 'Quantity must be at least 1'
                                            });
                                            field.onChange(1);
                                            form.setValue(`items.${index}.amount`, 1 * currentRate);
                                            return;
                                          }
                                          const maxStock = purchaseId ? purchaseStockLimit : availableStock;
                                          if (numericValue > maxStock) {
                                            toast.error('Insufficient stock', {
                                              description: purchaseId 
                                                ? `Only ${maxStock} units available in this purchase`
                                                : `Only ${maxStock} units available`
                                            });
                                            field.onChange(maxStock);
                                            form.setValue(`items.${index}.amount`, maxStock * currentRate);
                                            return;
                                          }
                                          field.onChange(numericValue);
                                          form.setValue(`items.${index}.amount`, numericValue * currentRate);
                                        }}
                                        value={field.value || ''}
                                      />
                                    </InputGroup>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                const newQuantity = currentQuantity + 1;
                                const maxStock = purchaseId ? purchaseStockLimit : availableStock;
                                if (newQuantity > maxStock) {
                                  toast.error('Insufficient stock', {
                                    description: purchaseId 
                                      ? `Only ${maxStock} units available in this purchase`
                                      : `Only ${maxStock} units available`
                                  });
                                  return;
                                }
                                form.setValue(`items.${index}.quantity`, newQuantity);
                                form.setValue(`items.${index}.amount`, newQuantity * currentRate);
                              }}
                              disabled={currentQuantity >= (purchaseId ? purchaseStockLimit : availableStock)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Rate</div>
                            <FormField
                              control={form.control}
                              name={`items.${index}.rate`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <InputGroup>
                                      <InputGroupInput
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        {...field}
                                        className="h-8 text-sm"
                                        onChange={e => {
                                          const value = e.target.value;
                                          if (value === '') {
                                            field.onChange(0);
                                            form.setValue(`items.${index}.amount`, 0);
                                            return;
                                          }
                                          const numericValue = parseFloat(value);
                                          if (isNaN(numericValue) || numericValue < 0) {
                                            toast.error('Invalid rate', {
                                              description: 'Rate must be 0 or greater'
                                            });
                                            field.onChange(0);
                                            form.setValue(`items.${index}.amount`, 0);
                                            return;
                                          }
                                          field.onChange(numericValue);
                                          form.setValue(`items.${index}.amount`, numericValue * currentQuantity);
                                        }}
                                        value={field.value || ''}
                                      />
                                    </InputGroup>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-1">Amount</div>
                            <div className="font-semibold">
                              {formatCurrency(form.watch(`items.${index}.amount`) || 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="mt-6 max-md:text-sm flex justify-end">
            <div className="w-full max-w-xl space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Tax ({taxRate}%):</span>
                  <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormControl>
                          <InputGroup className="justify-end">
                            <InputGroupInput
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              {...field}
                              className="h-8 text-sm text-right"
                              onChange={e => handleNumericInput(e, field, 'taxRate')}
                              value={field.value === 0 ? '' : field.value}
                            />
                            <InputGroupAddon>
                              <Percent className="h-4 w-4 text-muted-foreground" />
                            </InputGroupAddon>
                          </InputGroup>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>

              <div className="flex flex-wrap justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Discount:</span>
                  <FormField
                    control={form.control}
                    name="discountType"
                    render={({ field }) => (
                      <FormItem className="">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fixed">Rs</SelectItem>
                            <SelectItem value="percentage">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem className="w-20">
                        <FormControl>
                          <InputGroup>
                            <InputGroupInput
                              type="number"
                              min="0"
                              max={discountType === 'percentage' ? '100' : undefined}
                              step="0.01"
                              {...field}
                              className="h-8 text-sm"
                              onChange={e => handleNumericInput(e, field, 'discount')}
                              value={field.value || ''}
                            />
                          </InputGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <span className="font-medium">- {formatCurrency(discountAmount)}</span>
              </div>

              <div className="border-t pt-2 mt-2 space-y-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                {/* Profit Display */}
                <div className="flex justify-between text-sm bg-green-50 dark:bg-green-950/20 p-2 rounded">
                  <span className="text-green-700 dark:text-green-400 font-medium">Estimated Profit:</span>
                  <span className={`font-semibold ${calculatedProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(calculatedProfit)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">
                      Paid: {isOtcCustomer && <span className="text-xs max-sm:hidden text-orange-600">(Full payment required)</span>}
                    </span>
                    <FormField
                      control={form.control}
                      name="paid"
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <FormControl>
                            <InputGroup>
                              <InputGroupAddon>Rs</InputGroupAddon>
                              <InputGroupInput
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                className="h-8 text-sm"
                                onChange={e => handleNumericInput(e, field, 'paid')}
                                value={field.value || ''}
                                disabled={isOtcCustomer}
                                readOnly={isOtcCustomer}
                              />
                            </InputGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <span className="text-green-600">{formatCurrency(paid)}</span>
                </div>

                {!isOtcCustomer && (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground font-medium">Outstanding Balance:</span>
                    <span className={`font-medium ${outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(outstandingBalance)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-sm md:text-lg pt-2 border-t">
                  <span>Grand Total:</span>
                  <span className={grandTotal > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(grandTotal)} {grandTotal > 0 ? '(Due)' : '(Paid)'}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Amount in words:</span> {amountInWords}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description - Collapsible */}
        <Collapsible open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen} className="border rounded-lg">
          <div className="p-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn('w-full justify-between p-0', {
                  'mb-4': isDescriptionOpen
                })}
              >
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Description (Internal)
                </h2>
                <ChevronsUpDown />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        className="min-h-[100px]" 
                        placeholder="Internal description - not visible on printed invoice..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Notes - Collapsible */}
        <Collapsible open={isNotesOpen} onOpenChange={setIsNotesOpen} className="border rounded-lg">
          <div className="p-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn('w-full justify-between p-0', {
                  'mb-4': isNotesOpen
                })}
              >
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                  <NotebookTabsIcon className="h-5 w-5" />
                  Notes (Printed)
                </h2>
                <ChevronsUpDown />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea className="min-h-[100px]" placeholder="Notes visible on printed invoice..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              form.reset();
            }}
          >
            Reset Form
          </Button>
          <Button disabled={isSubmitting} aria-disabled={isSubmitting} type="button" variant="default" className="w-full sm:w-auto" onClick={handleSave}>
            {isSubmitting ? <Loader2 className='animate-spin' /> : <Save className="h-4 w-4 mr-2" />}
            {isSubmitting? 'Creating' : 'Create Invoice'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
