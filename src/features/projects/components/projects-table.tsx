'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  getSortedRowModel,
  getPaginationRowModel
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowUpDown,
  Eye,
  Pencil,
  Search,
  Trash2,
  MoreHorizontal,
  Users,
  Calendar,
  Coins,
  Ban
} from 'lucide-react';
import { Project } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { TablePagination } from '@/components/general/table-pagination';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { cancelProject } from '../actions';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';

interface ProjectsTableProps {
  data: Project[];
  canEdit?: boolean;
  canCancel?: boolean;
  canViewBudget?: boolean;
  onRefresh?: () => void;
}

export function ProjectsTable({ data, canEdit, canCancel, canViewBudget, onRefresh }: ProjectsTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });

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

  const handleCancel = async () => {
    if (!selectedProject) return;

    try {
      setIsCancelling(true);
      await cancelProject(selectedProject.projectId!);
      toast.success('Project cancelled successfully');
      setCancelDialogOpen(false);
      if (onRefresh) {
        onRefresh();
      } else {
        router.refresh();
      }
    } catch (error) {
      toast.error((error as Error).message || 'Failed to cancel project');
      console.error(error);
    } finally {
      setIsCancelling(false);
    }
  };

  const columns: ColumnDef<Project>[] = useMemo(() => {
    const baseColumns: ColumnDef<Project>[] = [
      {
        accessorKey: 'projectId',
        header: 'Project ID',
        cell: ({ row }) => <div className="font-mono text-sm">{row.original.projectId || '-'}</div>
      },
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.title}</div>
            <div className="text-sm text-muted-foreground line-clamp-1">{row.original.description}</div>
          </div>
        )
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => getStatusBadge(row.getValue('status')),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        }
      },
      {
        accessorKey: 'startDate',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            <Calendar className="mr-2 h-4 w-4" />
            Start Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => formatDate(new Date(row.getValue('startDate'))),
        sortingFn: 'datetime'
      },
      {
        accessorKey: 'assignedStaff',
        header: 'Assigned Staff',
        cell: ({ row }) => {
          const staffDetails = row.original.assignedStaffDetails || [];
          return (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{staffDetails.length || 0}</span>
            </div>
          );
        }
      }
    ];

    if (canViewBudget) {
      baseColumns.push(
        {
          accessorKey: 'budget',
          header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
              <Coins className="mr-2 h-4 w-4" />
              Budget
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          ),
          cell: ({ row }) => <div className="font-medium">{formatCurrency(row.getValue('budget'))}</div>
        }
      );
    }

    baseColumns.push({
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href={`/projects/${project.projectId}`}>
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
              </Link>
              {canEdit && (
                <Link href={`/projects/${project.projectId}/edit`}>
                  <DropdownMenuItem>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Project
                  </DropdownMenuItem>
                </Link>
              )}
              {canCancel && project.status !== 'cancelled' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setSelectedProject(project);
                      setCancelDialogOpen(true);
                    }}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel Project
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    });

    return baseColumns;
  }, [canEdit, canCancel, canViewBudget]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString'
  });

  const uniqueStatuses = Array.from(new Set(data.map(project => project.status)));

  return (
    <>
      <div className="space-y-4">
        <div className="flex sm:items-center justify-between max-sm:flex-col flex-wrap gap-4">
          <InputGroup className="max-w-sm flex-1">
            <InputGroupInput
              placeholder="Search projects..."
              value={globalFilter ?? ''}
              onChange={event => setGlobalFilter(event.target.value)}
            />
            <InputGroupAddon>
              <Search className="h-4 w-4" />
            </InputGroupAddon>
          </InputGroup>

          <Select
            value={(table.getColumn('status')?.getFilterValue() as string[])?.join(',') || 'all'}
            onValueChange={value => {
              table.getColumn('status')?.setFilterValue(value === 'all' ? undefined : [value]);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination table={table} itemName="Project" />
      </div>

      <ConfirmationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancel}
        title="Cancel Project"
        description={`Are you sure you want to cancel project "${selectedProject?.title}"? This will delete all project expenses, unlink the invoice, and recreate the invoice expenses in the Expense collection.`}
        confirmText="Cancel Project"
        variant="destructive"
        isProcessing={isCancelling}
      />
    </>
  );
}
