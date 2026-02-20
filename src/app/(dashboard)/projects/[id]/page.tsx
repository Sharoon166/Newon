import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProject } from '@/features/projects/actions';
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

  try {
    const project = await getProject(projectId, session.user.id, session.user.role);

    return (
      <ProjectPageClient
        project={project}
        projectId={projectId}
        userId={session.user.id!}
        canEdit={canEdit}
        canAddExpense={canAddExpense}
        canViewBudget={canViewBudget}
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
