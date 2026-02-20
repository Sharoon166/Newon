import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Calendar, Users, TrendingDown, TrendingUp, AlertTriangle, Coins, User } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProjectDetailsProps {
  project: Project;
  canViewBudget?: boolean;
}

export function ProjectDetails({ project, canViewBudget }: ProjectDetailsProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'outline' | 'destructive';
        label: string;
      }
    > = {
      planning: { variant: 'secondary', label: 'Planning' },
      active: { variant: 'default', label: 'Active' },
      'on-hold': { variant: 'outline', label: 'On Hold' },
      completed: { variant: 'default', label: 'Completed' },
      cancelled: { variant: 'destructive', label: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.planning;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const budgetUsedPercentage = canViewBudget ? (project.totalExpenses / project.budget) * 100 : 0;
  const isOverBudget = canViewBudget && project.remainingBudget < 0;
  const isNearBudget = canViewBudget && budgetUsedPercentage > 80 && !isOverBudget;

  return (
    <div className="space-y-6">
      {getStatusBadge(project.status)}
      <p className="text-muted-foreground">{project.description}</p>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Start Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(new Date(project.startDate))}</div>
            {project.endDate && (
              <p className="text-xs text-muted-foreground mt-1">End: {formatDate(new Date(project.endDate))}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.assignedStaffDetails?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {project.assignedStaffDetails?.length === 1 ? 'team member' : 'team members'}
            </p>
          </CardContent>
        </Card>

        {canViewBudget && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(project.budget)}</div>
                <p className="text-xs text-muted-foreground mt-1">Spent: {formatCurrency(project.totalExpenses)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Remaining</CardTitle>
                {isOverBudget ? (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : 'text-green-600'}`}>
                  {formatCurrency(project.remainingBudget)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{budgetUsedPercentage.toFixed(1)}% used</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Budget Progress (Admin Only) */}
      {canViewBudget && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Budget Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Budget Usage</span>
                <span className="font-medium">{budgetUsedPercentage.toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(budgetUsedPercentage, 100)}
                className={isOverBudget ? '[&>div]:bg-destructive' : isNearBudget ? '[&>div]:bg-orange-500' : ''}
              />
            </div>

            {isOverBudget && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span>Project is over budget by {formatCurrency(Math.abs(project.remainingBudget))}</span>
              </div>
            )}

            {isNearBudget && (
              <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span>Project is approaching budget limit</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assigned Staff */}
      {project.assignedStaffDetails && project.assignedStaffDetails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assigned Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {project.assignedStaffDetails.map(staff => (
                <div key={staff.id} className="flex items-center gap-2 px-6 py-2 rounded-lg border">
                  <User />
                  <div>
                    <p className="font-medium">
                      {staff.firstName} {staff.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{staff.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
