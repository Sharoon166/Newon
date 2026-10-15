'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  method: z.enum(['cash', 'bank_transfer', 'online', 'cheque', 'upi']),
  date: z.date(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

type PaymentFormValues = z.infer<typeof paymentSchema>;
type PaymentMethod = PaymentFormValues['method'];

export interface PaymentRow {
  _id?: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  reference?: string;
  notes?: string;
}

interface PurchasePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseId: string;
  purchaseLabel?: string;
  /** Amount owed for the purchase (totalCost - shipping excluded). */
  amountDue: number;
  /** Payments loaded by the parent when the dialog was opened. */
  initialPayments: PaymentRow[];
  /** Server actions injected to avoid coupling the dialog to a specific feature. */
  getPayments: (purchaseId: string) => Promise<PaymentRow[]>;
  addPayment: (
    purchaseId: string,
    payment: { amount: number; method: PaymentMethod; date: Date; reference?: string; notes?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  deletePayment: (
    purchaseId: string,
    paymentIndex: number
  ) => Promise<{ success: boolean; error?: string }>;
  onSuccess: () => void;
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  online: 'Online Payment',
  cheque: 'Cheque',
  upi: 'UPI'
};

export function PurchasePaymentDialog({
  open,
  onOpenChange,
  purchaseId,
  purchaseLabel,
  amountDue,
  initialPayments,
  getPayments,
  addPayment,
  deletePayment,
  onSuccess
}: PurchasePaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // Derive the balance from the locally tracked payments so the dialog stays
  // accurate immediately after a payment is added or removed.
  const paidTotal = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balanceAmount = Math.max(0, amountDue - paidTotal);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: balanceAmount,
      method: 'cash',
      date: new Date(),
      reference: '',
      notes: ''
    }
  });

  const refreshPayments = async () => {
    const data = await getPayments(purchaseId);
    setPayments(data as PaymentRow[]);
  };

  const onSubmit = async (data: PaymentFormValues) => {
    if (data.amount > balanceAmount) {
      form.setError('amount', {
        type: 'validate',
        message: `Amount cannot exceed the outstanding balance (${formatCurrency(balanceAmount)})`
      });
      return;
    }
    try {
      setIsSubmitting(true);
      const result = await addPayment(purchaseId, data);
      if (!result.success) {
        toast.error(result.error || 'Failed to add payment');
        return;
      }
      toast.success('Payment recorded successfully');
      await refreshPayments();
      form.reset({
        amount: Math.max(0, balanceAmount - data.amount),
        method: 'cash',
        date: new Date(),
        reference: '',
        notes: ''
      });
      onSuccess();
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error((error as Error).message || 'Failed to add payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (index: number) => {
    try {
      setDeletingIndex(index);
      const result = await deletePayment(purchaseId, index);
      if (!result.success) {
        toast.error(result.error || 'Failed to delete payment');
        return;
      }
      toast.success('Payment deleted successfully');
      await refreshPayments();
      onSuccess();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error((error as Error).message || 'Failed to delete payment');
    } finally {
      setDeletingIndex(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment History</DialogTitle>
          <DialogDescription>
            {purchaseLabel ? `Purchase ${purchaseLabel}. ` : ''}
            Amount due {formatCurrency(amountDue)} · Paid {formatCurrency(paidTotal)} · Balance{' '}
            {formatCurrency(balanceAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Recorded Payments</h4>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            ) : (
              <div className="rounded-md border divide-y">
                {payments.map((payment, index) => (
                  <div key={payment._id || index} className="flex items-center justify-between gap-3 p-2.5">
                    <div className="min-w-0">
                      <div className="font-medium">{formatCurrency(payment.amount)}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {METHOD_LABELS[payment.method] || payment.method} · {formatDate(payment.date)}
                        {payment.reference ? ` · ${payment.reference}` : ''}
                      </div>
                      {payment.notes && <div className="text-xs text-muted-foreground truncate">{payment.notes}</div>}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(index)}
                      disabled={deletingIndex === index}
                      title="Delete payment"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {balanceAmount > 0 && (
            <>
              <Separator />
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <h4 className="text-sm font-medium">Add Payment</h4>
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
                            max={balanceAmount}
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
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select payment method" />
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
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
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
                        <FormLabel>Reference Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Transaction ID, Cheque number, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional notes about this payment..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                      Close
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Adding...' : 'Add Payment'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}

          {balanceAmount <= 0 && (
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
