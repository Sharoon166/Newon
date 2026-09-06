'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronDown,
  ChevronRight,
  Package,
  Eye,
  Save,
  Loader2,
  Edit
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
import type { InvoiceItem } from '../types';
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
import { UnitSelector } from '@/components/ui/unit-selector';
import { AddCustomExpenseDialog } from './add-custom-expense-dialog';
import { groupItemsByVariant, buildEffectiveStockByPurchase, type GroupedInvoiceItem } from '../utils/group-items';
import { Badge } from '@/components/ui/badge';

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
        unit: z.string().min(1, 'Unit is required').default('pcs'),
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
        componentBreakdown: z
          .array(
            z.object({
              productId: z.string(),
              variantId: z.string(),
              productName: z.string(),
              sku: z.string(),
              quantity: z.number(),
              purchaseId: z.string(),
              unitCost: z.number(),
              totalCost: z.number()
            })
          )
          .optional(),
        customExpenses: z
          .array(
            z.object({
              name: z.string(),
              amount: z.number(),
              actualCost: z.number(),
              clientCost: z.number(),
              category: z.string(),
              description: z.string().optional(),
              expenseId: z.string().optional()
            })
          )
          .optional(),
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
  additionalCharges: z
    .array(
      z.object({
        description: z.string().min(1, 'Description is required'),
        value: z.number().min(0, 'Value must be 0 or greater')
      })
    )
    .optional(),
  paymentDetails: z.object({
    bankName: z.string(),
    accountNumber: z.string(),
    iban: z.string()
  })
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export function NewInvoiceForm({
  isLoading,
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
  isEditMode = false,
  existingPaidAmount = 0,
  restoredItems
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
  existingPaidAmount?: number;
  restoredItems?: InvoiceItem[];
}) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isOtcCustomer, setIsOtcCustomer] = useState(false);
  const [isToOpen, setIsToOpen] = useState(true);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>('Loading...');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [isCustomExpenseDialogOpen, setIsCustomExpenseDialogOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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
      paid: initialData?.paid ?? existingPaidAmount,
      remainingPayment: 0,
      profit: 0,
      description: initialData?.description || '',
      notes: initialData?.notes || '',
      additionalCharges: initialData?.additionalCharges || [],
      terms:
        initialData?.terms ||
        (initialInvoiceTerms ? initialInvoiceTerms.join('\n') : INVOICE_TERMS_AND_CONDITIONS.join('\n')),
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
    if (initialData?.customerId) {
      // Check if this is an OTC customer
      if (initialData.customerId === 'otc') {
        setIsOtcCustomer(true);
        setSelectedCustomer(OTC_CUSTOMER as Customer);
        setIsToOpen(false); // Close the customer selector since we have a customer
      } else if (customers.length > 0) {
        const customer = customers.find(
          c => c.customerId === initialData.customerId || c.id === initialData.customerId
        );
        if (customer) {
          setSelectedCustomer(customer);
          setIsOtcCustomer(false);
          setIsToOpen(false); // Close the customer selector since we have a customer
        }
      }
    }
  }, [initialData?.customerId, customers]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const {
    fields: additionalChargesFields,
    append: appendAdditionalCharge,
    remove: removeAdditionalCharge
  } = useFieldArray({
    control: form.control,
    name: 'additionalCharges'
  });

  // Mirrors EnhancedProductSelector's effectiveStockByPurchase — single source of truth
  // for available stock used by both the selector and the items table stepper.
  const currentItemsForStock = useWatch({ control: form.control, name: 'items' });
  const effectiveStockByPurchase = useMemo(
    (): Map<string, number> => buildEffectiveStockByPurchase(purchases, currentItemsForStock || [], restoredItems),
    [purchases, currentItemsForStock, restoredItems]
  );

  // Available stock for a variant — sums effective remaining across all purchases for that variant.
  const getAvailableStock = (variantId?: string): number => {
    if (!variantId) return Infinity;
    let total = 0;
    for (const [purchaseId, remaining] of effectiveStockByPurchase) {
      const purchase = purchases.find(p => p.purchaseId === purchaseId && p.variantId === variantId);
      if (purchase) total += Math.max(0, remaining);
    }
    return total;
  };

  // Available VP quantity — min of floor(componentEffectiveStock / compQty) across all components.
  const getVirtualProductAvailableQuantity = (virtualProductId?: string): number => {
    if (!virtualProductId) return Infinity;
    const virtualProduct = virtualProducts.find(vp => vp.id === virtualProductId);
    if (!virtualProduct) return 0;
    const max = virtualProduct.components.reduce((min, comp) => {
      let compStock = 0;
      for (const [purchaseId, remaining] of effectiveStockByPurchase) {
        const purchase = purchases.find(p => p.purchaseId === purchaseId && p.variantId === comp.variantId);
        if (purchase) compStock += Math.max(0, remaining);
      }
      return Math.min(min, Math.floor(compStock / comp.quantity));
    }, Infinity);
    return max === Infinity ? 0 : max;
  };

  const subtotal = form.watch('items').reduce((sum, item) => sum + item.amount, 0);

  // useWatch returns a plain array (not proxy) that triggers re-render on every item change
  const watchedItems = useWatch({ control: form.control, name: 'items' }) as InvoiceFormValues['items'];
  const groupedItems = groupItemsByVariant(watchedItems || []);

  // Toggle expand/collapse for a grouped item
  const toggleGroupExpand = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Propagate grouped price to all underlying batch lines
  const handleGroupedPriceChange = (group: GroupedInvoiceItem, newRate: number) => {
    for (const batch of group.batches) {
      const currentQty = form.getValues(`items.${batch.fieldIndex}.quantity`);
      form.setValue(`items.${batch.fieldIndex}.rate`, newRate);
      form.setValue(`items.${batch.fieldIndex}.amount`, newRate * currentQty);
    }
  };

  // Propagate grouped quantity change — adjusts batches to match the new total
  const handleGroupedQuantityChange = (group: GroupedInvoiceItem, newTotalQty: number) => {
    if (newTotalQty < 1) return;
    const diff = newTotalQty - group.totalQuantity;
    if (diff === 0) return;

if (diff > 0) {
      // Increase: distribute across batches in order, moving to the next batch once
      // the current one has consumed all its purchase stock headroom. Headroom comes
      // from the same reactive effectiveStockByPurchase map the selector uses, so
      // FIFO advance always matches what the cards show.
      let toAdd = diff;
      for (const batch of group.batches) {
        if (toAdd <= 0) break;
        const currentQty = form.getValues(`items.${batch.fieldIndex}.quantity`);
        const headroom = !batch.purchaseId
          ? Infinity
          : (effectiveStockByPurchase.get(batch.purchaseId) ?? Infinity);
        const increase = Math.min(toAdd, headroom);
        if (increase <= 0) continue;
        form.setValue(`items.${batch.fieldIndex}.quantity`, currentQty + increase);
        form.setValue(`items.${batch.fieldIndex}.amount`, (currentQty + increase) * batch.rate);
        toAdd -= increase;
      }
      // No batch had headroom left (all stock exhausted, or untracked purchases):
      // oversell on the last batch rather than blocking the increase.
            // When existing batches are exhausted, create new line items from the next
      // available purchase — identical to what the card's "Add to Invoice" does.
      if (toAdd > 0) {
        const usedPurchaseIds = new Set(group.batches.map(b => b.purchaseId).filter(Boolean));
        const unusedPurchases = purchases
          .filter(p => p.variantId === group.variantId && !usedPurchaseIds.has(p.purchaseId))
          .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
        for (const purchase of unusedPurchases) {
          if (toAdd <= 0) break;
          const available = effectiveStockByPurchase.get(purchase.purchaseId) ?? 0;
          if (available <= 0) continue;
          const increase = Math.min(toAdd, available);
          const existingRate = group.batches[0]?.rate;
          const refPurchase = purchases.find(p => p.purchaseId === group.batches[0]?.purchaseId);
          const useRetail = refPurchase ? existingRate === refPurchase.retailPrice : true;
          const rate = useRetail ? (purchase.retailPrice || 0) : (purchase.wholesalePrice || 0);
          append({
            id: uuidv4(),
            description: group.description,
            quantity: increase,
            unit: group.unit || 'pcs',
            rate,
            amount: increase * rate,
            productId: group.productId,
            variantId: group.variantId,
            variantSKU: group.variantSKU,
            purchaseId: purchase.purchaseId,
            originalRate: purchase.unitPrice,
            saleRate: rate,
          });
          toAdd -= increase;
        }
      }
      // All stock exhausted — block increase
      if (toAdd > 0) {
        toast.error('Stock exhausted', {
          description: `No more stock available for ${group.description}.`
        });
      }
      return;
    }

    // Decrease: consume from batches in reverse order. A batch is removed
    // entirely once its quantity hits 0 — the unified rate then recomputes as
    // the weighted average of the remaining batches (or the single batch rate).
    let remaining = Math.abs(diff);
    const toRemove: number[] = [];
    for (let i = group.batches.length - 1; i >= 0 && remaining > 0; i--) {
      const batch = group.batches[i];
      const currentQty = form.getValues(`items.${batch.fieldIndex}.quantity`);
      const consume = Math.min(currentQty, remaining);
      if (consume <= 0) continue;
      const newQty = currentQty - consume;
      if (newQty === 0) {
        toRemove.push(batch.fieldIndex);
      } else {
        form.setValue(`items.${batch.fieldIndex}.quantity`, newQty);
        form.setValue(`items.${batch.fieldIndex}.amount`, newQty * batch.rate);
      }
      remaining -= consume;
    }
    // Remove fully-consumed batches, highest fieldIndex first so lower indexes stay valid
    toRemove.sort((a, b) => b - a);
    for (const idx of toRemove) {
      remove(idx);
    }
  };

  const exhaustedGroupKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const group of groupedItems) {
      let exhausted = true;
      for (const batch of group.batches) {
        if (batch.purchaseId) {
          if ((effectiveStockByPurchase.get(batch.purchaseId) ?? Infinity) > 0) { exhausted = false; break; }
        } else { exhausted = false; break; }
      }
      if (exhausted) {
        const used = new Set(group.batches.map(b => b.purchaseId).filter(Boolean));
        for (const p of purchases) {
          if (p.variantId === group.variantId && !used.has(p.purchaseId) && (effectiveStockByPurchase.get(p.purchaseId) ?? 0) > 0) {
            exhausted = false; break;
          }
        }
      }
      if (exhausted) keys.add(group.key);
    }
    return keys;
  }, [groupedItems, purchases, effectiveStockByPurchase]);

  const taxRate = form.watch('taxRate');
  const discount = form.watch('discount');
  const discountType = form.watch('discountType');
  const additionalCharges = form.watch('additionalCharges') || [];
  const taxAmount = (subtotal * taxRate) / 100;
  const discountAmount = discountType === 'percentage' ? (subtotal * discount) / 100 : discount;
  const additionalChargesTotal = additionalCharges.reduce((sum, charge) => sum + charge.value, 0);
  const total = subtotal + taxAmount - discountAmount + additionalChargesTotal;

  // Calculate profit in real-time
  const items = form.watch('items');
  const totalCost = items.reduce((sum, item) => {
    let itemCost = 0;

    // For virtual products, use component cost + custom expenses
    if (item.isVirtualProduct) {
      const componentCost = item.totalComponentCost || 0;
      const customExpensesCost = item.totalCustomExpenses || 0;
      itemCost = (componentCost + customExpensesCost) * (item.quantity || 1);
    } else if (item.customExpenses && item.customExpenses.length > 0) {
      // Use actualCost from customExpenses
      const customCost = item.customExpenses.reduce((s, e) => s + e.actualCost, 0);
      itemCost = customCost * (item.quantity || 1);
    } else if (item.originalRate !== undefined && item.originalRate !== null) {
      itemCost = item.originalRate * (item.quantity || 1);
    }

    return sum + itemCost;
  }, 0);

  const calculatedProfit = total - totalCost;

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
  const grandTotal = Math.max(0, total - (isEditMode ? existingPaidAmount : paid));

  // Update remaining payment and amount in words when grandTotal changes
  useEffect(() => {
    form.setValue('remainingPayment', grandTotal, { shouldValidate: true });
    const amountInWords = `${convertToWords(Math.round(grandTotal))} Rupees Only`;
    form.setValue('amountInWords', amountInWords, { shouldValidate: true });
  }, [grandTotal, form]);

  const handleAddItemFromSelector = useCallback(
    (item: {
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
        amount?: number; // Old format
        actualCost?: number; // New format
        clientCost?: number; // New format
        category: string; // Accept any category string, will be converted below
        description?: string;
      }>;
      totalComponentCost?: number;
      totalCustomExpenses?: number;
    }) => {
      // Convert old format customExpenses to new format if needed
      const convertedCustomExpenses = item.customExpenses?.map(expense => {
        // If old format (has amount but not actualCost/clientCost), convert it
        if (expense.amount !== undefined && expense.actualCost === undefined && expense.clientCost === undefined) {
          return {
            name: expense.name,
            amount: expense.amount,
            actualCost: expense.amount,
            clientCost: expense.amount,
            category: expense.category,
            description: expense.description
          };
        }
        // Already in new format
        return {
          name: expense.name,
          amount: expense.clientCost ?? 0,
          actualCost: expense.actualCost ?? 0,
          clientCost: expense.clientCost ?? 0,
          category: expense.category,
          description: expense.description
        };
      });
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
          // Virtual product exists — replace with new FIFO breakdown for updated total quantity
          const existingItem = form.getValues(`items.${existingVirtualItemIndex}`);
          const newQuantity = existingItem.quantity + item.quantity;
          form.setValue(
            `items.${existingVirtualItemIndex}`,
            {
              ...existingItem,
              quantity: newQuantity,
              amount: newQuantity * existingItem.rate,
              componentBreakdown: item.componentBreakdown,
              totalComponentCost: item.totalComponentCost,
              totalCustomExpenses: item.totalCustomExpenses,
              originalRate: item.originalRate
            },
            { shouldDirty: true }
          );
        } else {
          console.log({ item });
          // Add new virtual product
          append({
            id: uuidv4(),
            description: item.description,
            quantity: item.quantity,
            unit: 'pcs', // Will be updated by form field
            rate: item.rate,
            amount: item.quantity * item.rate,
            productId: item.virtualProductId, // Store virtualProductId as productId
            virtualProductId: item.virtualProductId,
            isVirtualProduct: true,
            variantSKU: item.sku,
            originalRate: item.originalRate,
            saleRate: item.saleRate,
            componentBreakdown: item.componentBreakdown,
            customExpenses: convertedCustomExpenses,
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
        const existingItem = form.getValues(`items.${existingItemIndex}`);
        const newQuantity = existingItem.quantity + item.quantity;
        form.setValue(`items.${existingItemIndex}.quantity`, newQuantity);
        form.setValue(`items.${existingItemIndex}.amount`, newQuantity * existingItem.rate);
      } else {
        // Item doesn't exist or is from a different purchase, add new entry
        append({
          id: uuidv4(),
          description: item.description,
          quantity: item.quantity,
          unit: 'pcs',
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
    },
    [fields, form, append]
  );

  const handleCustomerSelect = (customerName: string) => {
    const customer = customers.find(customer => customer.name === customerName);
    if (customer) {
      // Check if this is the OTC customer
      if (customer.customerId === 'otc' || customer.id === 'otc') {
        setIsOtcCustomer(true);
        setSelectedCustomer(OTC_CUSTOMER as Customer);
        form.setValue('customerId', 'otc');
        form.setValue('client.name', OTC_CUSTOMER.name);
        form.setValue('client.company', OTC_CUSTOMER.company);
        form.setValue('client.email', OTC_CUSTOMER.email);
        form.setValue('client.phone', OTC_CUSTOMER.phone);
        form.setValue('client.address', OTC_CUSTOMER.address);
        form.setValue('client.city', OTC_CUSTOMER.city);
        form.setValue('client.state', OTC_CUSTOMER.state);
        form.setValue('client.zip', OTC_CUSTOMER.zip);
      } else {
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
      }

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
                <h2 className="text-lg font-semibold flex items-center gap-2 truncate">
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
                <h3 className="font-sans text-sm mb-4 flex items-center gap-2 text-muted-foreground">
                  Add Products or Custom Items
                </h3>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCustomExpenseDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Item
              </Button>
            </div>
          </div>

          <AddCustomExpenseDialog
            open={isCustomExpenseDialogOpen}
            onOpenChange={setIsCustomExpenseDialogOpen}
            onAdd={expense => {
              append({
                id: uuidv4(),
                description: expense.name,
                quantity: 1,
                unit: 'pcs',
                rate: expense.clientCost,
                amount: expense.clientCost,
                originalRate: expense.actualCost,
                customExpenses: [
                  {
                    name: expense.name,
                    amount: expense.clientCost,
                    actualCost: expense.actualCost,
                    clientCost: expense.clientCost,
                    category: expense.category,
                    description: expense.description
                  }
                ],
                totalComponentCost: 0,
                totalCustomExpenses: expense.actualCost
              });
            }}
          />

          <div className="gap-6 grid lg:grid-cols-2">
            {/* Product Selector - Hidden when from project */}
            {!fromProject && (variants.length > 0 || virtualProducts.length > 0) && (
              <div className="bg-muted/30 rounded-lg">
                <EnhancedProductSelector
                  variants={variants}
                  virtualProducts={virtualProducts}
                  purchases={purchases}
                  currentItems={currentItemsForStock}
                  onAddItem={handleAddItemFromSelector}
                  restoredItems={restoredItems}
                />
              </div>
            )}

            {/* Invoice Items Table with Container Query */}
            <div
              className={cn(
                'border rounded-lg overflow-auto shadow-sm @container max-h-[665px]',
                fromProject && 'lg:col-span-2' // Full width when product selector is hidden
              )}
            >
              <div className="bg-primary text-white px-4 py-3">
                <h3 className="text-sm font-semibold">
                  Invoice Items
                  {fromProject && projectId && (
                    <span className="ml-2 text-xs opacity-80">(From Project: {projectId})</span>
                  )}
                </h3>
              </div>

              {fields.length === 0 && (
                <div className="text-center text-muted-foreground py-20">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm max-w-sm mx-auto">
                    {fromProject
                      ? 'No items from project. Please go back and add inventory to the project first.'
                      : 'No items added yet. Use the product selector above to add items.'}
                  </p>
                </div>
              )}

              {/* Card view for grouped items */}
              <div className="divide-y">
                {groupedItems.map((group, groupIndex) => {
                  const availableStock =
                    group.isVirtualProduct && group.virtualProductId
                      ? getVirtualProductAvailableQuantity(group.virtualProductId)
                      : getAvailableStock(group.variantId);

                  const firstBatchField = group.batches[0];
                  const vpTotalComponentCost = group.isVirtualProduct
                    ? (form.watch(`items.${firstBatchField.fieldIndex}.totalComponentCost`) || 0)
                    : 0;
                  const vpTotalCustomExpenses = group.isVirtualProduct
                    ? (form.watch(`items.${firstBatchField.fieldIndex}.totalCustomExpenses`) || 0)
                    : 0;
                  const vpActualCost = vpTotalComponentCost + vpTotalCustomExpenses;
                  const vpProfitPerUnit = group.unifiedRate - vpActualCost;

                  return (
                    <div key={group.key} className="p-4 hover:bg-muted/30 transition-colors">
                      {/* Group header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                            #{groupIndex + 1}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium text-sm">{group.description}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {group.isVirtualProduct && (
                                <Badge variant="secondary" className="text-xs">
                                  Virtual Product
                                </Badge>
                              )}
                              {group.variantSKU && (
                                <span className="text-xs text-muted-foreground">SKU: {group.variantSKU}</span>
                              )}
                              {group.batches.length > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  {group.batches.length} batches
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                Stock: {availableStock === Infinity ? 'N/A' : availableStock}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {group.batches.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleGroupExpand(group.key)}
                          >
                            {expandedGroups.has(group.key) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const indices = group.batches
                                .map(b => b.fieldIndex)
                                .sort((a, b) => b - a);
                              for (const idx of indices) {
                                remove(idx);
                              }
                            }}
                            className="h-8 w-8 -mt-1"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* Group content */}
                      <div className="space-y-3">
                        {/* Quantity */}
                        <div className="flex max-xs:flex-col xs:items-center gap-2">
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-xs text-muted-foreground w-12">Qty:</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleGroupedQuantityChange(group, group.totalQuantity - 1)}
                              disabled={group.totalQuantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <InputGroup>
                              <InputGroupInput
                                type="number"
                                min="1"
                                value={group.totalQuantity}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val) && val >= 1) {
                                    handleGroupedQuantityChange(group, val);
                                  }
                                }}
                                className="h-8 text-sm text-center"
                              />
                            </InputGroup>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={exhaustedGroupKeys.has(group.key)}
                              onClick={() => handleGroupedQuantityChange(group, group.totalQuantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs text-muted-foreground ml-1">{group.unit}</span>
                          </div>
                        </div>

                        {/* Pricing */}
                        {group.isVirtualProduct ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Actual Cost</div>
                                <InputGroup>
                                  <InputGroupInput
                                    type="number"
                                    value={vpActualCost}
                                    disabled
                                    className="h-8 text-sm bg-muted"
                                  />
                                </InputGroup>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Components: {formatCurrency(vpTotalComponentCost)} + Expenses:{' '}
                                  {formatCurrency(vpTotalCustomExpenses)}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Selling Price</div>
                                <InputGroup>
                                  <InputGroupInput
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={group.unifiedRate}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val) && val >= 0) {
                                        handleGroupedPriceChange(group, val);
                                      }
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </InputGroup>
                                <div className="text-xs text-green-600 mt-1">
                                  Profit per unit: {formatCurrency(vpProfitPerUnit)} × {group.totalQuantity} ={' '}
                                  {formatCurrency(vpProfitPerUnit * group.totalQuantity)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground mb-1">Total Amount</div>
                              <div className="font-semibold">{formatCurrency(group.totalAmount)}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Rate</div>
                              <InputGroup>
                                <InputGroupInput
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={group.unifiedRate}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val >= 0) {
                                      handleGroupedPriceChange(group, val);
                                    }
                                  }}
                                  className="h-8 text-sm"
                                />
                              </InputGroup>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground mb-1">Amount</div>
                              <div className="font-semibold">{formatCurrency(group.totalAmount)}</div>
                            </div>
                          </div>
                        )}

                        {/* Batch breakdown (when expanded) */}
                        {expandedGroups.has(group.key) && group.batches.length > 1 && (
                          <div className="border rounded-md p-3 bg-muted/20 space-y-1">
                            <div className="text-xs font-semibold text-muted-foreground mb-2">Batch Breakdown</div>
                            {group.batches.map((batch, batchIdx) => (
                              <div key={batchIdx} className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground">
                                  {batch.purchaseId || `Batch ${batchIdx + 1}`}
                                </span>
                                <span>Qty: {batch.quantity}</span>
                                <span>Rate: {formatCurrency(batch.rate)}</span>
                                <span>Amount: {formatCurrency(batch.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
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

              {/* Additional Charges Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Additional Charges:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendAdditionalCharge({ description: '', value: 0 })}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Charge
                  </Button>
                </div>

                {additionalChargesFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <FormField
                      control={form.control}
                      name={`additionalCharges.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <InputGroup>
                              <InputGroupInput placeholder="Charge description" {...field} className="h-8 text-sm" />
                            </InputGroup>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`additionalCharges.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="w-32">
                          <FormControl>
                            <InputGroup>
                              <InputGroupAddon>Rs</InputGroupAddon>
                              <InputGroupInput
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                className="h-8 text-sm text-right"
                                onChange={e => {
                                  const numericString = e.target.value.replace(/[^0-9.]/g, '');
                                  const numericValue = parseFloat(numericString);
                                  if (!isNaN(numericValue) && numericValue >= 0) {
                                    field.onChange(numericValue);
                                  } else if (e.target.value === '') {
                                    field.onChange(0);
                                  }
                                }}
                                value={field.value || ''}
                              />
                            </InputGroup>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeAdditionalCharge(index)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {additionalChargesFields.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Additional Charges Total:</span>
                    <span className="font-medium">{formatCurrency(additionalChargesTotal)}</span>
                  </div>
                )}
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
                    {isEditMode ? (
                      <span className="text-sm text-muted-foreground">(from partial payments)</span>
                    ) : (
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
                    )}
                  </div>
                  <span className="text-green-600">
                    {isEditMode ? formatCurrency(existingPaidAmount) : formatCurrency(paid)}
                  </span>
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

        {/* Terms and Conditions - Collapsible and Collapsed by Default */}
        <Collapsible open={isTermsOpen} onOpenChange={setIsTermsOpen} className="border rounded-lg">
          <div className="p-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn('w-full justify-between p-0', {
                  'mb-4': isTermsOpen
                })}
              >
                <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Terms and Conditions
                </h2>
                <ChevronsUpDown />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea className="min-h-[100px]" placeholder="State the terms and conditions..." {...field} />
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
                // Group items by variant for preview display
                items: groupedItems.map(group => ({
                  id: group.productId || group.variantId || group.virtualProductId || '',
                  description: group.description,
                  unit: group.unit,
                  quantity: group.totalQuantity,
                  rate: group.unifiedRate,
                  amount: group.totalAmount,
                  productId: group.productId,
                  variantId: group.variantId,
                  variantSKU: group.variantSKU,
                  purchaseId: group.batches[0]?.purchaseId,
                  imageUrl: undefined
                })),
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
              toast.success('Customer created successfully');
            }}
            onCancel={() => setIsCreateCustomerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Form>
  );
}
