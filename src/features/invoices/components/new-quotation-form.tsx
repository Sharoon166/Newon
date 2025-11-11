'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ShoppingCart,
  Mail,
  Phone,
  Globe,
  MapPin,
  NotebookTabs as NotebookTabsIcon,
  ChevronsUpDown
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatCurrency, getToday } from '@/lib/utils';
import useBrandStore from '@/stores/useBrandStore';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { convertToWords } from '../utils';
import { Customer } from '@/features/customers/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProductSelector } from './product-selector';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';
import { brands } from '@/stores/useBrandStore';
import { INVOICE_TERMS_AND_CONDITIONS } from '@/constants';

const quotationFormSchema = z.object({
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
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zip: z.string().min(1, 'ZIP code is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(1, 'Phone is required')
  }),
  quotationNumber: z.string().min(1, 'Quotation number is required'),
  date: z.string().min(1, 'Date is required'),
  validUntil: z.string().min(1, 'Valid until date is required'),
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
  notes: z.string().optional(),
  terms: z.string().optional()
});

type QuotationFormValues = z.infer<typeof quotationFormSchema>;

export function NewQuotationForm({
  onPreview,
  customers,
  variants = [],
  purchases = []
}: {
  onPreview: (data: QuotationFormValues) => void;
  customers: Customer[];
  variants?: EnhancedVariants[];
  purchases?: Purchase[];
}) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomCustomer, setIsCustomCustomer] = useState(false);
  const [isFromOpen, setIsFromOpen] = useState(true);
  const [isToOpen, setIsToOpen] = useState(true);
  const currentBrandId = useBrandStore(state => state.currentBrandId);
  const setBrand = useBrandStore(state => state.setBrand);
  const brand = useBrandStore(state => state.getCurrentBrand());
  
  const form = useForm<QuotationFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(quotationFormSchema) as any,
    defaultValues: {
      logo: '',
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
      client: {
        name: '',
        company: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        email: '',
        phone: ''
      },
      billingType: 'retail',
      market: currentBrandId === 'waymor' ? 'waymor' : 'newon',
      customerId: '',
      quotationNumber: `QT-${Math.floor(1000 + Math.random() * 9000)}`,
      date: getToday(),
      validUntil: getToday(),
      items: [],
      taxRate: 0,
      discount: 0,
      discountType: 'fixed',
      amountInWords: 'Zero Rupees Only',
      notes: '',
      terms: INVOICE_TERMS_AND_CONDITIONS.join('\n')
    }
  });

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

  // Update amount in words based on total
  const amountInWords = `${convertToWords(Math.round(total))} Rupees Only`;
  form.setValue('amountInWords', amountInWords, { shouldValidate: true });

  const handleAddItemFromSelector = (item: {
    variantId: string;
    productName: string;
    sku: string;
    description: string;
    quantity: number;
    rate: number;
    purchaseId?: string;
  }) => {
    append({
      id: Date.now().toString(),
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.quantity * item.rate,
      productId: item.variantId,
      variantId: item.variantId,
      variantSKU: item.sku,
      purchaseId: item.purchaseId
    });
  };

  const handleCustomerSelect = (customerId: string) => {
    if (customerId === 'custom') {
      setIsCustomCustomer(true);
      setSelectedCustomer(null);
      form.setValue('customerId', '');
      form.setValue('client.name', '');
      form.setValue('client.company', '');
      form.setValue('client.email', '');
      form.setValue('client.phone', '');
      form.setValue('client.address', '');
      form.setValue('client.city', '');
      form.setValue('client.state', '');
      form.setValue('client.zip', '');
    } else {
      const customer = customers.find(customer => customer.id === customerId);
      if (customer) {
        setIsCustomCustomer(false);
        setSelectedCustomer(customer);
        form.setValue('customerId', customer.id);
        form.setValue('client.name', customer.name);
        form.setValue('client.company', customer.company || '');
        form.setValue('client.email', customer.email);
        form.setValue('client.phone', customer.phone || '');
        form.setValue('client.address', customer.address || '');
        form.setValue('client.city', customer.city || '');
        form.setValue('client.state', customer.state || '');
        form.setValue('client.zip', customer.zip || '');
      }
    }
  };

  const onSubmit = (data: QuotationFormValues) => {
    onPreview(data);
  };

  const today = new Date().toISOString().split('T')[0];

  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>, field: { onChange: (value: number) => void }) => {
    const value = e.target.value;
    if (value === '') {
      field.onChange(0);
      return;
    }
    const numericString = value.replace(/[^0-9.]/g, '');
    const numericValue = parseFloat(numericString);
    if (!isNaN(numericValue)) {
      field.onChange(numericValue);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Quotation Details */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quotation Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <FormField
              control={form.control}
              name="quotationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quotation #</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon>#</InputGroupAddon>
                      <InputGroupInput placeholder="QT-1001" {...field} />
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a date</span>}
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
              name="validUntil"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Valid Until</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), 'PPP') : <span>Pick a valid until date</span>}
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
              name="billingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="market"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select market" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="newon">Newon</SelectItem>
                      <SelectItem value="waymor">Waymor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 items-center gap-6">
          {/* Company Details */}
          <Collapsible open={isFromOpen} onOpenChange={setIsFromOpen} className="border rounded-lg">
            <div className="p-2">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn('w-full justify-between p-0', {
                    'mb-4': isFromOpen
                  })}
                >
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    From
                  </h2>
                  <ChevronsUpDown />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-2 sm:space-y-4">
                <div>
                  <Select
                    value={currentBrandId}
                    onValueChange={(value: 'newon' | 'waymor') => {
                      setBrand(value);
                      const selectedBrand = brands.find(b => b.id === value);
                      if (selectedBrand) {
                        form.setValue('company.name', selectedBrand.displayName);
                        form.setValue('company.address', selectedBrand.address);
                        form.setValue('company.city', selectedBrand.city);
                        form.setValue('company.state', selectedBrand.state);
                        form.setValue('company.zip', selectedBrand.zip);
                        form.setValue('company.phone', selectedBrand.phone);
                        form.setValue('company.email', selectedBrand.email);
                        form.setValue('company.website', selectedBrand.website || '');
                      }
                    }}
                  >
                    <SelectTrigger className="w-full max-w-sm">
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map(brandOption => (
                        <SelectItem key={brandOption.id} value={brandOption.id}>
                          {brandOption.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-gray-50 border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {brand.displayName}
                      </h3>
                      <p className="text-muted-foreground text-sm mt-1">{brand.description}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {brand.email}
                      </p>
                      <p className="text-sm flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {brand.phone}
                      </p>
                      {brand.website && (
                        <p className="text-sm flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          {brand.website}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-sm flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <span>
                        {brand.address}, {brand.city}, {brand.state} {brand.zip}
                      </span>
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

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
                    To
                  </h2>
                  <ChevronsUpDown />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-2 sm:space-y-4">
                <div>
                  <Select onValueChange={handleCustomerSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer or enter custom details" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">
                        <span className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Custom Customer (Manual Entry)
                        </span>
                      </SelectItem>
                      {customers?.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.company || 'No Company'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCustomer && !isCustomCustomer && (
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <p className="text-sm flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {selectedCustomer.email}
                        </p>
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {selectedCustomer.phone}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <span>
                          {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state}{' '}
                          {selectedCustomer.zip}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
                {isCustomCustomer && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="client.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            <InputGroup>
                              <InputGroupAddon>
                                <User className="h-4 w-4" />
                              </InputGroupAddon>
                              <InputGroupInput placeholder="Client Name" {...field} />
                            </InputGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="client.company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company (Optional)</FormLabel>
                          <FormControl>
                            <InputGroup>
                              <InputGroupAddon>
                                <Building2 className="h-4 w-4" />
                              </InputGroupAddon>
                              <InputGroupInput placeholder="Company Name" {...field} />
                            </InputGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="client.email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <InputGroup>
                              <InputGroupAddon>
                                <Mail className="h-4 w-4" />
                              </InputGroupAddon>
                              <InputGroupInput type="email" placeholder="client@example.com" {...field} />
                            </InputGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="client.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <InputGroup>
                              <InputGroupAddon>
                                <Phone className="h-4 w-4" />
                              </InputGroupAddon>
                              <InputGroupInput placeholder="+1 (555) 123-4567" {...field} />
                            </InputGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="client.address"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <InputGroup>
                              <InputGroupAddon>
                                <MapPin className="h-4 w-4" />
                              </InputGroupAddon>
                              <InputGroupInput placeholder="123 Client St." {...field} />
                            </InputGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="client.city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <InputGroup>
                              <InputGroupAddon>
                                <MapPin className="h-4 w-4" />
                              </InputGroupAddon>
                              <InputGroupInput placeholder="City" {...field} />
                            </InputGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="client.state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <InputGroup>
                              <InputGroupAddon>
                                <MapPin className="h-4 w-4" />
                              </InputGroupAddon>
                              <InputGroupInput placeholder="State" {...field} />
                            </InputGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="client.zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <InputGroup>
                              <InputGroupAddon>
                                <MapPin className="h-4 w-4" />
                              </InputGroupAddon>
                              <InputGroupInput placeholder="12345" {...field} />
                            </InputGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                {!selectedCustomer && !isCustomCustomer && (
                  <div className="bg-gray-50 border-2 border-dashed rounded-lg p-8 text-center">
                    <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Select a customer or choose custom entry</p>
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        {/* Quotation Items */}
        <div className="border rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Items
            </h2>
          </div>

          {/* Product Selector */}
          {variants.length > 0 && (
            <div className="mb-6">
              <ProductSelector variants={variants} purchases={purchases} onAddItem={handleAddItemFromSelector} />
            </div>
          )}

          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="text-left font-medium bg-primary text-white border-b">
                  <th className="p-3">#</th>
                  <th className="py-3 w-1/2">Item</th>
                  <th className="py-3 pl-2 uppercase tracking-wider">Qty</th>
                  <th className="py-3 pl-2 uppercase tracking-wider">Rate</th>
                  <th className="py-3 pl-2 uppercase tracking-wider">Amount</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fields.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground py-4">
                      No items added yet.
                    </td>
                  </tr>
                )}
                {fields.map((item, index) => (
                  <tr key={item.id} className="group *:px-2">
                    <td className="p-3 text-sm">{index + 1}.</td>
                    <td className="py-4 px-3">
                      <p className="text-sm whitespace-pre-wrap">{item.description || 'No description'}</p>
                    </td>
                    <td className="py-4 px-3">
                      <p className="text-sm">{item.quantity}</p>
                    </td>
                    <td className="py-4 px-3">
                      <p className="text-sm">{formatCurrency(item.rate)}</p>
                    </td>
                    <td className="py-4 px-3 font-medium">{formatCurrency(item.amount)}</td>
                    <td className="py-4">
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
                ))}
              </tbody>
            </table>
          </div>

        </div>

        {/* Calculations */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Calculations
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Rate (%)</FormLabel>
                    <FormControl>
                      <InputGroup>
                        <InputGroupAddon>
                          <Percent className="h-4 w-4" />
                        </InputGroupAddon>
                        <InputGroupInput
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0"
                          {...field}
                          onChange={e => handleNumericInput(e, field)}
                        />
                      </InputGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select discount type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Amount (PKR)</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount {discountType === 'percentage' ? '(%)' : '(PKR)'}</FormLabel>
                      <FormControl>
                        <InputGroup>
                          <InputGroupAddon>{discountType === 'percentage' ? '%' : 'PKR'}</InputGroupAddon>
                          <InputGroupInput
                            type="number"
                            step="0.01"
                            min="0"
                            max={discountType === 'percentage' ? '100' : undefined}
                            placeholder="0"
                            {...field}
                            onChange={e => handleNumericInput(e, field)}
                          />
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({taxRate}%):</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Discount {discountType === 'percentage' ? `(${discount}%)` : ''}:
                </span>
                <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
              </div>

              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>

              <div className="border-t pt-3">
                <p className="text-sm text-muted-foreground">Amount in Words:</p>
                <p className="font-medium mt-1">{amountInWords}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes and Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <NotebookTabsIcon className="h-5 w-5" />
              Notes
            </h2>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes here..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Terms & Conditions
            </h2>
            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Add terms and conditions..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="submit" size="lg">
            Preview Quotation
          </Button>
        </div>
      </form>
    </Form>
  );
}
