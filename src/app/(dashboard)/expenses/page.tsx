import { Receipt } from 'lucide-react';
import { PageHeader } from '@/components/general/page-header';
import { getExpenses, getExpenseKPIs, getInvoiceExpenses, getProjectExpenses } from '@/features/expenses/actions';
import { ExpensesPageClient } from '@/features/expenses/components/expenses-page-client';
import { requirePermission } from '@/lib/auth-utils';
import { ExpenseKPIsComponent } from '@/features/expenses/components/expense-kpis';
import { ExpenseCategory, PaginatedExpenses } from '@/features/expenses/types';

// What staff receive for the tabs/KPIs they can't use. Using an explicit empty
// payload avoids fetching project/invoice expense data at all — invoice
// expenses in particular carry actualCost/clientCost (cost & margin data),
// and we don't want that in the RSC payload of a staff visit.
const EMPTY_PAGINATED_EXPENSES: PaginatedExpenses = {
  docs: [],
  totalDocs: 0,
  limit: 0,
  page: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
  nextPage: null,
  prevPage: null
};

export default async function ExpensesPage({
  searchParams
}: {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    dateFrom?: string;
    dateTo?: string;
    tab?: string;
    search?: string;
    category?: string;
  }>;
}) {
  // The permission exists in rbac and is granted to both roles; it was simply
  // never wired up before.
  const session = await requirePermission('view:expenses');
  const params = await searchParams;
  const isAdmin = session.user.role === 'admin';

  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 20;
  const search = params.search;
  const category = params.category as ExpenseCategory;

  const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
  const dateTo = params.dateTo ? new Date(params.dateTo) : undefined;

  const [expensesResult, invoiceExpensesResult, projectExpensesResult, kpis] = await Promise.all([
    getExpenses({ page, limit, dateFrom, dateTo, search, category }),
    isAdmin ? getInvoiceExpenses({ page, limit, dateFrom, dateTo, search, category }) : Promise.resolve(EMPTY_PAGINATED_EXPENSES),
    isAdmin ? getProjectExpenses({ page, limit, dateFrom, dateTo, search, category }) : Promise.resolve(EMPTY_PAGINATED_EXPENSES),
    // Company-wide spend figures are a management summary — admins only.
    isAdmin ? getExpenseKPIs({ dateFrom, dateTo }) : Promise.resolve(null)
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Receipt className="size-8" />}
        title="Expense Management"
        description="Track and manage business expenses"
      />

      {kpis && <ExpenseKPIsComponent kpis={kpis} />}

      <ExpensesPageClient
        expensesData={expensesResult}
        invoiceExpensesData={invoiceExpensesResult}
        projectExpensesData={projectExpensesResult}
        userId={session.user.id}
        userRole={session.user.role}
        activeTab={params.tab}
      />
    </div>
  );
}
