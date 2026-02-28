import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProject, getProjectInvoices, getProjectInvoice, getProjectExpensesWithTransactions } from '@/features/projects/actions';
import { getProjectAuditLogs } from '@/features/projects/actions/audit';
import { getCustomer } from '@/features/customers/actions';
import { userHasPermission } from '@/lib/rbac';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectPageClient } from './project-page-client';

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

    const [customer, projectInvoice, projectInvoices, auditLogsResult, enrichedExpenses] = await Promise.all([
      getCustomer(project.customerId),
      permissions.canViewInvoiceItems ? getProjectInvoice(project.projectId!) : Promise.resolve(null),
      permissions.canViewProjectInvoices ? getProjectInvoices(project.projectId!) : Promise.resolve([]),
      permissions.canViewAuditLogs ? getProjectAuditLogs(project.projectId!) : Promise.resolve({ logs: [] }),
      getProjectExpensesWithTransactions(project.projectId!)
    ]);

    const auditLogs = auditLogsResult.logs ?? [];

    return (
      <>
        <ProjectPageClient
          project={project}
          customer={customer}
          projectInvoice={projectInvoice}
          projectId={projectId}
          userId={session.user.id!}
          userName={session.user.name || 'Unknown'}
          userRole={session.user.role}
          {...permissions}
          projectInvoices={projectInvoices}
          auditLogs={auditLogs}
          enrichedExpenses={enrichedExpenses}
        />
      </>
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
