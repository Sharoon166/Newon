import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProject } from '@/features/projects/actions';
import { ProjectForm } from '@/features/projects/components/project-form';
import { PageHeader } from '@/components/general/page-header';
import { FolderKanban } from 'lucide-react';
import { userHasPermission } from '@/lib/rbac';
import { getStaffMembers } from '@/features/staff/actions';
import { getInvoices } from '@/features/invoices/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface EditProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Loads everything the edit page needs.
 *
 * No JSX may be constructed in here: React does not render JSX while it is
 * being created, so a try/catch around it would never catch render errors
 * (react-hooks/error-boundaries). Only data-loading errors are handled here.
 */
async function loadProjectForEdit(session: Session, id: string) {
  try {
    const [project, staffMembers, invoicesResult] = await Promise.all([
      getProject(id, session.user.id, session.user.role),
      getStaffMembers({ isActive: true, role: 'staff' }),
      getInvoices({ type: 'invoice', limit: 10000 })
    ]);

    const invoices = invoicesResult.docs;

    // Staff cannot edit projects with certain statuses.
    // Kept inside the try on purpose: redirect() throws a control-flow signal
    // that the catch below swallows, so blocked staff still end up on
    // /projects — unchanged behavior.
    if (session.user.role === 'staff' && ['on-hold', 'completed', 'cancelled'].includes(project.status)) {
      redirect('/not-allowed');
    }

    return { project, staffMembers, invoices };
  } catch {
    return null;
  }
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

  const data = await loadProjectForEdit(session, id);

  if (!data) {
    redirect('/projects');
  }

  const { project, staffMembers, invoices } = data;

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
            invoices={invoices}
            staffMembers={staffMembers}
            currentUserId={session.user.id!}
          />
        </CardContent>
      </Card>
    </div>
  );
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
