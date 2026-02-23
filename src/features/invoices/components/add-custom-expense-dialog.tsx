'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import type { ExpenseCategory } from '@/features/expenses/types';
import { EXPENSE_CATEGORIES } from '@/features/expenses/types';

const customExpenseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  actualCost: z.number().min(0, 'Actual cost must be 0 or greater'),
  clientCost: z.number().min(0, 'Client cost must be 0 or greater'),
  category: z.enum([
    'materials',
    'labor',
    'equipment',
    'transport',
    'rent',
    'utilities',
    'fuel',
    'maintenance',
    'marketing',
    'office-supplies',
    'professional-services',
    'insurance',
    'taxes',
    'other'
  ]),
  description: z.string().optional()
});

type CustomExpenseFormValues = z.infer<typeof customExpenseSchema>;

interface AddCustomExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (expense: CustomExpenseFormValues) => void;
}

export function AddCustomExpenseDialog({ open, onOpenChange, onAdd }: AddCustomExpenseDialogProps) {
  const form = useForm<CustomExpenseFormValues>({
    resolver: zodResolver(customExpenseSchema),
    defaultValues: {
      name: '',
      actualCost: 0,
      clientCost: 0,
      category: 'other',
      description: ''
    }
  });

  const actualCost = form.watch('actualCost');
  const clientCost = form.watch('clientCost');

  // Calculate profit margin whenever costs change
  const calculateProfitMargin = (actual: number, client: number): number => {
    if (actual === 0) return client > 0 ? 100 : 0;
    return ((client - actual) / actual) * 100;
  };

  const profitMargin = calculateProfitMargin(actualCost, clientCost);

  const onSubmit = (data: CustomExpenseFormValues): void => {
    onAdd(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Custom Expense</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Installation Labor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="actualCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Actual Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={field.value || ''}
                        onChange={e => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                        onFocus={e => {
                          if (e.target.value === '0') {
                            e.target.select();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Cost</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={field.value || ''}
                        onChange={e => {
                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                        onFocus={e => {
                          if (e.target.value === '0') {
                            e.target.select();
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(actualCost > 0 || clientCost > 0) && (
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual Cost:</span>
                  <span className="font-medium">{formatCurrency(actualCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Client Cost:</span>
                  <span className="font-medium">{formatCurrency(clientCost)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Profit:</span>
                  <span className="font-medium">{formatCurrency(clientCost - actualCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Margin:</span>
                  <span
                    className={`font-medium ${
                      profitMargin >= 20
                        ? 'text-green-600'
                        : profitMargin >= 10
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}
                  >
                    {profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional details..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit(onSubmit)();
              }}>
                Add Expense
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
