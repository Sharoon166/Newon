import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProject, getProjectInvoices } from '@/features/projects/actions';
import { getProjectAuditLogs } from '@/features/projects/actions/audit';
import { getCustomers } from '@/features/customers/actions';
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
  const {id: projectId} = await params;

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (!userHasPermission(session, 'view:projects')) {
    redirect('/not-allowed');
  }

  const canEdit = userHasPermission(session, 'edit:projects');
  const canAddExpense = userHasPermission(session, 'add:expenses');
  const canViewBudget = userHasPermission(session, 'view:budget');
  const canViewInventory = userHasPermission(session, 'view:project-inventory');
  const canAddInventory = userHasPermission(session, 'add:project-inventory');
  const canGenerateInvoice = userHasPermission(session, 'create:invoices');
  const canViewAuditLogs = userHasPermission(session, 'view:audit-logs');
  const canViewClientFinancials = userHasPermission(session, 'view:client-financials');
  const canViewProjectInvoices = userHasPermission(session, 'view:project-invoices');

  try {
    const project = await getProject(projectId, session.user.id, session.user.role);
    
    // Fetch customer data
    const customersResult = await getCustomers({ limit: 1000 }); // Get all customers
    const customers = customersResult.docs;
    const customer = customers.find(c => c.customerId === project.customerId || c.id === project.customerId);

    // Fetch project invoices (admin only)
    const projectInvoices = canViewProjectInvoices ? await getProjectInvoices(project.projectId!) : [];

    // Fetch audit logs (admin only)
    const auditLogsResult = canViewAuditLogs ? await getProjectAuditLogs(project.projectId!) : { logs: [] };
    const auditLogs = auditLogsResult.logs || [];

    // Fetch virtual products for inventory (admin only)
    let variants: EnhancedVariants[] = [];
    let virtualProducts: EnhancedVirtualProduct[] = [];
    let purchases = [];
    
    if (canViewInventory) {
      variants = await getProducts();
      virtualProducts = await getVirtualProducts();
      purchases = await getAllPurchases();
    }

    return (
      <ProjectPageClient
        project={project}
        customer={customer}
        projectId={projectId}
        userId={session.user.id!}
        userName={session.user.name || 'Unknown'}
        userRole={session.user.role}
        canEdit={canEdit}
        canAddExpense={canAddExpense}
        canViewBudget={canViewBudget}
        canViewInventory={canViewInventory}
        canAddInventory={canAddInventory}
        canGenerateInvoice={canGenerateInvoice}
        canViewAuditLogs={canViewAuditLogs}
        canViewClientFinancials={canViewClientFinancials}
        canViewProjectInvoices={canViewProjectInvoices}
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
