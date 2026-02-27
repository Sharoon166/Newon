import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProject } from '@/features/projects/actions';
import { ProjectForm } from '@/features/projects/components/project-form';
import { PageHeader } from '@/components/general/page-header';
import { FolderKanban } from 'lucide-react';
import { userHasPermission } from '@/lib/rbac';
import { getStaffMembers } from '@/features/staff/actions';
import { getCustomers } from '@/features/customers/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface EditProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function EditProjectContent({ params }: EditProjectPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user) {
    redirect('/auth/signin');
  }

  if (!userHasPermission(session, 'edit:projects')) {
    redirect('/not-allowed');
  }

  const canViewBudget = userHasPermission(session, 'view:budget');

  try {
    const [project, staffMembers, customersResult] = await Promise.all([
      getProject(id, session.user.id, session.user.role),
      getStaffMembers({ isActive: true, role: "staff" }),
      getCustomers({ limit: 1000 })
    ])

    const customers = customersResult.docs;

    return (
      <div className="space-y-6">
        <PageHeader
          title="Edit Project"
          description={`Update project details for ${project.title}`}
          icon={<FolderKanban />}
        />

        <Card>
          <CardContent className="pt-6">
            <ProjectForm 
              project={project} 
              customers={customers}
              staffMembers={staffMembers} 
              currentUserId={session.user.id!}
              canViewBudget={canViewBudget}
            />
          </CardContent>
        </Card>
      </div>
    );
  } catch {
    redirect('/projects');
  }
}

export default function EditProjectPage(props: EditProjectPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <EditProjectContent {...props} />
    </Suspense>
  );
}
