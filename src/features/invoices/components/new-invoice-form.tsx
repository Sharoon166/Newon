'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { useState, useEffect, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Building2,
  User,
  FileText,
  Calendar as CalendarIcon,
  Percent,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Mail,
  Phone,
  MapPin,
  NotebookTabs as NotebookTabsIcon,
  ChevronsUpDown,
  Package,
  Eye,
  Save,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatCurrency, getToday } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import useBrandStore from '@/stores/useBrandStore';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { convertToWords } from '../utils';
import { Customer } from '@/features/customers/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EnhancedProductSelector } from './enhanced-product-selector';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';
import type { EnhancedVirtualProduct } from '@/features/virtual-products/types';
import { INVOICE_TERMS_AND_CONDITIONS, PAYMENT_DETAILS, OTC_CUSTOMER } from '@/constants';
import { toast } from 'sonner';
import { NewonInvoiceTemplate } from './invoice-template';
import { CustomerForm } from '@/features/customers/components/customer-form';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';

const invoiceFormSchema = z.object({
  logo: z.string().optional(),
  billingType: z.enum(['wholesale', 'retail']).default('retail'),
  market: z.enum(['newon', 'waymor']).default('newon'),
  customerId: z.string().optional(),
  company: z.object({
    name: z.string().min(1, 'Company name is required'),
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zip: z.string().min(1, 'ZIP code is required'),
    phone: z.string().min(1, 'Phone is required'),
    email: z.string().email('Invalid email address'),
    website: z.string().optional()
  }),
  client: z.object({
    name: z.string().min(1, 'Client name is required'),
    company: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    email: z.email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional()
  }),
  invoiceNumber: z.string().optional(), // Auto-generated on save
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
        virtualProductId: z.string().optional(),
        isVirtualProduct: z.boolean().optional(),
        purchaseId: z.string().optional(),
        originalRate: z.number().optional(),
        saleRate: z.number().optional(),
        componentBreakdown: z.array(z.object({
          productId: z.string(),
          variantId: z.string(),
          productName: z.string(),
          sku: z.string(),
          quantity: z.number(),
          purchaseId: z.string(),
          unitCost: z.number(),
          totalCost: z.number()
        })).optional(),
        customExpenses: z.array(z.object({
          name: z.string(),
          amount: z.number(),
          category: z.enum(['labor', 'materials', 'overhead', 'packaging', 'shipping', 'other']),
          description: z.string().optional()
        })).optional(),
        totalComponentCost: z.number().optional(),
        totalCustomExpenses: z.number().optional()
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
  notes: z.string().optional(),
  terms: z.string().optional(),
  paymentDetails: z.object({
    bankName: z.string(),
    accountNumber: z.string(),
    iban: z.string()
  })
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export function NewInvoiceForm({
  isLoading,
  onPreview,
  onSave,
  customers,
  variants = [],
  purchases = [],
  virtualProducts = [],
  paymentDetails: initialPaymentDetails,
  invoiceTerms: initialInvoiceTerms,
  initialData,
  fromProject = false,
  projectId,
  isEditMode = false
}: {
  isLoading: boolean;
  onPreview: (data: InvoiceFormValues) => void;
  onSave?: (data: InvoiceFormValues) => void | Promise<void>;
  customers: Customer[];
  variants?: EnhancedVariants[];
  purchases?: Purchase[];
  virtualProducts?: EnhancedVirtualProduct[];
  paymentDetails?: { BANK_NAME: string; ACCOUNT_NUMBER: string; IBAN: string };
  invoiceTerms?: string[];
  initialData?: Partial<InvoiceFormValues>;
  fromProject?: boolean;
  projectId?: string;
  isEditMode?: boolean;
}) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isOtcCustomer, setIsOtcCustomer] = useState(false);
  const [isToOpen, setIsToOpen] = useState(true);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>('Loading...');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [refreshCustomers, setRefreshCustomers] = useState(0);
  const currentBrandId = useBrandStore(state => state.currentBrandId);
  const brand = useBrandStore(state => state.getCurrentBrand());
  const form = useForm<InvoiceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: {
      logo: '',
      billingType: initialData?.billingType || 'retail',
      market: initialData?.market || (currentBrandId === 'waymor' ? 'waymor' : 'newon'),
      company: {
        name: brand.displayName,
        address: brand.address,
        city: brand.city,
        state: brand.state,
        zip: brand.zip,
        phone: brand.phone,
        email: brand.email,
        website: brand.website
      },
      client: initialData?.client || {
        name: '',
        company: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        email: '',
        phone: ''
      },
      customerId: initialData?.customerId,
      invoiceNumber: '', // Will be auto-generated on save
      date: initialData?.date || getToday(),
      dueDate: initialData?.dueDate || getToday(),
      items: initialData?.items || [],
      taxRate: initialData?.taxRate ?? 0,
      discount: initialData?.discount ?? 0,
      discountType: initialData?.discountType || 'fixed',
      amountInWords: 'Zero Rupees Only',
      paid: initialData?.paid ?? 0,
      remainingPayment: 0,
      profit: 0,
      description: initialData?.description || '',
      notes: initialData?.notes || '',
      terms: initialData?.terms || (initialInvoiceTerms ? initialInvoiceTerms.join('\n') : INVOICE_TERMS_AND_CONDITIONS.join('\n')),
      paymentDetails: {
        bankName: initialPaymentDetails?.BANK_NAME || PAYMENT_DETAILS.BANK_NAME,
        accountNumber: initialPaymentDetails?.ACCOUNT_NUMBER || PAYMENT_DETAILS.ACCOUNT_NUMBER,
        iban: initialPaymentDetails?.IBAN || PAYMENT_DETAILS.IBAN
      }
    }
  });

  // Fetch next invoice number on mount (only for new invoices)
  useEffect(() => {
    if (isEditMode && initialData?.invoiceNumber) {
      setNextInvoiceNumber(initialData.invoiceNumber);
      return;
    }

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
  }, [isEditMode, initialData?.invoiceNumber]);

  // Show toast errors on mount if no customers or products
  useEffect(() => {
    if (customers.length === 0) {
      toast.error('No customers found', {
        description: 'Please add customers before creating an invoice.'
      });
    }
    if (variants.length === 0) {
      toast.error('No products found', {
        description: 'Please add products to inventory before creating an invoice.'
      });
    }
  }, [customers.length, variants.length]);

  // Update company details when brand changes
  useEffect(() => {
    form.setValue('company.name', brand.displayName);
    form.setValue('company.address', brand.address);
    form.setValue('company.city', brand.city);
    form.setValue('company.state', brand.state);
    form.setValue('company.zip', brand.zip);
    form.setValue('company.phone', brand.phone);
    form.setValue('company.email', brand.email);
    form.setValue('company.website', brand.website);
    form.setValue('market', currentBrandId === 'waymor' ? 'waymor' : 'newon');
  }, [brand, currentBrandId, form]);

  // Set selected customer from initialData
  useEffect(() => {
    if (initialData?.customerId && customers.length > 0) {
      const customer = customers.find(c => c.customerId === initialData.customerId || c.id === initialData.customerId);
      if (customer) {
        setSelectedCustomer(customer);
        setIsToOpen(false); // Close the customer selector since we have a customer
      }
    }
  }, [initialData?.customerId, customers]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  // Helper function to get available stock for an item
  const getAvailableStock = (variantId?: string) => {
    if (!variantId) return Infinity; // No limit if no variant ID

    const variantPurchases = purchases.filter(p => p.variantId === variantId && p.remaining > 0);

    return variantPurchases.reduce((sum, p) => sum + p.remaining, 0);
  };

  const subtotal = form.watch('items').reduce((sum, item) => sum + item.amount, 0);
  const taxRate = form.watch('taxRate');
  const discount = form.watch('discount');
  const discountType = form.watch('discountType');
  const taxAmount = (subtotal * taxRate) / 100;
  const discountAmount = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;
  const total = subtotal + taxAmount - discountAmount;

  // Calculate profit in real-time
  const items = form.watch('items');
  const calculatedProfit =
    items.reduce((sum, item) => {
      const costPrice = item.originalRate ?? 0;
      const sellingPrice = item.rate;
      const profitPerUnit = sellingPrice - costPrice;
      return sum + profitPerUnit * item.quantity;
    }, 0) - discountAmount;

  // Update profit field with calculated value
  useEffect(() => {
    form.setValue('profit', calculatedProfit, { shouldValidate: false });
  }, [calculatedProfit, form]);

  // Get form values
  const paid = form.watch('paid') || 0;

  // Get customer's outstanding balance (0 for OTC customers) - for display only
  const outstandingBalance = isOtcCustomer ? 0 : selectedCustomer?.outstandingBalance || 0;

  // For OTC customers, automatically set paid amount to total
  useEffect(() => {
    if (isOtcCustomer && total > 0 && paid !== total) {
      form.setValue('paid', total);
    }
  }, [isOtcCustomer, total, paid, form]);

  // Calculate grand total (invoice total - paid amount)
  const grandTotal = Math.max(0, total - paid);

  // Update remaining payment and amount in words when grandTotal changes
  useEffect(() => {
    form.setValue('remainingPayment', grandTotal, { shouldValidate: true });
    const amountInWords = `${convertToWords(Math.round(grandTotal))} Rupees Only`;
    form.setValue('amountInWords', amountInWords, { shouldValidate: true });
  }, [grandTotal, form]);

  const handleAddItemFromSelector = useCallback((item: {
    productId?: string;
    variantId?: string;
    virtualProductId?: string;
    isVirtualProduct?: boolean;
    productName: string;
    sku: string;
    description: string;
    quantity: number;
    rate: number;
    saleRate: number;
    originalRate?: number;
    purchaseId?: string;
    componentBreakdown?: Array<{
      productId: string;
      variantId: string;
      productName: string;
      sku: string;
      quantity: number;
      purchaseId: string;
      unitCost: number;
      totalCost: number;
    }>;
    customExpenses?: Array<{
      name: string;
      amount: number;
      category: 'labor' | 'materials' | 'overhead' | 'packaging' | 'shipping' | 'other';
      description?: string;
    }>;
    totalComponentCost?: number;
    totalCustomExpenses?: number;
  }) => {
    // Validate item data
    if (!item.description || item.description.trim() === '') {
      // For virtual products, use product name as description if description is empty
      if (item.isVirtualProduct && item.productName) {
        item.description = item.productName;
      } else {
        toast.error('Invalid item', {
          description: 'Item description is required.'
        });
        return;
      }
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

    // For virtual products, check if already exists
    if (item.isVirtualProduct && item.virtualProductId) {
      const existingVirtualItemIndex = fields.findIndex(field => field.virtualProductId === item.virtualProductId);

      if (existingVirtualItemIndex !== -1) {
        // Virtual product exists, update its quantity
        const existingItem = form.watch(`items.${existingVirtualItemIndex}`);
        const newQuantity = existingItem.quantity + item.quantity;
        form.setValue(`items.${existingVirtualItemIndex}.quantity`, newQuantity);
        form.setValue(`items.${existingVirtualItemIndex}.amount`, newQuantity * existingItem.rate);
      } else {
        // Add new virtual product
        append({
          id: uuidv4(),
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
          productId: item.virtualProductId, // Store virtualProductId as productId
          virtualProductId: item.virtualProductId,
          isVirtualProduct: true,
          variantSKU: item.sku,
          originalRate: item.originalRate,
          saleRate: item.saleRate,
          componentBreakdown: item.componentBreakdown,
          customExpenses: item.customExpenses,
          totalComponentCost: item.totalComponentCost,
          totalCustomExpenses: item.totalCustomExpenses
        });
      }
      return;
    }

    // For regular products, check if item from the SAME purchase already exists
    const existingItemIndex = fields.findIndex(
      field =>
        field.variantId === item.variantId && field.variantSKU === item.sku && field.purchaseId === item.purchaseId
    );

    if (existingItemIndex !== -1) {
      // Item from same purchase exists, update its quantity
      const existingItem = form.watch(`items.${existingItemIndex}`);
      const newQuantity = existingItem.quantity + item.quantity;
      form.setValue(`items.${existingItemIndex}.quantity`, newQuantity);
      form.setValue(`items.${existingItemIndex}.amount`, newQuantity * existingItem.rate);
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
        originalRate: item.originalRate,
        saleRate: item.saleRate
      });
    }
  }, [fields, form, append]);

  const handleCustomerSelect = (customerName: string) => {
    const customer = customers.find(customer => customer.name === customerName);
    if (customer) {
      setIsOtcCustomer(false);
      setSelectedCustomer(customer);
      form.setValue('customerId', customer.customerId || customer.id);
      form.setValue('client.name', customer.name);
      form.setValue('client.company', customer.company || '');
      form.setValue('client.email', customer.email || '');
      form.setValue('client.phone', customer.phone || '');
      form.setValue('client.address', customer.address || '');
      form.setValue('client.city', customer.city || '');
      form.setValue('client.state', customer.state || '');
      form.setValue('client.zip', customer.zip || '');

      setIsToOpen(false);
    }
  };

  const validateInvoiceData = (data: InvoiceFormValues): boolean => {
    // Validate before preview
    if (customers.length === 0) {
      toast.error('Cannot create invoice', {
        description: 'No customers available. Please add customers first.'
      });
      return false;
    }
    if (data.items.length === 0) {
      toast.error('Cannot create invoice', {
        description: 'Please add at least one item to the invoice.'
      });
      return false;
    }

    // Validate client details
    if (!selectedCustomer) {
      toast.error('Customer required', {
        description: 'Please select a customer from the list.'
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

    // Handle client errors
    if (errors.client) {
      const clientErrors = errors.client as Record<string, { message?: string }>;
      const firstClientError = Object.values(clientErrors).find(err => err?.message);
      if (firstClientError?.message) {
        toast.error('Form validation failed', {
          description: firstClientError.message
        });
        return;
      }
    }

    // Handle company errors
    if (errors.company) {
      const companyErrors = errors.company as Record<string, { message?: string }>;
      const firstCompanyError = Object.values(companyErrors).find(err => err?.message);
      if (firstCompanyError?.message) {
        toast.error('Form validation failed', {
          description: firstCompanyError.message
        });
        return;
      }
    }

    // Handle other field errors
    const errorFields = Object.keys(errors).filter(key => key !== 'items' && key !== 'client' && key !== 'company');
    if (errorFields.length > 0) {
      const firstError = errors[errorFields[0] as keyof typeof errors];
      const errorMessage = (firstError as { message?: string })?.message || 'Please check the form for errors';

      toast.error('Form validation failed', {
        description: errorMessage
      });
    }
  };

  const onSubmit = (data: InvoiceFormValues) => {
    if (!validateInvoiceData(data)) return;
    setIsPreviewOpen(true);
  };

  const handleSave = () => {
    form.handleSubmit(async data => {
      if (!validateInvoiceData(data)) return;

      try {
        if (onSave) {
          await onSave(data);
        } else {
          toast.error('Save function not available', {
            description: 'Please contact support.'
          });
        }
      } catch (error) {
        console.error('Error saving invoice:', error);
        toast.error('Failed to save invoice', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred.'
        });
      }
    }, handleFormErrors)();
  };

  // Get today's date in YYYY-MM-DD format for the min attribute
  const today = new Date().toISOString().split('T')[0];

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
    // Remove non-numeric characters except decimal point
    const numericString = value.replace(/[^0-9.]/g, '');
    const numericValue = parseFloat(numericString);
    if (!isNaN(numericValue)) {
      // Validate specific field constraints
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
        const currentTotal = subtotal + taxAmount - discountAmount;
        if (numericValue > currentTotal) {
          toast.error('Invalid paid amount', {
            description: 'Paid amount cannot exceed the invoice total'
          });
          field.onChange(currentTotal);
          return;
        }
      }
      if (fieldName === 'profit') {
        if (numericValue < 0) {
          toast.error('Invalid profit', {
            description: 'Profit cannot be negative'
          });
          field.onChange(0);
          return;
        }
        // Get current total to validate profit amount
        const currentTotal = subtotal + taxAmount - discountAmount;
        if (numericValue > currentTotal) {
          toast.error('Invalid profit amount', {
            description: 'Profit cannot exceed the invoice total'
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, handleFormErrors)} className="space-y-8">
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

        {/* Client Details */}
        <Collapsible open={isToOpen} onOpenChange={setIsToOpen} className="border rounded-lg">
          <div className="p-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn('w-full justify-between p-0', {
                  'mb-4': isToOpen
                })}
              >
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  To {form.watch('client.name') && `- ${form.watch('client.name')}`}
                </h2>
                <ChevronsUpDown />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 space-y-2 sm:space-y-4">
              <div className="space-y-3">
                <div className="flex max-sm:flex-col justify-between gap-2">
                  <Combobox
                    items={customers}
                    itemToStringValue={(customer: Customer) => customer.name}
                    onInputValueChange={handleCustomerSelect}
                    autoHighlight
                    disabled={isOtcCustomer}
                  >
                    <ComboboxInput
                      disabled={isOtcCustomer}
                      placeholder="Select a customer"
                      className="w-full max-w-sm"
                    />
                    <ComboboxContent>
                      <ComboboxEmpty>No such customer exists.</ComboboxEmpty>
                      <ComboboxList>
                        {customer => (
                          <ComboboxItem key={customer.id} value={customer.name}>
                            <Item className="p-0">
                              <ItemContent>
                                <ItemTitle>{customer.name}</ItemTitle>
                                {customer.company && (
                                  <ItemDescription className="flex gap-2 items-center text-xs">
                                    <Building2 /> {customer.company}
                                  </ItemDescription>
                                )}
                              </ItemContent>
                            </Item>
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>

                  <Button type="button" onClick={() => setIsCreateCustomerOpen(true)} disabled={isOtcCustomer}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Customer
                  </Button>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="useOtc"
                    className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                    onChange={e => {
                      if (e.target.checked) {
                        setIsOtcCustomer(true);
                        setSelectedCustomer(OTC_CUSTOMER as Customer);
                        form.setValue('customerId', OTC_CUSTOMER.id);
                        form.setValue('client.name', OTC_CUSTOMER.name);
                        form.setValue('client.company', OTC_CUSTOMER.company);
                        form.setValue('client.email', OTC_CUSTOMER.email);
                        form.setValue('client.phone', OTC_CUSTOMER.phone);
                        form.setValue('client.address', OTC_CUSTOMER.address);
                        form.setValue('client.city', OTC_CUSTOMER.city);
                        form.setValue('client.state', OTC_CUSTOMER.state);
                        form.setValue('client.zip', OTC_CUSTOMER.zip);
                        setIsToOpen(false);
                      } else {
                        setIsOtcCustomer(false);
                        setSelectedCustomer(null);
                        form.setValue('customerId', '');
                      }
                    }}
                    checked={isOtcCustomer}
                  />
                  <label htmlFor="useOtc" className="text-sm font-medium cursor-pointer flex-1">
                    Walk-in / Cash Customer (OTC)
                  </label>
                </div>
              </div>
              {selectedCustomer && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {selectedCustomer.name}
                      </h3>
                      {selectedCustomer.company && (
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                          <Building2 className="h-4 w-4" />
                          {selectedCustomer.company}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      {selectedCustomer.email && (
                        <p className="text-sm flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {selectedCustomer.email}
                        </p>
                      )}
                      {selectedCustomer.phone && (
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {selectedCustomer.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  {(selectedCustomer.address ||
                    selectedCustomer.city ||
                    selectedCustomer.state ||
                    selectedCustomer.zip) && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <span>
                          {[
                            selectedCustomer.address,
                            selectedCustomer.city,
                            selectedCustomer.state,
                            selectedCustomer.zip
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
              {!selectedCustomer && (
                <div className="bg-gray-50 border-2 border-dashed rounded-lg p-8 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a customer to continue</p>
                </div>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>

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
            {/* Product Selector - Hidden when from project */}
            {!fromProject && (variants.length > 0 || virtualProducts.length > 0) && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <EnhancedProductSelector
                  variants={variants}
                  virtualProducts={virtualProducts}
                  purchases={purchases}
                  currentItems={form.watch('items')}
                  onAddItem={handleAddItemFromSelector}
                />
              </div>
            )}

            {/* Invoice Items Table with Container Query */}
            <div className={cn(
              "border rounded-lg overflow-auto shadow-sm @container max-h-[665px]",
              fromProject && "lg:col-span-2" // Full width when product selector is hidden
            )}>
              <div className="bg-primary text-white px-4 py-3">
                <h3 className="text-sm font-semibold">
                  Invoice Items
                  {fromProject && projectId && (
                    <span className="ml-2 text-xs opacity-80">
                      (From Project: {projectId})
                    </span>
                  )}
                </h3>
              </div>

              {fields.length === 0 && (
                <div className="text-center text-muted-foreground py-20">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm max-w-sm mx-auto">
                    {fromProject 
                      ? "No items from project. Please go back and add inventory to the project first."
                      : "No items added yet. Use the product selector above to add items."
                    }
                  </p>
                </div>
              )}

              {/* Card view for smaller containers */}
              <div className="divide-y">
                {fields.map((item, index) => {
                  const currentQuantity = form.watch(`items.${index}.quantity`) || 0;
                  const currentRate = form.watch(`items.${index}.rate`) || 0;
                  const originalRate = form.watch(`items.${index}.originalRate`) || 0;
                  const variantId = form.watch(`items.${index}.variantId`);
                  const purchaseId = form.watch(`items.${index}.purchaseId`);
                  const availableStock = getAvailableStock(variantId);

                  // Get stock limit for this specific purchase (including current item's quantity)
                  const purchaseStockLimit = purchaseId
                    ? (() => {
                        const purchase = purchases.find(p => p.purchaseId === purchaseId);
                        if (!purchase) return 0;

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
                                        max={
                                          purchaseId
                                            ? purchaseStockLimit < Infinity
                                              ? purchaseStockLimit
                                              : undefined
                                            : availableStock < Infinity
                                              ? availableStock
                                              : undefined
                                        }
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

              {/* Additional fields from original design */}
              <div className="border-t pt-2 mt-2 space-y-2">
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                {/* Profit Display */}
                <div className="flex justify-between text-sm bg-green-50 dark:bg-green-950/20 p-2 rounded">
                  <span className="text-green-700 dark:text-green-400 font-medium">Estimated Profit:</span>
                  <span
                    className={`font-semibold ${calculatedProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {formatCurrency(calculatedProfit)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">
                      Paid:{' '}
                      {isOtcCustomer && (
                        <span className="text-xs max-sm:hidden text-orange-600">(Full payment required)</span>
                      )}
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

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Profit:</span>
                    <FormField
                      control={form.control}
                      name="profit"
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
                                onChange={e => handleNumericInput(e, field, 'profit')}
                                value={field.value || ''}
                                placeholder="0.00"
                              />
                            </InputGroup>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <span className="text-blue-600">{formatCurrency(form.watch('profit') || 0)}</span>
                </div>

                {!isOtcCustomer && selectedCustomer && (
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground font-medium">Outstanding Balance:</span>
                    <span className={`font-medium ${outstandingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(outstandingBalance)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Grand Total:</span>
                  <span className={grandTotal > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(grandTotal)} {grandTotal > 0 ? '(Due)' : '(Paid)'}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Amount in words:</span> {form.watch('amountInWords')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description - Collapsible and Collapsed by Default */}
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

        {/* Notes - Collapsible and Collapsed by Default */}
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
                      <Textarea
                        className="min-h-[100px]"
                        placeholder="Notes visible on printed invoice..."
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

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              form.reset();
              setSelectedCustomer(null);
            }}
          >
            Reset Form
          </Button>
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            aria-disabled={isLoading}
            disabled={isLoading}
            type="button"
            variant="default"
            className="w-full sm:w-auto"
            onClick={handleSave}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isLoading ? 'Saving' : 'Save Invoice'}
          </Button>
        </div>
      </form>

      {/* Preview Sheet */}
      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex gap-2 items-center text-primary">
              <Eye /> Invoice Preview
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <NewonInvoiceTemplate
              invoiceData={{
                ...form.getValues(),
                invoiceNumber: nextInvoiceNumber,
                outstandingBalance
              }}
              onBack={() => setIsPreviewOpen(false)}
              onSave={handleSave}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Customer Dialog */}
      <Dialog open={isCreateCustomerOpen} onOpenChange={setIsCreateCustomerOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            onSuccess={() => {
              setIsCreateCustomerOpen(false);
              setRefreshCustomers(prev => prev + 1);
              toast.success('Customer created successfully');
            }}
            onCancel={() => setIsCreateCustomerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Form>
  );
}
