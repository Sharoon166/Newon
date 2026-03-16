'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ExpenseTable } from './expense-table';
import { ExpenseFormDialog } from './expense-form-dialog';
import { ExpenseFilter } from './expense-filter';
import { deleteExpense, getExpense } from '../actions';
import type { Expense, ExpenseCategory, PaginatedExpenses } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Search, Filter } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
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
  expensesData: PaginatedExpenses;
  invoiceExpensesData: PaginatedExpenses;
  projectExpensesData: PaginatedExpenses;
  userId: string;
  activeTab?: string;
}

export function ExpensesPageClient({
  expensesData,
  invoiceExpensesData,
  projectExpensesData,
  userId,
  activeTab
}: ExpensesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(activeTab || 'expenses');

  // Filter states
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>(
    (searchParams.get('category') as ExpenseCategory) || 'all'
  );

  // Category labels for dropdown
  const categoryLabels: Record<ExpenseCategory, string> = {
    materials: 'Materials',
    labor: 'Labor',
    equipment: 'Equipment',
    transport: 'Transport',
    rent: 'Rent',
    utilities: 'Utilities',
    fuel: 'Fuel',
    maintenance: 'Maintenance',
    marketing: 'Marketing',
    'office-supplies': 'Office Supplies',
    'professional-services': 'Professional Services',
    insurance: 'Insurance',
    taxes: 'Taxes',
    salary: 'Salary',
    other: 'Other'
  };

  // Push debounced search to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
      params.set('page', '1');
    } else {
      params.delete('search');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push category filter to URL immediately
  const handleCategoryChange = (value: 'all' | ExpenseCategory) => {
    setCategoryFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set('category', value);
      params.set('page', '1');
    } else {
      params.delete('category');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    setCurrentTab(activeTab || 'expenses');
  }, [activeTab]);

  const handleTabChange = (value: string): void => {
    setCurrentTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    params.set('page', '1'); // Reset to page 1 when switching tabs
    router.push(`/expenses?${params.toString()}`, { scroll: false });
  };

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
      <div className="flex justify-end">
        <ExpenseFilter />
      </div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex sm:items-center justify-between max-sm:flex-col flex-wrap gap-4">
          <InputGroup className="max-w-sm flex-1">
            <InputGroupInput
              placeholder="Search by expense ID, description, vendor..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <InputGroupAddon>
              <Search className="h-4 w-4" />
            </InputGroupAddon>
          </InputGroup>

          <div className="flex items-center gap-2">
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="grow" onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>
      </div>

      <ExpenseTable mode="manual" expensesData={expensesData} onEdit={handleEdit} onDelete={handleDelete} />

      {/* <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="space-y-2">
          <TabsList className="max-sm:flex-col max-sm:w-full max-sm:*:w-full h-full">
            <TabsTrigger value="expenses">Expenses ({expensesData.totalDocs})</TabsTrigger>
            <TabsTrigger value="project-expenses">Project Expenses ({projectExpensesData.totalDocs})</TabsTrigger>
            <TabsTrigger value="invoice-expenses">Invoice Expenses ({invoiceExpensesData.totalDocs})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="expenses" className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">All Expenses</h2>
            <p className="text-sm text-muted-foreground">
              {expensesData.totalDocs} expense{expensesData.totalDocs !== 1 ? 's' : ''} found
            </p>
          </div>
          <ExpenseTable mode="manual" expensesData={expensesData} onEdit={handleEdit} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="project-expenses" className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Project Expenses</h2>
            <p className="text-sm text-muted-foreground">
              {projectExpensesData.totalDocs} expense{projectExpensesData.totalDocs !== 1 ? 's' : ''} from projects
            </p>
          </div>
          <ExpenseTable mode="project" expensesData={projectExpensesData} onEdit={handleEdit} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="invoice-expenses" className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">Invoice Expenses</h2>
            <p className="text-sm text-muted-foreground">
              {invoiceExpensesData.totalDocs} expense{invoiceExpensesData.totalDocs !== 1 ? 's' : ''} from invoices
            </p>
          </div>
          <ExpenseTable mode="invoice" expensesData={invoiceExpensesData} onEdit={handleEdit} onDelete={handleDelete} />
        </TabsContent>
      </Tabs> */}

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
