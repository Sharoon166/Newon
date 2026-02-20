'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDetails } from '@/features/projects/components/project-details';
import { ExpensesTable } from '@/features/projects/components/expenses-table';
import { AddExpenseDialog } from '@/features/projects/components/add-expense-dialog';
import { PageHeader } from '@/components/general/page-header';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Project } from '@/features/projects/types';

interface ProjectPageClientProps {
  project: Project;
  projectId: string;
  userId: string;
  canEdit: boolean;
  canAddExpense: boolean;
  canViewBudget: boolean;
}

export function ProjectPageClient({
  project,
  projectId,
  userId,
  canEdit,
  canAddExpense,
  canViewBudget
}: ProjectPageClientProps) {
  const router = useRouter();
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader title={project.title} description={`Project ID: ${project.projectId}`} icon={<FolderKanban />}>
          <div className="flex gap-2">
            {canEdit && (
              <Link href={`/projects/${projectId}/edit`}>
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Project
                </Button>
              </Link>
            )}
          </div>
        </PageHeader>
        <ProjectDetails project={project} canViewBudget={canViewBudget} />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Expenses</CardTitle>
              {canAddExpense && (
                <Button onClick={() => setExpenseDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {project.expenses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No expenses recorded yet</p>
                {canAddExpense && (
                  <Button onClick={() => setExpenseDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Expense
                  </Button>
                )}
              </div>
            ) : (
              <ExpensesTable
                data={project.expenses}
                projectId={projectId}
                canDelete={canEdit}
                onRefresh={handleRefresh}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {canAddExpense && (
        <AddExpenseDialog
          open={expenseDialogOpen}
          onOpenChange={setExpenseDialogOpen}
          projectId={projectId}
          userId={userId}
          onSuccess={handleRefresh}
        />
      )}
    </>
  );
}
