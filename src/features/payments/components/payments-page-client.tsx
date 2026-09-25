'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronDown, ChevronRight, Coins, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { Customer } from '@/features/customers/types';
import { GeneralPayment, OpenInvoice } from '../types';
import {
  allocateFromUnallocated,
  createGeneralPayment,
  deleteGeneralPayment,
  getGeneralPayments,
  getOpenInvoicesForCustomer
} from '../actions';

const paymentSchema = z.object({
  customerId: z.string().min(1, 'Select a customer'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  method: z.enum(['cash', 'bank_transfer', 'online', 'cheque', 'upi']),
  date: z.date(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

const methodConfig: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
  cash: { variant: 'default', label: 'Cash' },
  bank_transfer: { variant: 'secondary', label: 'Bank Transfer' },
  online: { variant: 'outline', label: 'Online' },
  cheque: { variant: 'secondary', label: 'Cheque' },
  upi: { variant: 'default', label: 'UPI' }
};

interface PaymentsPageClientProps {
  customers: Customer[];
  initialPayments: GeneralPayment[];
  userRole?: 'admin' | 'staff';
}

export function PaymentsPageClient({ customers, initialPayments }: PaymentsPageClientProps) {
  const [payments, setPayments] = useState<GeneralPayment[]>(initialPayments);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoice[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GeneralPayment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
  const [allocatingGP, setAllocatingGP] = useState<GeneralPayment | null>(null);
  const [allocInvoices, setAllocInvoices] = useState<OpenInvoice[]>([]);
  const [allocInputs, setAllocInputs] = useState<Record<string, number>>({});
  const [isAllocating, setIsAllocating] = useState(false);
  const [loadingAllocInvoices, setLoadingAllocInvoices] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customerId: '',
      amount: 0,
      method: 'cash',
      date: new Date(),
      reference: '',
      notes: ''
    }
  });

  const selectedCustomerId = form.watch('customerId');
  const amount = form.watch('amount');

  useEffect(() => {
    if (!selectedCustomerId) return;
    setLoadingInvoices(true);
    setAllocations({});
    getOpenInvoicesForCustomer(selectedCustomerId)
      .then(invoices => {
        setOpenInvoices(invoices);
        setActiveCustomerId(selectedCustomerId);
        // Default allocate the full balance of each open invoice (0 by default to let user decide)
        const initial: Record<string, number> = {};
        invoices.forEach(inv => {
          initial[inv.id] = 0;
        });
        setAllocations(initial);
      })
      .catch(err => {
        console.error('Error loading open invoices:', err);
        toast.error('Failed to load open invoices');
      })
      .finally(() => setLoadingInvoices(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId]);

  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((sum, v) => sum + (v || 0), 0);
  }, [allocations]);

  const unallocated = Math.max(0, (amount || 0) - totalAllocated);

  // Strict cap: a payment can never exceed what the customer actually owes,
  // which is the sum of the balances on their open invoices.
  const outstandingIsCurrent = !loadingInvoices && activeCustomerId === selectedCustomerId;
  const totalOutstanding = useMemo(
    () => openInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0),
    [openInvoices]
  );
  const exceedsOutstanding = outstandingIsCurrent && (amount || 0) > totalOutstanding;

  const handleAllocationChange = (invoiceId: string, value: string) => {
    const amt = parseFloat(value) || 0;
    setAllocations(prev => ({ ...prev, [invoiceId]: amt }));
  };

  const handleQuickAllocate = (invoice: OpenInvoice) => {
    setAllocations(prev => ({
      ...prev,
      [invoice.id]: Math.min(invoice.balanceAmount, Math.max(0, (amount || 0) - totalAllocated + (prev[invoice.id] || 0)))
    }));
  };

  const onSubmit = async (data: PaymentFormValues) => {
    // Build allocations from the current allocation map, only include > 0
    const allocList = Object.entries(allocations)
      .filter(([, amt]) => amt > 0)
      .map(([invoiceId, amt]) => {
        const invoice = openInvoices.find(inv => inv.id === invoiceId);
        return {
          invoiceId,
          invoiceNumber: invoice?.invoiceNumber || 'Unknown',
          amount: amt
        };
      });

    const totalAlloc = allocList.reduce((sum, a) => sum + a.amount, 0);

    if (totalAlloc > data.amount) {
      toast.error('Allocated amount cannot exceed total payment amount');
      return;
    }

    if (data.amount <= 0) {
      toast.error('Enter a payment amount greater than 0');
      return;
    }

    const selectedCustomer = customers.find(c => c.customerId === data.customerId);

    // Strict cap — never record more than the customer owes.
    if (outstandingIsCurrent && data.amount > totalOutstanding) {
      const message = `Amount ${formatCurrency(data.amount)} exceeds ${
        selectedCustomer?.name || 'this customer'
      }'s outstanding balance of ${formatCurrency(totalOutstanding)}`;
      form.setError('amount', { type: 'validate', message });
      toast.error(message);
      return;
    }

    // An allocation can never exceed the balance of the invoice it targets.
    const overAllocated = allocList.find(a => {
      const inv = openInvoices.find(i => i.id === a.invoiceId);
      return inv && a.amount > inv.balanceAmount;
    });
    if (overAllocated) {
      toast.error(
        `Allocation of ${formatCurrency(overAllocated.amount)} for ${overAllocated.invoiceNumber} exceeds that invoice's balance`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await createGeneralPayment({
        customerId: data.customerId,
        customerName: selectedCustomer?.name || '',
        customerCompany: selectedCustomer?.company,
        date: data.date,
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        notes: data.notes,
        allocations: allocList
      });
      toast.success('Payment recorded successfully');
      form.reset({ customerId: '', amount: 0, method: 'cash', date: new Date(), reference: '', notes: '' });
      setAllocations({});
      setOpenInvoices([]);
      setActiveCustomerId(null);
      // Refresh the list
      const result = await getGeneralPayments({ limit: 50 });
      setPayments(result.docs);
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error((error as Error).message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteGeneralPayment(deleteTarget.id || '');
      toast.success('Payment deleted');
      setDeleteTarget(null);
      setAllocatingGP(null);
      const result = await getGeneralPayments({ limit: 50 });
      setPayments(result.docs);
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error((error as Error).message || 'Failed to delete payment');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (d: string | Date) => {
    try {
      return format(new Date(d), 'MMM dd, yyyy');
    } catch {
      return '-';
    }
  };

  const toggleExpanded = (paymentId: string) => {
    setExpandedPayments(prev => {
      const next = new Set(prev);
      if (next.has(paymentId)) {
        next.delete(paymentId);
      } else {
        next.add(paymentId);
      }
      return next;
    });
  };

  // Fetch open invoices when allocation form opens for a GP
  useEffect(() => {
    if (!allocatingGP) {
      setAllocInvoices([]);
      setAllocInputs({});
      return;
    }
    setLoadingAllocInvoices(true);
    getOpenInvoicesForCustomer(allocatingGP.customerId)
      .then(invoices => {
        setAllocInvoices(invoices);
        const initial: Record<string, number> = {};
        invoices.forEach(inv => { initial[inv.id] = 0; });
        setAllocInputs(initial);
      })
      .catch(err => {
        console.error('Error loading open invoices for allocation:', err);
        toast.error('Failed to load open invoices');
      })
      .finally(() => setLoadingAllocInvoices(false));
  }, [allocatingGP]);

  const handleAllocInputChange = (invoiceId: string, value: string) => {
    const amt = parseFloat(value) || 0;
    setAllocInputs(prev => ({ ...prev, [invoiceId]: amt }));
  };

  const totalNewAlloc = useMemo(() => Object.values(allocInputs).reduce((sum, v) => sum + (v || 0), 0), [allocInputs]);

  const handleAllocSubmit = async (gp: GeneralPayment) => {
    const allocList = Object.entries(allocInputs)
      .filter(([, amt]) => amt > 0)
      .map(([invoiceId, amt]) => {
        const inv = allocInvoices.find(i => i.id === invoiceId);
        return { invoiceId, invoiceNumber: inv?.invoiceNumber || 'Unknown', amount: amt };
      });

    if (allocList.length === 0) {
      toast.error('Enter an allocation amount for at least one invoice');
      return;
    }
    if (totalNewAlloc > (gp.unallocatedAmount || 0)) {
      toast.error('Cannot allocate more than the unallocated amount');
      return;
    }

    // An allocation can never exceed the balance of the invoice it targets.
    const overAllocated = allocList.find(a => {
      const inv = allocInvoices.find(i => i.id === a.invoiceId);
      return inv !== undefined && a.amount > inv.balanceAmount;
    });
    if (overAllocated) {
      toast.error(
        `Allocation of ${formatCurrency(overAllocated.amount)} for ${overAllocated.invoiceNumber} exceeds that invoice's balance`
      );
      return;
    }

    try {
      setIsAllocating(true);
      await allocateFromUnallocated(gp.id || '', allocList);
      toast.success(`Allocated ${formatCurrency(totalNewAlloc)} to ${allocList.length} invoice${allocList.length === 1 ? '' : 's'}`);
      setAllocatingGP(null);
      // Refresh list
      const result = await getGeneralPayments({ limit: 50 });
      setPayments(result.docs);
    } catch (error) {
      console.error('Error allocating:', error);
      toast.error((error as Error).message || 'Failed to allocate');
    } finally {
      setIsAllocating(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <Tabs defaultValue="record">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="record">Record Payment</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="record" className="mt-6 *:*:px-0 *:border-none">
          <Card>
            <CardHeader>
              <CardTitle>Record Payment Received</CardTitle>
              <CardDescription>
                Record a payment received from a customer and allocate it against open invoices. Amounts are capped at
                what the customer owes — anything left unallocated stays as a credit against their balance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map(customer => (
                                <SelectItem key={customer.customerId || customer.id} value={customer.customerId || customer.id}>
                                  {customer.name}
                                  {customer.company ? ` (${customer.company})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (PKR)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              max={outstandingIsCurrent ? totalOutstanding : undefined}
                              placeholder="0.00"
                              value={field.value || ''}
                              onChange={e => {
                                const value = e.target.value;
                                field.onChange(value === '' ? 0 : parseFloat(value) || 0);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                          {outstandingIsCurrent && (
                            <p
                              className={cn(
                                'text-xs',
                                exceedsOutstanding || totalOutstanding === 0
                                  ? 'font-medium text-destructive'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {totalOutstanding === 0
                                ? 'Nothing outstanding — a payment can only be recorded up to what the customer owes.'
                                : exceedsOutstanding
                                  ? `Exceeds outstanding — max recordable is ${formatCurrency(totalOutstanding)}.`
                                  : `Outstanding: ${formatCurrency(totalOutstanding)}`}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="online">Online Payment</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Payment Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                                >
                                  {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Cheque #, Txn ID..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Notes about this payment..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  {/* Allocation section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3>Allocate to Invoices</h3>
                        <p className="text-xs text-muted-foreground">
                          Assign portions of this payment to the customer&apos;s open invoices.
                        </p>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        Unallocated: {formatCurrency(unallocated)}
                      </Badge>
                    </div>

                    {loadingInvoices ? (
                      <div className="text-sm text-muted-foreground py-4">Loading open invoices...</div>
                    ) : selectedCustomerId && openInvoices.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4">
                        No open invoices for this customer. Payment will be recorded as unallocated (advance).
                      </div>
                    ) : !selectedCustomerId ? (
                      <div className="text-sm text-muted-foreground py-4">
                        Select a customer to see their open invoices for allocation.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                            <TableHead className="text-right">Allocated Amount</TableHead>
                            <TableHead className="text-right">Balance After</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {openInvoices.map(invoice => {
                            const alloc = allocations[invoice.id] || 0;
                            const after = Math.max(0, invoice.balanceAmount - alloc);
                            return (
                              <TableRow key={invoice.id}>
                                <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(invoice.balanceAmount)}</TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    max={invoice.balanceAmount}
                                    className="w-32 ml-auto text-right"
                                    value={alloc || ''}
                                    placeholder="0.00"
                                    onChange={e => handleAllocationChange(invoice.id, e.target.value)}
                                  />
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">{formatCurrency(after)}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleQuickAllocate(invoice)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Allocate
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}

                    {selectedCustomerId && totalAllocated > 0 && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span>
                          <span className="text-muted-foreground">Total Paid:</span>{' '}
                          <span className="font-medium">{formatCurrency(amount || 0)}</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">Allocated:</span>{' '}
                          <span className="font-medium">{formatCurrency(totalAllocated)}</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">Unallocated:</span>{' '}
                          <span className="font-medium text-amber-600">{formatCurrency(unallocated)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset();
                        setAllocations({});
                        setOpenInvoices([]);
                        setActiveCustomerId(null);
                      }}
                      disabled={isSubmitting}
                    >
                      Clear
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !amount || exceedsOutstanding || loadingInvoices}
                    >
                      {isSubmitting ? 'Recording...' : 'Record Payment'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6 *:*:px-0 *:border-none">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All general payments received from customers.</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payments recorded yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Allocated</TableHead>
                        <TableHead className="text-right">Unallocated</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map(payment => {
                        const cfg = methodConfig[payment.method] || methodConfig.cash;
                        const paymentId = payment.id || payment.paymentNumber;
                        const isExpanded = expandedPayments.has(paymentId);
                        const allocations = payment.allocations || [];
                        return (
                          <Fragment key={paymentId}>
                            <TableRow>
                              <TableCell className="font-mono">
                                <div className="flex items-center gap-1.5">
                                  {allocations.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={() => toggleExpanded(paymentId)}
                                      title={isExpanded ? 'Hide allocated invoices' : 'Show allocated invoices'}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </Button>
                                  )}
                                  {payment.paymentNumber}
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(payment.date)}</TableCell>
                              <TableCell>
                                <div className="font-medium">{payment.customerName}</div>
                                {payment.customerCompany && (
                                  <div className="text-xs text-muted-foreground">{payment.customerCompany}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                              <TableCell>
                                <Badge variant={cfg.variant}>{cfg.label}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(payment.allocatedAmount || 0)}</TableCell>
                              <TableCell className="text-right text-amber-600">
                                {formatCurrency(payment.unallocatedAmount || 0)}
                              </TableCell>
                              <TableCell>{payment.reference || '-'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {(payment.unallocatedAmount || 0) > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setAllocatingGP(allocatingGP?.id === payment.id ? null : payment)}
                                      title="Allocate unallocated amount"
                                    >
                                      <Coins className="h-4 w-4 text-primary" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteTarget(payment)}
                                    title="Delete payment"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {allocatingGP?.id === payment.id && (
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={9} className="py-3">
                                  <div className="pl-8 pr-2 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="text-sm font-medium">
                                          Allocate unallocated: {formatCurrency(payment.unallocatedAmount || 0)}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                          Assign portions to open invoices. Remaining stays as advance.
                                        </p>
                                      </div>
                                      <Badge variant="secondary" className="font-mono">
                                        Available: {formatCurrency((payment.unallocatedAmount || 0) - totalNewAlloc)}
                                      </Badge>
                                    </div>
                                    {loadingAllocInvoices ? (
                                      <div className="text-sm text-muted-foreground py-2">Loading open invoices...</div>
                                    ) : allocInvoices.length === 0 ? (
                                      <div className="text-sm text-muted-foreground py-2">No open invoices for this customer</div>
                                    ) : (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Invoice #</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                            <TableHead className="text-right">Allocate</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {allocInvoices.map(inv => (
                                            <TableRow key={inv.id}>
                                              <TableCell className="font-mono">{inv.invoiceNumber}</TableCell>
                                              <TableCell className="text-right">{formatCurrency(inv.balanceAmount)}</TableCell>
                                              <TableCell className="text-right">
                                                <Input
                                                  type="number"
                                                  step="0.01"
                                                  min={0}
                                                  max={Math.min(inv.balanceAmount, (payment.unallocatedAmount || 0) - totalNewAlloc + (allocInputs[inv.id] || 0))}
                                                  className="w-32 ml-auto text-right"
                                                  value={allocInputs[inv.id] || ''}
                                                  placeholder="0.00"
                                                  onChange={e => handleAllocInputChange(inv.id, e.target.value)}
                                                />
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    )}
                                    <div className="flex justify-end gap-2 pt-1">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAllocatingGP(null)}
                                        disabled={isAllocating}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleAllocSubmit(payment)}
                                        disabled={isAllocating || totalNewAlloc <= 0 || totalNewAlloc > (payment.unallocatedAmount || 0)}
                                      >
                                        {isAllocating ? 'Allocating...' : `Allocate ${formatCurrency(totalNewAlloc)}`}
                                      </Button>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                            {isExpanded && (
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={9} className="py-2">
                                  <div className="pl-8 pr-2 py-1.5 space-y-1.5">
                                    <div className="text-xs text-muted-foreground">
                                      Allocated to {allocations.length} invoice
                                      {allocations.length === 1 ? '' : 's'}:
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {allocations.map(allocation => (
                                        <Link
                                          key={allocation.invoiceId}
                                          href={`/invoices/${allocation.invoiceId}`}
                                          className="inline-flex"
                                        >
                                          <Button variant="outline" size="sm" className="h-7 gap-1.5 font-mono">
                                            {allocation.invoiceNumber}
                                            <span className="font-normal text-muted-foreground">
                                              {formatCurrency(allocation.amount)}
                                            </span>
                                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                          </Button>
                                        </Link>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Payment"
        description={`Delete payment ${deleteTarget?.paymentNumber}? This will reverse allocations on invoices and refund the customer balance.`}
        confirmText="Delete"
        variant="destructive"
        isProcessing={isDeleting}
      />
    </div>
  );
}