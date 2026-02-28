import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProjects } from '@/features/projects/actions';
import { ProjectsTable } from '@/features/projects/components/projects-table';
import { PageHeader } from '@/components/general/page-header';
import { Button } from '@/components/ui/button';
import { Plus, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { userHasPermission } from '@/lib/rbac';
import { Skeleton } from '@/components/ui/skeleton';

async function ProjectsContent() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Allow both admin and staff to access
  if (session.user.role !== 'admin' && session.user.role !== 'staff') {
    redirect('/not-allowed');
  }

  const canCreate = userHasPermission(session, 'create:projects');
  const canEdit = userHasPermission(session, 'edit:projects');
  const canCancel = userHasPermission(session, 'delete:projects'); // Reusing delete permission for cancel
  const canViewBudget = userHasPermission(session, 'view:budget');

  const { docs: projects } = await getProjects({}, session.user.id, session.user.role);

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Manage your projects and track expenses" icon={<FolderKanban />}>
        {canCreate && (
          <Link href="/projects/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </Link>
        )}
      </PageHeader>

      {projects.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Projects found</h3>
          <p className="text-muted-foreground mb-4">
            {canCreate ? 'Create your first project to get started' : 'No projects have been assigned to you yet'}
          </p>
          {canCreate && (
            <Link href="/projects/add">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <ProjectsTable data={projects} canEdit={canEdit} canCancel={canCancel} canViewBudget={canViewBudget} />
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}
