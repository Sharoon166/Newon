import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProjectForm } from '@/features/projects/components/project-form';
import { PageHeader } from '@/components/general/page-header';
import { FolderKanban } from 'lucide-react';
import { userHasPermission } from '@/lib/rbac';
import { getStaffMembers } from '@/features/staff/actions';
import { getInvoices } from '@/features/invoices/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

async function AddProjectContent() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (!userHasPermission(session, 'create:projects')) {
    redirect('/not-allowed');
  }

  const canViewBudget = userHasPermission(session, 'view:budget');
  const staffMembers = await getStaffMembers({ isActive: true, role: "staff" });
  const invoicesResult = await getInvoices({ type: 'invoice', limit: 1000 }); // Get all invoices
  const invoices = invoicesResult.docs;

  return (
    <div className="space-y-6">
      <PageHeader title="Create New Project" description="Add a new project to track" icon={<FolderKanban />} />

      <Card>
        <CardContent className="pt-6">
          <ProjectForm 
            invoices={invoices} 
            staffMembers={staffMembers} 
            currentUserId={session.user.id!}
            canViewBudget={canViewBudget}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function AddProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <AddProjectContent />
    </Suspense>
  );
}
