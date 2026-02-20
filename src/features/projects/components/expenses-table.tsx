'use client';

import { useState, useMemo } from 'react';
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
import { ArrowUpDown, Search, Trash2, Filter } from 'lucide-react';
import { Expense, ExpenseCategory } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { TablePagination } from '@/components/general/table-pagination';
import { Badge } from '@/components/ui/badge';
import { deleteExpense } from '../actions';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';

interface ExpensesTableProps {
  data: Expense[];
  projectId: string;
  canDelete?: boolean;
  onRefresh?: () => void;
}

export function ExpensesTable({ data, projectId, canDelete, onRefresh }: ExpensesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10
  });

  const getCategoryBadge = (category: ExpenseCategory) => {
    const categoryConfig: Record<ExpenseCategory, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      materials: { variant: 'default', label: 'Materials' },
      labor: { variant: 'secondary', label: 'Labor' },
      equipment: { variant: 'outline', label: 'Equipment' },
      transport: { variant: 'default', label: 'Transport' },
      other: { variant: 'secondary', label: 'Other' }
    };

    const config = categoryConfig[category];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;

    try {
      setIsDeleting(true);
      await deleteExpense(projectId, selectedExpense.id!);
      toast.success('Expense deleted successfully');
      setDeleteDialogOpen(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      toast.error('Failed to delete expense');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<Expense>[] = useMemo(
    () => [
      {
        accessorKey: 'date',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => formatDate(new Date(row.getValue('date'))),
        sortingFn: 'datetime'
      },
      {
        accessorKey: 'description',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Description
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.description}</div>
            {row.original.notes && <div className="text-sm text-muted-foreground line-clamp-1">{row.original.notes}</div>}
          </div>
        )
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => getCategoryBadge(row.getValue('category')),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        }
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium text-orange-600">{formatCurrency(row.getValue('amount'))}</div>
      },
      {
        accessorKey: 'addedByName',
        header: 'Added By',
        cell: ({ row }) => row.original.addedByName || 'Unknown'
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const expense = row.original;
          return canDelete ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedExpense(expense);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : null;
        }
      }
    ],
    [canDelete]
  );

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

  const uniqueCategories = Array.from(new Set(data.map(expense => expense.category)));

  return (
    <>
      <div className="space-y-4">
        <div className="flex sm:items-center justify-between max-sm:flex-col flex-wrap gap-4">
          <InputGroup className="max-w-sm flex-1">
            <InputGroupInput
              placeholder="Search expenses..."
              value={globalFilter ?? ''}
              onChange={event => setGlobalFilter(event.target.value)}
            />
            <InputGroupAddon>
              <Search className="h-4 w-4" />
            </InputGroupAddon>
          </InputGroup>

          <Select
            value={(table.getColumn('category')?.getFilterValue() as string[])?.join(',') || 'all'}
            onValueChange={value => {
              table.getColumn('category')?.setFilterValue(value === 'all' ? undefined : [value]);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
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
                    No expenses found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination table={table} itemName="Expense" />
      </div>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Expense"
        description={`Are you sure you want to delete this expense? This action cannot be undone.`}
        confirmText="Delete Expense"
        variant="destructive"
        isProcessing={isDeleting}
      />
    </>
  );
}
