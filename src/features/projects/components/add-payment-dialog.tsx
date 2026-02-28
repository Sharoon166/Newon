'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { addPaymentTransaction, getProjectExpenseWithTransactions } from '../actions';
import { AddPaymentTransactionDto } from '../types';
import { toast } from 'sonner';

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string;
  userId: string;
  onSuccess?: () => void;
}

export function AddPaymentDialog({
  open,
  onOpenChange,
  expenseId,
  userId,
  onSuccess
}: AddPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm({
    defaultValues: {
      amount: 0,
      source: 'cash' as 'cash' | 'jazzcash' | 'easypaisa' | 'bank-transfer' | 'cheque' | 'other',
      notes: ''
    }
  });

  const source = watch('source');

  // Load expense details when dialog opens
  useEffect(() => {
    if (open && expenseId) {
      setIsLoading(true);
      getProjectExpenseWithTransactions(expenseId)
        .then(details => {
          if (details) {
            setRemainingAmount(details.remainingAmount);
            setValue('amount', details.remainingAmount);
          }
        })
        .catch(error => {
          console.error('Failed to load expense details:', error);
          toast.error('Failed to load expense details');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, expenseId, setValue]);

  const onSubmit = async (data: {
    amount: number;
    source: 'cash' | 'jazzcash' | 'easypaisa' | 'bank-transfer' | 'cheque' | 'other';
    notes: string;
  }) => {
    if (!paymentDate) {
      toast.error('Please select a payment date');
      return;
    }

    if (data.amount > remainingAmount) {
      toast.error(`Payment amount cannot exceed remaining amount (${formatCurrency(remainingAmount)})`);
      return;
    }

    try {
      setIsSubmitting(true);

      const paymentData: AddPaymentTransactionDto = {
        amount: Number(data.amount),
        date: paymentDate,
        source: data.source,
        notes: data.notes || undefined,
        addedBy: userId
      };

      await addPaymentTransaction(expenseId, paymentData);
      toast.success('Payment added successfully');
      reset();
      setPaymentDate(new Date());
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add payment';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            Record a payment transaction for this expense.
            {!isLoading && ` Remaining: ${formatCurrency(remainingAmount)}`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' },
                  max: { value: remainingAmount, message: `Amount cannot exceed ${formatCurrency(remainingAmount)}` }
                })}
                placeholder="0.00"
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">
                Payment Source <span className="text-destructive">*</span>
              </Label>
              <Select value={source} onValueChange={value => setValue('source', value as typeof source)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="jazzcash">JazzCash</SelectItem>
                  <SelectItem value="easypaisa">Easypaisa</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                Payment Date <span className="text-destructive">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !paymentDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? format(paymentDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={paymentDate} onSelect={setPaymentDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea id="notes" {...register('notes')} placeholder="Payment notes or reference" rows={3} />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Payment
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
