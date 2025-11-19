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
  AlertTriangle
} from 'lucide-react';
import { cn, formatCurrency, formatDate, getToday } from '@/lib/utils';
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

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  items: z
    .array(
      z.object({
        id: z.string(),
        description: z.string().min(1, 'Description is required'),
        quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
        rate: z.number().min(0, 'Rate must be 0 or greater'),
        amount: z.number().min(0, 'Amount must be 0 or greater'),
        productId: z.string().optional(),
        variantId: z.string().optional(),
        variantSKU: z.string().optional(),
        purchaseId: z.string().optional()
      })
    )
    .min(1, 'At least one item is required'),
  taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100').default(0),
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  discountType: z.enum(['percentage', 'fixed']).default('fixed'),
  amountInWords: z.string().optional(),
  previousBalance: z.number().min(0, 'Cannot be negative').default(0),
  paid: z.number().min(0, 'Cannot be negative').default(0),
  remainingPayment: z.number().min(0, 'Cannot be negative').default(0),
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
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    customerCity: string;
    customerState: string;
    customerZip: string;
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
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>('Loading...');

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
      items: quotation.items.map(item => ({
        id: item.id,
        description: item.description || item.productName,
        quantity: item.quantity,
        rate: item.unitPrice,
        amount: item.totalPrice,
        productId: item.productId,
        variantId: item.variantId,
        variantSKU: item.variantSKU,
        purchaseId: item.purchaseId
      })),
      taxRate: quotation.taxRate || quotation.gstValue || 0,
      discount: quotation.discountValue || 0,
      discountType: quotation.discountType || 'fixed',
      amountInWords: quotation.amountInWords || 'Zero Rupees Only',
      previousBalance: 0,
      paid: 0,
      remainingPayment: 0,
      notes: quotation.notes
    }
  });

  // Update invoice number when fetched
  useEffect(() => {
    if (nextInvoiceNumber && nextInvoiceNumber !== 'Loading...' && nextInvoiceNumber !== 'Error loading') {
      form.setValue('invoiceNumber', nextInvoiceNumber);
    }
  }, [nextInvoiceNumber, form]);

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

  const previousBalance = form.watch('previousBalance') || 0;
  const paid = form.watch('paid') || 0;
  const remainingPayment = Math.max(0, total - paid);
  const grandTotal = remainingPayment + previousBalance;

  form.setValue('remainingPayment', remainingPayment, { shouldValidate: true });

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
  }, []);

  const handleAddItemFromSelector = (item: {
    variantId: string;
    productName: string;
    sku: string;
    description: string;
    quantity: number;
    rate: number;
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

    const existingItemIndex = form.watch('items').findIndex(
      (formItem) =>
        formItem.variantId === item.variantId && 
        formItem.variantSKU === item.sku
      );

    console.log(existingItemIndex)

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

      toast.success('Item updated', {
        description: `Quantity increased to ${newQuantity}`
      });
    } else {
      // Item doesn't exist or is from a different purchase, add new entry
      append({
        id: Date.now().toString(),
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate,
        variantId: item.variantId,
        variantSKU: item.sku,
        purchaseId: item.purchaseId
      });

      toast.success('Item added', {
        description: `${item.productName} added to invoice`
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
      if ((fieldName === 'paid' || fieldName === 'previousBalance') && numericValue < 0) {
        toast.error('Invalid amount', {
          description: 'Amount cannot be negative'
        });
        field.onChange(0);
        return;
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

  const handleSave = () => {
    form.handleSubmit(
      async data => {
        if (!validateInvoiceData(data)) return;

        try {
          const { createInvoice } = await import('@/features/invoices/actions');
          const { getSession } = await import('next-auth/react');

          const session = await getSession();
          const createdBy = session?.user?.email || 'unknown';

          // Create the invoice with modified data
          const newInvoice = await createInvoice({
            invoiceNumber: data.invoiceNumber,
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
              productId: item.productId || '',
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
            status: 'pending',
            paidAmount: data.paid,
            balanceAmount: data.remainingPayment + data.previousBalance,
            notes: data.notes,
            termsAndConditions: quotation.termsAndConditions,
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
        }
      },
      errors => {
        console.error('Form validation errors:', errors);
        toast.error(`Cannot save invoice`, {
          description: 'Please fix all form errors before saving.'
        });
      }
    )();
  };

  // Get today's date in YYYY-MM-DD format for the min attribute
  const today = new Date().toISOString().split('T')[0];

  return (
    <Form {...form}>
      <form className="space-y-8">
        <div className="flex justify-between items-center gap-2 p-4">
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
          <div className="space-y-2">
            <div className="flex gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-semibold text-primary">{nextInvoiceNumber}</span>
            </div>
            <div className="text-muted-foreground font-medium">{formatDate(new Date())}</div>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="border rounded-lg p-6">
          <div className="space-y-1 mb-6">
            <div className="flex gap-2 items-center justify-between">
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
                    id: Date.now().toString(),
                    description: '',
                    quantity: 1,
                    rate: 0,
                    amount: 0
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
              <div className="bg-muted/30 p-4 rounded-lg">
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

              {/* Table view for larger containers */}
              <div className="hidden @[600px]:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium bg-muted/50 border-b">
                      <th className="p-3 w-12">#</th>
                      <th className="py-3 px-2">Item Description</th>
                      <th className="py-3 px-2 text-center">Qty</th>
                      <th className="py-3 px-2 text-right">Rate</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                      <th className="py-3 px-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fields.map((item, index) => {
                      const currentQuantity = form.watch(`items.${index}.quantity`) || 0;
                      const currentRate = form.watch(`items.${index}.rate`) || 0;
                      const variantId = form.watch(`items.${index}.variantId`);
                      const availableStock = getAvailableStock(variantId);
                      const isOutOfStock = isItemOutOfStock(variantId, currentQuantity);
                      const hasInsufficientStock = variantId && availableStock > 0 && availableStock < currentQuantity;

                      return (
                        <tr
                          key={item.id}
                          className={cn(
                            'group hover:bg-muted/30 transition-colors',
                            isOutOfStock && 'opacity-60 bg-destructive/5'
                          )}
                        >
                          <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                          <td className="py-3 px-2">
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
                            {variantId && (
                              <div className="flex items-center gap-2 mt-1">
                                {isOutOfStock && (
                                  <div className="flex items-center gap-1 text-xs text-destructive">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span className="font-medium">
                                      {availableStock === 0 ? 'Out of stock' : `Only ${availableStock} available`}
                                    </span>
                                  </div>
                                )}
                                {!isOutOfStock && availableStock < Infinity && (
                                  <div className="text-xs text-muted-foreground">Available: {availableStock} units</div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  const newQuantity = Math.max(1, currentQuantity - 1);
                                  form.setValue(`items.${index}.quantity`, newQuantity);
                                  form.setValue(`items.${index}.amount`, newQuantity * currentRate);
                                }}
                                disabled={currentQuantity < 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                  <FormItem className="w-16">
                                    <FormControl>
                                      <InputGroup>
                                        <InputGroupInput
                                          type="number"
                                          min="0.01"
                                          step="1"
                                          {...field}
                                          className="h-7 text-sm text-center"
                                          onChange={e => {
                                            const value = e.target.value;
                                            if (value === '') {
                                              field.onChange(0.01);
                                              form.setValue(`items.${index}.amount`, 0.01 * currentRate);
                                              return;
                                            }
                                            const numericValue = parseFloat(value);
                                            if (isNaN(numericValue) || numericValue < 0.01) {
                                              toast.error('Invalid quantity', {
                                                description: 'Quantity must be at least 0.01'
                                              });
                                              field.onChange(0.01);
                                              form.setValue(`items.${index}.amount`, 0.01 * currentRate);
                                              return;
                                            }
                                            if (numericValue > availableStock) {
                                              toast.error('Insufficient stock', {
                                                description: `Only ${availableStock} units available`
                                              });
                                              field.onChange(availableStock);
                                              form.setValue(`items.${index}.amount`, availableStock * currentRate);
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
                                className="h-7 w-7"
                                onClick={() => {
                                  const newQuantity = currentQuantity + 1;
                                  if (newQuantity > availableStock) {
                                    toast.error('Insufficient stock', {
                                      description: `Only ${availableStock} units available`
                                    });
                                    return;
                                  }
                                  form.setValue(`items.${index}.quantity`, newQuantity);
                                  form.setValue(`items.${index}.amount`, newQuantity * currentRate);
                                }}
                                disabled={currentQuantity >= availableStock}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right">
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
                                        className="h-7 text-sm text-right"
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
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="text-sm font-semibold">
                              {formatCurrency(form.watch(`items.${index}.amount`) || 0)}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Card view for smaller containers */}
              <div className="@[600px]:hidden divide-y">
                {fields.map((item, index) => {
                  const currentQuantity = form.watch(`items.${index}.quantity`) || 0;
                  const currentRate = form.watch(`items.${index}.rate`) || 0;
                  const variantId = form.watch(`items.${index}.variantId`);
                  const availableStock = getAvailableStock(variantId);
                  const isOutOfStock = isItemOutOfStock(variantId, currentQuantity);

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'p-4 hover:bg-muted/30 transition-colors',
                        isOutOfStock && 'opacity-60 bg-destructive/5'
                      )}
                    >
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
                            {variantId && (
                              <div className="flex items-center gap-2 mt-1">
                                {isOutOfStock && (
                                  <div className="flex items-center gap-1 text-xs text-destructive">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span className="font-medium">
                                      {availableStock === 0 ? 'Out of stock' : `Only ${availableStock} available`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
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
                                        max={availableStock < Infinity ? availableStock : undefined}
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
                                          const numericValue = parseFloat(value);
                                          if (isNaN(numericValue) || numericValue < 0.01) {
                                            toast.error('Invalid quantity', {
                                              description: 'Quantity must be at least 0.01'
                                            });
                                            field.onChange(0.01);
                                            form.setValue(`items.${index}.amount`, 0.01 * currentRate);
                                            return;
                                          }
                                          if (numericValue > availableStock) {
                                            toast.error('Insufficient stock', {
                                              description: `Only ${availableStock} units available`
                                            });
                                            field.onChange(availableStock);
                                            form.setValue(`items.${index}.amount`, availableStock * currentRate);
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
                                if (newQuantity > availableStock) {
                                  toast.error('Insufficient stock', {
                                    description: `Only ${availableStock} units available`
                                  });
                                  return;
                                }
                                form.setValue(`items.${index}.quantity`, newQuantity);
                                form.setValue(`items.${index}.amount`, newQuantity * currentRate);
                              }}
                              disabled={currentQuantity >= availableStock}
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
          <div className="mt-6 flex justify-end">
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

              <div className="flex justify-between">
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

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Paid:</span>
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
                              />
                            </InputGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <span className="text-green-600">{formatCurrency(paid)}</span>
                </div>

                <div className="flex justify-between font-semibold">
                  <span>Remaining:</span>
                  <span className={remainingPayment > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(remainingPayment)} {remainingPayment > 0 ? '(Due)' : '(Paid)'}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Previous Balance:</span>
                    <FormField
                      control={form.control}
                      name="previousBalance"
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
                                onChange={e => handleNumericInput(e, field, 'previousBalance')}
                                value={field.value || ''}
                              />
                            </InputGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <span className="text-green-600">{formatCurrency(previousBalance)}</span>
                </div>

                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(grandTotal)}</span>
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
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <NotebookTabsIcon className="h-5 w-5" />
                  Notes
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
                      <Textarea className="min-h-[100px]" placeholder="Add any additional notes here..." {...field} />
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
          <Button type="button" variant="default" className="w-full sm:w-auto" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </form>
    </Form>
  );
}
