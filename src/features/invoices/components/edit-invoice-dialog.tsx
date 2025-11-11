'use client';

import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { updateInvoice } from '../actions';
import { Invoice } from '../types';
import { toast } from 'sonner';

const editInvoiceSchema = z.object({
  date: z.date(),
  dueDate: z.date().optional(),
  validUntil: z.date().optional(),
  billingType: z.enum(['wholesale', 'retail']),
  market: z.enum(['newon', 'waymor']),
  notes: z.string().optional(),
  termsAndConditions: z.string().optional()
});

type EditInvoiceFormValues = z.infer<typeof editInvoiceSchema>;

interface EditInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  onSuccess: () => void;
}

export function EditInvoiceDialog({ open, onOpenChange, invoice, onSuccess }: EditInvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditInvoiceFormValues>({
    resolver: zodResolver(editInvoiceSchema),
    defaultValues: {
      date: new Date(invoice.date),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
      validUntil: invoice.validUntil ? new Date(invoice.validUntil) : undefined,
      billingType: invoice.billingType,
      market: invoice.market,
      notes: invoice.notes || '',
      termsAndConditions: invoice.termsAndConditions || ''
    }
  });

  // Reset form when invoice changes
  useEffect(() => {
    form.reset({
      date: new Date(invoice.date),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
      validUntil: invoice.validUntil ? new Date(invoice.validUntil) : undefined,
      billingType: invoice.billingType,
      market: invoice.market,
      notes: invoice.notes || '',
      termsAndConditions: invoice.termsAndConditions || ''
    });
  }, [invoice, form]);

  const onSubmit = async (data: EditInvoiceFormValues) => {
    try {
      setIsSubmitting(true);
      await updateInvoice(invoice.id, {
        date: data.date,
        dueDate: data.dueDate,
        validUntil: data.validUntil,
        billingType: data.billingType,
        market: data.market,
        notes: data.notes,
        termsAndConditions: data.termsAndConditions
      });
      toast.success('Invoice updated successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {invoice.type === 'invoice' ? 'Invoice' : 'Quotation'}</DialogTitle>
          <DialogDescription>Update the details of {invoice.invoiceNumber}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
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

              {invoice.type === 'invoice' && (
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
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
              )}

              {invoice.type === 'quotation' && (
                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Valid Until</FormLabel>
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
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="termsAndConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Terms and conditions..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
