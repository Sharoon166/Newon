import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  getProject,
  getProjectInvoice,
  getProjectExpensesWithTransactions
} from '@/features/projects/actions';
import { getProjectAuditLogs } from '@/features/projects/actions/audit';
import { getCustomer } from '@/features/customers/actions';
import { userHasPermission } from '@/lib/rbac';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectDetails } from '@/features/projects/components/project-details';
import { ProjectExpensesSection } from '@/features/projects/components/project-expenses-section';
import { ProjectActions } from '@/features/projects/components/project-actions';
import { InvoiceItemsTable } from '@/components/invoices/invoice-items-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProjectAuditLogs } from '@/features/projects/components/project-audit-logs';
import { Package, Receipt, Activity, Banknote } from 'lucide-react';
import { PageHeader } from '@/components/general/page-header';
import StaffFinances from '@/features/projects/components/staff-finances';

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function ProjectPageContent({ params }: ProjectPageProps) {
  const session = await getServerSession(authOptions);
  const { id: projectId } = await params;

  if (!session?.user) redirect('/auth/signin');

  if (!userHasPermission(session, 'view:projects')) {
    redirect('/not-allowed');
  }

  const permissions = {
    canEdit: userHasPermission(session, 'edit:projects'),
    canAddExpense: userHasPermission(session, 'add:expenses'),
    canViewBudget: userHasPermission(session, 'view:budget'),
    canViewInvoiceItems: userHasPermission(session, 'view:project-inventory'),
    canViewAuditLogs: userHasPermission(session, 'view:audit-logs'),
    canViewClientFinancials: userHasPermission(session, 'view:client-financials'),
    canViewProjectInvoices: userHasPermission(session, 'view:project-invoices'),
    canCancel: userHasPermission(session, 'delete:projects') // Reusing delete permission for cancel
  };

  try {
    const project = await getProject(projectId, session.user.id, session.user.role);

    const [customer, projectInvoice, auditLogsResult, enrichedExpenses] = await Promise.all([
      getCustomer(project.customerId),
      permissions.canViewInvoiceItems ? getProjectInvoice(project.projectId!) : Promise.resolve(null),
      permissions.canViewAuditLogs ? getProjectAuditLogs(project.projectId!) : Promise.resolve({ logs: [] }),
      getProjectExpensesWithTransactions(project.projectId!)
    ]);

    const auditLogs = auditLogsResult.logs ?? [];

    const { id: userId, name: userName = 'unknown', role: userRole } = session.user;

    return (
      <div className="space-y-8">
        <PageHeader title={project.title} description={`Project ID: ${project.projectId}`}>
          <ProjectActions
            projectId={projectId}
            projectTitle={project.title}
            projectStatus={project.status}
            canEdit={permissions.canEdit}
            canCancel={permissions.canCancel}
            userRole={userRole}
          />
        </PageHeader>

        {/* Executive Header */}
        <div className="bg-white pb-6">
          <p className="text-base text-gray-600 max-w-[80ch] line-clamp-3">{project.description}</p>
        </div>

        {/* Project Details Grid */}
        <ProjectDetails
          project={project}
          customer={customer}
          canViewBudget={permissions.canViewBudget}
          canViewProjectInvoice={permissions.canViewProjectInvoices}
          projectInvoice={projectInvoice}
        />

        {/* Invoice Items & Expenses & Activity Section */}
        <Tabs defaultValue={permissions.canViewInvoiceItems ? 'invoice-items' : 'expenses'} className="space-y-4">
          <TabsList className="max-sm:flex-col max-sm:w-full max-sm:*:w-full h-full">
            {permissions.canViewBudget && (
              <TabsTrigger value="staff-payments" className="gap-2">
                <Banknote className="h-4 w-4" />
                Staff Payments
              </TabsTrigger>
            )}
            {permissions.canViewInvoiceItems && (
              <TabsTrigger value="invoice-items" className="gap-2">
                <Package className="h-4 w-4" />
                Invoice Items ({projectInvoice?.items.length || 0})
              </TabsTrigger>
            )}
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="h-4 w-4" />
              Expenses ({enrichedExpenses.length})
            </TabsTrigger>
            {permissions.canViewAuditLogs && (
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                Activity ({auditLogs.length})
              </TabsTrigger>
            )}
          </TabsList>
          {permissions.canViewBudget && project.projectId && (
            <TabsContent value="staff-payments">
              <StaffFinances projectId={project.projectId} />
            </TabsContent>
          )}

          {permissions.canViewInvoiceItems && (
            <TabsContent value="invoice-items">
              <div className="space-y-4 pt-6">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">Invoice Items</h3>
                  <p className="text-sm text-muted-foreground">
                    This section shows all items present with the project{`'`}s invoice
                  </p>
                </div>
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
            <ProjectExpensesSection
              enrichedExpenses={enrichedExpenses}
              projectId={projectId}
              projectStatus={project.status}
              userId={userId}
              userRole={userRole}
              canEdit={permissions.canEdit}
              canAddExpense={permissions.canAddExpense}
            />
          </TabsContent>

          {permissions.canViewAuditLogs && (
            <TabsContent value="activity">
              <ProjectAuditLogs
                logs={auditLogs}
                users={[
                  ...project.assignedStaff.map(staffId => ({
                    id: staffId,
                    name: enrichedExpenses.find(e => e.addedBy === staffId)?.addedByName || 'Unknown'
                  })),
                  { id: userId, name: userName }
                ].filter((user, index, self) => index === self.findIndex(u => u.id === user.id))}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  } catch {
    redirect('/projects');
  }
}

export default function ProjectPage(props: ProjectPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ProjectPageContent {...props} />
    </Suspense>
  );
}
