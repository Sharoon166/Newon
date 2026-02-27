import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProject, getProjectInvoices } from '@/features/projects/actions';
import { getProjectAuditLogs } from '@/features/projects/actions/audit';
import { getCustomer } from '@/features/customers/actions';
import { getVirtualProducts } from '@/features/virtual-products/actions';
import { getProducts } from '@/features/inventory/actions';
import { getAllPurchases } from '@/features/purchases/actions';
import { userHasPermission } from '@/lib/rbac';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectPageClient } from './project-page-client';
import { EnhancedVariants } from '@/features/inventory/types';
import { EnhancedVirtualProduct } from '@/features/virtual-products/types';

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
    canViewInventory: userHasPermission(session, 'view:project-inventory'),
    canAddInventory: userHasPermission(session, 'add:project-inventory'),
    canGenerateInvoice: userHasPermission(session, 'create:invoices'),
    canViewAuditLogs: userHasPermission(session, 'view:audit-logs'),
    canViewClientFinancials: userHasPermission(session, 'view:client-financials'),
    canViewProjectInvoices: userHasPermission(session, 'view:project-invoices')
  };

  try {
    const project = await getProject(projectId, session.user.id, session.user.role);
    
    const [customer, projectInvoices, auditLogsResult, inventoryResults] = await Promise.all([
      getCustomer(project.customerId),
      permissions.canViewProjectInvoices ? getProjectInvoices(project.projectId!) : Promise.resolve([]),
      permissions.canViewAuditLogs ? getProjectAuditLogs(project.projectId!) : Promise.resolve({ logs: [] }),
      permissions.canViewInventory
        ? Promise.all([getProducts(), getVirtualProducts(), getAllPurchases()])
        : Promise.resolve([[], [], []])
    ]);

    const [variants, virtualProducts, purchases] = inventoryResults;
    const auditLogs = auditLogsResult.logs ?? [];

    return (
      <ProjectPageClient
        project={project}
        customer={customer}
        projectId={projectId}
        userId={session.user.id!}
        userName={session.user.name || 'Unknown'}
        userRole={session.user.role}
        {...permissions}
        projectInvoices={projectInvoices}
        auditLogs={auditLogs}
        variants={variants}
        virtualProducts={virtualProducts}
        purchases={purchases}
      />
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
