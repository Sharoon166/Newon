'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, Receipt } from 'lucide-react';
import { ExpensesTableWithPayments } from './expenses-table-with-payments';
import { AddExpenseDialog } from './add-expense-dialog';
import type { EnrichedExpense } from '../types';

interface ProjectExpensesSectionProps {
  enrichedExpenses: EnrichedExpense[];
  projectId: string;
  projectStatus: string;
  userId: string;
  userRole: string;
  canEdit: boolean;
  canAddExpense: boolean;
}

export function ProjectExpensesSection({
  enrichedExpenses,
  projectId,
  projectStatus,
  userId,
  userRole,
  canEdit,
  canAddExpense
}: ProjectExpensesSectionProps) {
  const router = useRouter();
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  const handleRefresh = () => {
    router.refresh();
  };

  const canAddExpenseNow =
    canAddExpense && (projectStatus === 'planning' || projectStatus === 'active' || projectStatus === 'on-hold');

  return (
    <>
      <div className="space-y-4 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-8">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold">Project Expenses</h3>
            <p className="text-sm text-muted-foreground">View and manage all project expenses and payments</p>
          </div>
          {canAddExpenseNow && (
            <Button onClick={() => setExpenseDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          )}
        </div>
        {enrichedExpenses.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-muted-foreground mb-4">No expenses recorded yet</p>
            {canAddExpenseNow && (
              <Button onClick={() => setExpenseDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Expense
              </Button>
            )}
          </div>
        ) : (
          <ExpensesTableWithPayments
            data={enrichedExpenses}
            projectId={projectId}
            userId={userId}
            userRole={userRole}
            canDelete={canEdit}
            onRefresh={handleRefresh}
          />
        )}
      </div>

      {canAddExpenseNow && (
        <AddExpenseDialog
          open={expenseDialogOpen}
          onOpenChange={setExpenseDialogOpen}
          projectId={projectId}
          userId={userId}
          userRole={userRole}
          onSuccess={handleRefresh}
        />
      )}
    </>
  );
}
