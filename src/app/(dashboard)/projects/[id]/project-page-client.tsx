'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDetails } from '@/features/projects/components/project-details';
import { ExpensesTableWithPayments } from '@/features/projects/components/expenses-table-with-payments';
import { AddExpenseDialog } from '@/features/projects/components/add-expense-dialog';
import { ProjectInvoicesList } from '@/features/projects/components/project-invoices-list';
import { UpdateStatusDialog } from '@/features/projects/components/update-status-dialog';
import { InvoiceItemsTable } from '@/components/invoices/invoice-items-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProjectAuditLogs } from '@/features/projects/components/project-audit-logs';
import { Plus, Pencil, ExternalLink, Receipt, Activity, Package } from 'lucide-react';
import Link from 'next/link';
import { Project } from '@/features/projects/types';
import type { Customer } from '@/features/customers/types';
import type { Invoice } from '@/features/invoices/types';
import { formatCurrency } from '@/lib/utils';

interface ProjectPageClientProps {
  project: Project;
  customer?: Customer;
  projectInvoice: Invoice | null;
  projectId: string;
  userId: string;
  userName: string;
  userRole: string;
  canEdit: boolean;
  canAddExpense: boolean;
  canViewBudget: boolean;
  canViewInvoiceItems: boolean;
  canViewAuditLogs: boolean;
  canViewClientFinancials: boolean;
  canViewProjectInvoices: boolean;
  projectInvoices: Invoice[];
  enrichedExpenses: import('@/features/projects/types').EnrichedExpense[];
  auditLogs: Array<{
    _id: string;
    projectId: string;
    action:
      | 'project_created'
      | 'project_updated'
      | 'project_status_changed'
      | 'inventory_added'
      | 'inventory_updated'
      | 'inventory_deleted'
      | 'expense_added'
      | 'expense_updated'
      | 'expense_deleted'
      | 'staff_assigned'
      | 'staff_removed'
      | 'invoice_generated';
    userId: string;
    userName: string;
    userRole: string;
    description: string;
    metadata?: Record<string, string | number | boolean | undefined>;
    createdAt: string;
  }>;
}

export function ProjectPageClient({
  project,
  customer,
  projectInvoice,
  projectId,
  userId,
  userName,
  userRole,
  canEdit,
  canAddExpense,
  canViewBudget,
  canViewInvoiceItems,
  canViewAuditLogs,
  canViewProjectInvoices,
  projectInvoices,
  enrichedExpenses,
  auditLogs
}: ProjectPageClientProps) {
  const router = useRouter();
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const handleRefresh = () => {
    router.refresh();
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      planning: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Planning' },
      active: { bg: 'bg-green-50', text: 'text-green-700', label: 'Active' },
      'on-hold': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'On Hold' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completed' },
      cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Cancelled' }
    };
    return configs[status] || configs.planning;
  };

  const statusConfig = getStatusConfig(project.status);

  return (
    <>
      <div className="space-y-8">
        {/* Executive Header */}
        <div className="bg-white pb-6">
          <div className="flex max-lg:flex-col items-start justify-between gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{project.title}</h1>
                <Badge
                  className={`${statusConfig.bg} ${statusConfig.text} border-0 px-3 py-1 cursor-pointer hover:opacity-80`}
                  onClick={() => canEdit && setStatusDialogOpen(true)}
                >
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Project ID: {project.projectId}</p>
              <p className="text-base text-gray-600 max-w-3xl">{project.description}</p>
            </div>
            <div className="flex items-center flex-wrap gap-3">
              {customer && (
                <Button variant="outline" asChild>
                  <Link href={`/ledger/${customer.customerId || customer.id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Ledger
                  </Link>
                </Button>
              )}
              {canEdit && userRole === 'admin' && (
                <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
                  Update Status
                </Button>
              )}
              {canEdit && (
                <Button asChild>
                  <Link href={`/projects/${projectId}/edit`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Project
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Project Details Grid */}
        <ProjectDetails project={project} customer={customer} canViewBudget={canViewBudget} projectInvoice={projectInvoice} />

        {/* Project Invoices - Admin Only */}
        {canViewProjectInvoices && projectInvoices.length > 0 && <ProjectInvoicesList invoices={projectInvoices} />}

        {/* Invoice Items & Expenses & Activity Section */}
        <Tabs defaultValue={canViewInvoiceItems ? 'invoice-items' : 'expenses'} className="space-y-4">
          <TabsList className="max-sm:flex-col max-sm:w-full max-sm:*:w-full h-full">
            {canViewInvoiceItems && (
              <TabsTrigger value="invoice-items" className="gap-2">
                <Package className="h-4 w-4" />
                Invoice Items ({projectInvoice?.items.length || 0})
              </TabsTrigger>
            )}
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="h-4 w-4" />
              Expenses ({project.expenses.length})
            </TabsTrigger>
            {canViewAuditLogs && (
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                Activity ({auditLogs.length})
              </TabsTrigger>
            )}
          </TabsList>

          {canViewInvoiceItems && (
            <TabsContent value="invoice-items">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Invoice Items</h3>
                {!projectInvoice || projectInvoice.items.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-muted-foreground">No invoice items found</p>
                  </div>
                ) : (
                  <InvoiceItemsTable invoice={projectInvoice} showTotals />
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="expenses">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Project Expenses</h3>
                {canAddExpense &&
                  (project.status === 'planning' || project.status === 'active' || project.status === 'on-hold') && (
                    <Button onClick={() => setExpenseDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Expense
                    </Button>
                  )}
              </div>
              {project.expenses.length === 0 ? (
                <div className="text-center py-16">
                  <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-muted-foreground mb-4">No expenses recorded yet</p>
                  {canAddExpense &&
                    (project.status === 'planning' || project.status === 'active' || project.status === 'on-hold') && (
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
          </TabsContent>

          {canViewAuditLogs && (
            <TabsContent value="activity">
              <ProjectAuditLogs
                logs={auditLogs}
                users={[
                  ...project.assignedStaff.map(staffId => ({
                    id: staffId,
                    name: project.expenses.find(e => e.addedBy === staffId)?.addedByName || 'Unknown'
                  })),
                  { id: userId, name: userName }
                ].filter((user, index, self) => index === self.findIndex(u => u.id === user.id))}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {canAddExpense &&
        (project.status === 'planning' || project.status === 'active' || project.status === 'on-hold') && (
          <AddExpenseDialog
            open={expenseDialogOpen}
            onOpenChange={setExpenseDialogOpen}
            projectId={projectId}
            userId={userId}
            userRole={userRole}
            onSuccess={handleRefresh}
          />
        )}

      {canEdit && (
        <UpdateStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          projectId={projectId}
          currentStatus={project.status}
        />
      )}
    </>
  );
}
