import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/general/page-header';
import { getExpenses, getExpenseKPIs, getInvoiceExpenses } from '@/features/expenses/actions';
import { ExpensesPageClient } from '@/features/expenses/components/expenses-page-client';
import { requireAuth } from '@/lib/auth-utils';
import { ExpenseKPIsComponent } from '@/features/expenses/components/expense-kpis';

export default async function ExpensesPage({
  searchParams
}: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 10;

  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
  const dateTo = params.dateTo ? new Date(params.dateTo) : undefined;

  const [expensesResult, invoiceExpensesResult, kpis] = await Promise.all([
    getExpenses({ page, limit, dateFrom, dateTo }),
    getInvoiceExpenses({ page, limit, dateFrom, dateTo }),
    getExpenseKPIs({ dateFrom, dateTo })
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Receipt className="size-8" />}
        title="Expense Management"
        description="Track and manage business expenses"
      />

      <ExpenseKPIsComponent kpis={kpis} />
      
      <ExpensesPageClient
        expenses={expensesResult.docs}
        invoiceExpenses={invoiceExpensesResult.docs}
        userId={session.user.id}
      />
    </div>
  );
}
