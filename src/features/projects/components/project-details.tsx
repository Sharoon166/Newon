import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { User, TrendingUp, TrendingDown, TriangleAlert, ArrowUpRight } from 'lucide-react';
import type { Customer } from '@/features/customers/types';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import { Item, ItemContent, ItemMedia } from '@/components/ui/item';
import Link from 'next/link';

interface ProjectDetailsProps {
  project: Project;
  customer?: Customer;
  canViewBudget?: boolean;
}

export function ProjectDetails({ project, customer, canViewBudget }: ProjectDetailsProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      planning: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Planning' },
      active: { bg: 'bg-green-50', text: 'text-green-700', label: 'Active' },
      'on-hold': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'On Hold' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completed' },
      cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Cancelled' }
    };
    return configs[status] || configs.planning;
  };

  const statusConfig = getStatusConfig(project.status);

  // Ensure we have valid numbers
  const totalInventoryCost = project.totalInventoryCost || 0;
  const totalExpenses = project.totalExpenses || 0;
  const totalProjectCost = project.totalProjectCost || totalInventoryCost + totalExpenses;
  const budget = project.budget || 0;

  const budgetUsedPercentage = canViewBudget && budget > 0 ? (totalProjectCost / budget) * 100 : 0;
  const isOverBudget = canViewBudget && project.remainingBudget < 0;
  const remaining = project.remainingBudget || budget - totalProjectCost;

  // Prepare chart data
  const chartData = [
    { name: 'Inventory', value: totalInventoryCost, fill: '#f97316' }, // orange-500
    { name: 'Expenses', value: totalExpenses, fill: '#3b82f6' }, // blue-500
    { name: 'Remaining', value: Math.max(0, remaining), fill: isOverBudget ? '#ef4444' : '#10b981' } // red-500 or emerald-500
  ].filter(item => item.value > 0);

  const chartConfig = {
    inventory: {
      label: 'Inventory Cost',
      color: '#f97316'
    },
    expenses: {
      label: 'Operating Expenses',
      color: '#3b82f6'
    },
    remaining: {
      label: isOverBudget ? 'Over Budget' : 'Remaining Budget',
      color: isOverBudget ? '#ef4444' : '#10b981'
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column - 8 columns */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        {/* Project Info Card */}
        <Card>
          <CardContent>
            <div className="grid grid-cols-2 gap-8">
              {/* Left side */}
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Start Date</p>
                  <p className="text-base font-semibold">{formatDate(new Date(project.startDate))}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Status</p>
                  <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0 font-medium`}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Client</p>
                  <p className="text-base font-semibold">{project.customerName}</p>
                  {customer && (
                    <Link href={`/ledger/${customer.customerId || customer.id}`} className='text-xs inline-flex items-center gap-1 text-primary hover:underline'>
                        View Ledger
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Right side */}
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Team</p>
                  {project.assignedStaffDetails && project.assignedStaffDetails.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {project.assignedStaffDetails.slice(0, 4).map((staff) => (
                          <div
                            key={staff.id}
                            className="w-8 h-8 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center"
                            title={`${staff.firstName} ${staff.lastName}`}
                          >
                            <span className="text-xs font-semibold text-orange-700">
                              {staff.firstName[0]}
                              {staff.lastName[0]}
                            </span>
                          </div>
                        ))}
                        {project.assignedStaffDetails.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                            <span className="text-xs font-semibold text-gray-600">
                              +{project.assignedStaffDetails.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {project.assignedStaffDetails.length}{' '}
                        {project.assignedStaffDetails.length === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">No team assigned</span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Inventory</p>
                  <p className="text-base font-semibold">{project.inventory.length} items</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Expenses</p>
                  <p className="text-base font-semibold">{project.expenses.length} records</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget & Spending Card */}
        {canViewBudget && (
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Budget & Spending</h3>
                <div className="flex items-center gap-2">
                  {isOverBudget ? (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-600">Over Budget</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">On Track</span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 items-center gap-6">
                {/* Left: Budget Overview */}
                <div className="space-y-6">
                  {/* Budget Numbers */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1.5">Total Budget</p>
                      <p className="text-2xl font-bold">{formatCurrency(budget)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1.5">Spent ({budgetUsedPercentage.toFixed(1)}%)</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalProjectCost)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1.5">
                        Remaining ({(100 - budgetUsedPercentage)?.toFixed(1)}%)
                      </p>
                      <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(remaining)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right: Pie Chart */}
                <div className="flex items-center justify-center">
                  {chartData.length > 0 && (
                    <ChartContainer config={chartConfig} className="h-[280px] w-full mb-4">
                      <PieChart>
                        <ChartTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const data = payload[0];
                            return (
                              <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
                                <p className="text-xs font-medium text-gray-600 mb-1">{data.name}</p>
                                <p className="text-base font-bold text-gray-900">
                                  {formatCurrency(Number(data.value))}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {budget > 0 ? `${((Number(data.value) / budget) * 100).toFixed(1)}% of budget` : ''}
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          height={50}
                          content={({ payload }) => {
                            if (!payload || !payload.length) return null;
                            return (
                              <div className="flex flex-wrap justify-center gap-2 mt-4">
                                {payload.map((entry, index) => {
                                  const data = chartData.find(d => d.fill === entry.color);
                                  return (
                                    <div key={`legend-${index}`} className="flex items-center gap-4 text-xs">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-1 h-3 rounded-sm shrink-0"
                                          style={{ backgroundColor: entry.color }}
                                        />
                                        <span className="text-gray-700 font-medium">{entry.value}</span>
                                      </div>
                                      <span className="text-gray-900 font-semibold">
                                        {formatCurrency(data?.value || 0)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ChartContainer>
                  )}
                </div>
              </div>

              {isOverBudget && (
                <Item className="mt-4 bg-destructive/10 text-red-800">
                  <ItemMedia>
                    <TriangleAlert />
                  </ItemMedia>
                  <ItemContent className="font-medium">
                    Project is over budget by {formatCurrency(Math.abs(remaining))}
                  </ItemContent>
                </Item>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column - 4 columns */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        {/* Client Financials Card */}
        {canViewBudget && customer && (
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-5">Client Financials</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Total Invoiced</p>
                  <p className="text-xl font-bold">{formatCurrency(customer.totalInvoiced || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Total Paid</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(customer.totalPaid || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1.5">Outstanding</p>
                  <p
                    className={`text-xl font-bold ${
                      (customer.outstandingBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {formatCurrency(customer.outstandingBalance || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Members Card */}
        {project.assignedStaffDetails && project.assignedStaffDetails.length > 0 && (
          <Card>
            <CardContent>
              <h3 className="text-lg font-semibold mb-4">Team Members</h3>
              <div className="space-y-3">
                {project.assignedStaffDetails.map(staff => (
                  <div
                    key={staff.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-orange-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {staff.firstName} {staff.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{staff.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
