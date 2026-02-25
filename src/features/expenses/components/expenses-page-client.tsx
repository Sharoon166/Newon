'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ExpenseTable } from './expense-table';
import { ExpenseFormDialog } from './expense-form-dialog';
import { ExpenseFilter } from './expense-filter';
import { deleteExpense, getExpense } from '../actions';
import type { Expense } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface ExpensesPageClientProps {
  expenses: Expense[];
  invoiceExpenses: Expense[];
  userId: string;
}

export function ExpensesPageClient({
  expenses,
  invoiceExpenses,
  userId
}: ExpensesPageClientProps) {
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

  const handleEdit = async (expenseId: string): Promise<void> => {
    const result = await getExpense(expenseId);
    if (result.success) {
      if (result.data.source === 'invoice') {
        toast.error('Cannot edit expense from invoice. Please edit the invoice instead.');
        return;
      }
      setSelectedExpense(result.data);
      setIsFormOpen(true);
    } else {
      toast.error('Failed to load expense');
    }
  };

  const handleDelete = (expenseId: string): void => {
    setExpenseToDelete(expenseId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!expenseToDelete) return;

    const result = await deleteExpense(expenseToDelete);
    if (result.success) {
      toast.success('Expense deleted successfully');
      router.refresh();
    } else {
      toast.error(result.error);
    }

    setDeleteDialogOpen(false);
    setExpenseToDelete(null);
  };

  const handleSuccess = (): void => {
    router.refresh();
  };

  const handleOpenChange = (open: boolean): void => {
    setIsFormOpen(open);
    if (!open) {
      setSelectedExpense(undefined);
    }
  };

  return (
    <>
      <Tabs defaultValue="expenses" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="invoice-expenses">Invoice Expenses</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <ExpenseFilter />
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>

        <TabsContent value="expenses" className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">All Expenses</h2>
            <p className="text-sm text-muted-foreground">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <ExpenseTable data={expenses} onEdit={handleEdit} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="invoice-expenses" className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Invoice Expenses</h2>
            <p className="text-sm text-muted-foreground">
              {invoiceExpenses.length} expense{invoiceExpenses.length !== 1 ? 's' : ''} from
              invoices
            </p>
          </div>
          <ExpenseTable data={invoiceExpenses} onEdit={handleEdit} onDelete={handleDelete} />
        </TabsContent>
      </Tabs>

      <ExpenseFormDialog
        open={isFormOpen}
        onOpenChange={handleOpenChange}
        expense={selectedExpense}
        userId={userId}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
