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
  Banknote,
  FileCheck2,
  Mail,
  Phone,
  Globe,
  MapPin,
  NotebookTabs as NotebookTabsIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatCurrency } from '@/lib/utils';
import useBrandStore from '@/stores/useBrandStore';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { convertToWords } from '../utils';
import { Customer } from '@/features/customers/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ItemVariantDropdown } from './item-variant-dropdown';

const invoiceFormSchema = z.object({
  logo: z.string().optional(),
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
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  date: z.string().min(1, 'Date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  items: z
    .array(
      z.object({
        id: z.string(),
        description: z.string().min(1, 'Description is required'),
        quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
        rate: z.number().min(0, 'Rate must be 0 or greater'),
        amount: z.number().min(0, 'Amount must be 0 or greater')
      })
    )
    .min(1, 'At least one item is required'),
  taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100').default(0),
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  amountInWords: z.string().optional(),
  previousBalance: z.number().min(0, 'Cannot be negative').default(0),
  paid: z.number().min(0, 'Cannot be negative').default(0),
  remainingPayment: z.number().min(0, 'Cannot be negative').default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  paymentDetails: z.object({
    bankName: z.string().min(1, 'Bank name is required'),
    accountNumber: z.string().min(1, 'Account number is required'),
    iban: z.string().min(1, 'IBAN is required')
  })
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export function NewInvoiceForm({
  onPreview,
  customers
}: {
  onPreview: (data: InvoiceFormValues) => void;
  customers: Customer[];
}) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const brand = useBrandStore(state => state.getCurrentBrand());
  const form = useForm<InvoiceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(invoiceFormSchema) as any,
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
        name: 'Sharoon',
        company: 'Dev.co',
        address: 'New Bluearea, Islamabad.',
        city: 'Islamabad',
        state: 'Islamabad',
        zip: '44000',
        email: 'support@dev.co',
        phone: '+92 300 1234567'
      },
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ id: Date.now().toString(), description: 'Item 1', quantity: 10, rate: 100, amount: 1000 }],
      taxRate: 0,
      discount: 0,
      amountInWords: 'Zero Rupees Only',
      previousBalance: 0,
      paid: 0,
      remainingPayment: 0,
      notes: '',
      terms: 'All prices are exclusive of taxes.\nNo shipping charges included in above prices.',
      paymentDetails: {
        bankName: 'BAHL (Bank Al-Habib Ltd.), I-9 Markaz branch, Islamabad.',
        accountNumber: '02470095010759013',
        iban: 'PK62BAHL0247009501075901'
      }
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  const subtotal = form.watch('items').reduce((sum, item) => sum + item.amount, 0);
  const taxRate = form.watch('taxRate');
  const discount = form.watch('discount');
  const taxAmount = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmount - discount;

  // Get form values
  const previousBalance = form.watch('previousBalance') || 0;
  const paid = form.watch('paid') || 0;

  // Calculate remaining balance (total amount - paid)
  const remainingPayment = Math.max(0, total - paid);
  // Calculate grand total (remaining balance + previous balance)
  const grandTotal = remainingPayment + previousBalance;

  // Update form values
  form.setValue('remainingPayment', remainingPayment, { shouldValidate: true });

  // Update amount in words based on grand total
  const amountInWords = `${convertToWords(Math.round(grandTotal))} Rupees Only`;
  form.setValue('amountInWords', amountInWords, { shouldValidate: true });

  const addItem = () => {
    append({
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    });
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(customer => customer.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      form.setValue('client.name', customer.name);
      form.setValue('client.company', customer.company || '');
      form.setValue('client.email', customer.email);
      form.setValue('client.phone', customer.phone || '');
      form.setValue('client.address', customer.address || '');
      form.setValue('client.city', customer.city || '');
      form.setValue('client.state', customer.state || '');
      form.setValue('client.zip', customer.zip || '');
    }
  };

  const onSubmit = (data: InvoiceFormValues) => {
    onPreview(data);
  };

  // Get today's date in YYYY-MM-DD format for the min attribute
  const today = new Date().toISOString().split('T')[0];

  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>, field: { onChange: (value: number) => void }) => {
    const value = e.target.value;
    if (value === '') {
      field.onChange(0);
      return;
    }
    // Remove non-numeric characters except decimal point
    const numericString = value.replace(/[^0-9.]/g, '');
    const numericValue = parseFloat(numericString);
    if (!isNaN(numericValue)) {
      field.onChange(numericValue);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Company Details */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            From
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="company.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
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
              name="company.email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <Mail className="h-4 w-4" />
                    </InputGroupAddon>
                    <InputGroupInput type="email" placeholder="company@example.com" {...field} />
                  </InputGroup>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company.phone"
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
              name="company.website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon>
                        <Globe className="h-4 w-4" />
                      </InputGroupAddon>
                      <InputGroupInput placeholder="www.example.com" {...field} />
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company.address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon>
                        <MapPin className="h-4 w-4" />
                      </InputGroupAddon>
                      <InputGroupInput placeholder="123 Business St." {...field} />
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="company.city"
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
              name="company.state"
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
        </div>

        {/* Client Details */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            To
          </h2>

          <div className="mb-6">
            <Select onValueChange={handleCustomerSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(customer => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} - {customer.company || 'No Company'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCustomer && (
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
                    {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state} {selectedCustomer.zip}
                  </span>
                </p>
              </div>
            </div>
          )}

          {!selectedCustomer && (
            <div className="bg-gray-50 border-2 border-dashed rounded-lg p-8 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a customer to display their information</p>
            </div>
          )}
        </div>

        {/* Invoice Details */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField
              control={form.control}
              name="invoiceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice #</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon>#</InputGroupAddon>
                      <InputGroupInput placeholder="INV-1001" {...field} />
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
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
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
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Invoice Items */}
        <div className="border rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Items
            </h2>
          </div>

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
                {fields.map((item, index) => (
                  <tr key={item.id} className="group *:px-2">
                    <td className="p-3 text-sm">{index + 1}.</td>
                    <td className="py-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <ItemVariantDropdown
                                value={field.value}
                                onChange={field.onChange}
                                onVariantSelect={variant => {
                                  // Update the item with variant details
                                  form.setValue(`items.${index}.description`, variant.description);
                                  form.setValue(`items.${index}.rate`, variant.retailPrice || 0);
                                  // Update amount when rate changes
                                  const quantity = form.getValues(`items.${index}.quantity`) || 1;
                                  form.setValue(`items.${index}.amount`, quantity * (variant.retailPrice || 0));
                                }}
                                placeholder="Start typing to search items..."
                                className="bg-background"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="py-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                className="text-right w-22"
                                {...field}
                                onChange={e => {
                                  const value = parseFloat(e.target.value) || 0;
                                  field.onChange(value);
                                  // Update amount when quantity changes
                                  const rate = form.getValues(`items.${index}.rate`) || 0;
                                  form.setValue(`items.${index}.amount`, value * rate);
                                }}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="py-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.rate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <InputGroup className="justify-end">
                                <InputGroupInput
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="text-right w-32"
                                  {...field}
                                  onChange={e => {
                                    const value = parseFloat(e.target.value) || 0;
                                    field.onChange(value);
                                    // Update amount when rate changes
                                    const quantity = form.getValues(`items.${index}.quantity`) || 0;
                                    form.setValue(`items.${index}.amount`, quantity * value);
                                  }}
                                />
                              </InputGroup>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </td>
                    <td className="py-3 text-right text-sm">
                      <div className="h-10 flex items-center justify-end pr-2">
                        {formatCurrency(form.watch(`items.${index}.amount`) || 0)}
                      </div>
                    </td>
                    <td className="py-3">
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pt-4 flex justify-center">
            <Button type="button" variant="secondary" size="sm" className="gap-2 w-full max-w-sm" onClick={addItem}>
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>

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
                              onChange={e => handleNumericInput(e, field)}
                              value={field.value || ''}
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
                    name="discount"
                    render={({ field }) => (
                      <FormItem className="w-20">
                        <FormControl>
                          <InputGroup>
                            <InputGroupAddon>Rs</InputGroupAddon>
                            <InputGroupInput
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              className="h-8 text-sm"
                              onChange={e => handleNumericInput(e, field)}
                              value={field.value || ''}
                            />
                          </InputGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <span className="font-medium">- {formatCurrency(discount)}</span>
              </div>

              {/* Additional fields from original design */}
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
                                onChange={e => handleNumericInput(e, field)}
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
                                onChange={e => handleNumericInput(e, field)}
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

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 font-semibold">
                  <NotebookTabsIcon className="h-4 w-4" />
                  Notes
                </FormLabel>
                <FormControl>
                  <Textarea className="min-h-[100px]" placeholder="Additional notes or terms" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 font-semibold">
                  <FileCheck2 className="h-4 w-4" />
                  Terms & Conditions
                </FormLabel>
                <FormControl>
                  <Textarea className="min-h-[100px]" placeholder="Payment terms and conditions" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Payment Details */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Payment Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="paymentDetails.bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon>
                        <Building2 className="h-4 w-4" />
                      </InputGroupAddon>
                      <InputGroupInput placeholder="Bank Name" {...field} />
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDetails.accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon>#</InputGroupAddon>
                      <InputGroupInput placeholder="1234 5678 9012 3456" {...field} />
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDetails.iban"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>IBAN</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon>IBAN</InputGroupAddon>
                      <InputGroupInput placeholder="PK36 SCBL 0000 0011 2345 6702" {...field} />
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4 mt-8">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => form.reset()}>
            Reset Form
          </Button>
          <Button type="submit" className="w-full sm:w-auto">
            Preview Invoice
          </Button>
        </div>
      </form>
    </Form>
  );
}
