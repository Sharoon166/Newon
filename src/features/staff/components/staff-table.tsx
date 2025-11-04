'use client';

import { useState } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
  getSortedRowModel,
  getPaginationRowModel,
  SortingFn
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Pencil, Search } from 'lucide-react';
import { StaffMember } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatDate } from '@/lib/utils';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { TablePagination } from '@/components/general/table-pagination';

interface StaffTableProps {
  data: StaffMember[];
  onEdit?: (id: string) => void;
  actions?: (row: Row<StaffMember>) => React.ReactNode;
}

export function StaffTable({ data, onEdit, actions }: StaffTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const nameSortingFn: SortingFn<StaffMember> = (rowA, rowB) => {
    const nameA = `${rowA.original.firstName} ${rowA.original.lastName}`.toLowerCase();
    const nameB = `${rowB.original.firstName} ${rowB.original.lastName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  };

  const columns: ColumnDef<StaffMember>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium inline-flex items-center gap-2">
          <div className={cn("size-2 rounded-full", row.original.isActive ? "bg-green-500" : "bg-red-500")} />
          {row.original.firstName} {row.original.lastName}
          {!row.original.isActive && (
            <Badge variant="outline" className="ml-2 text-xs">Inactive</Badge>
          )}
        </div>
      ),
      sortingFn: nameSortingFn,
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <Badge
            variant={role === 'admin' ? 'default' : 'outline'}
            className={`
              capitalize
              ${role === 'admin' ? 'bg-blue-100 text-blue-800' : ''}
              ${role === 'manager' ? 'bg-purple-100 text-purple-800' : ''}
            `}
          >
            {role}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: () => null,
      cell: () => null,
      enableHiding: false,
      filterFn: (row, columnId, value) => {
        if (value === undefined) return true;
        const rowValue = row.getValue(columnId) as boolean;
        return rowValue === value;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date Added',
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'));
        return formatDate(date);
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const member = row.original;
        return (
          <div className="flex justify-end">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(member.id)}
                className="h-8 w-8"
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
            )}
            {actions && actions(row)}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center justify-between w-full space-x-4">
          <InputGroup className='max-w-sm'>
            <InputGroupInput placeholder='Search staff...' value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
            />
            <InputGroupAddon>
              <Search className="h-4 w-4" />
            </InputGroupAddon>
          </InputGroup>
          <Select
            onValueChange={(value) =>
              table.getColumn('isActive')?.setFilterValue(
                value === 'all' ? undefined : value === 'active'
              )
            }
            value={
              table.getColumn('isActive')?.getFilterValue() === undefined
                ? 'all'
                : table.getColumn('isActive')?.getFilterValue()
                  ? 'active'
                  : 'inactive'
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">
                <div className="size-2 rounded-full border bg-green-500" />
                Active</SelectItem>
              <SelectItem value="inactive">
                <div className="size-2 rounded-full border bg-red-500" />
                Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={!row.original.isActive ? 'opacity-60 cursor-not-allowed' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center space-x-2">
        <TablePagination
          table={table}
          itemName="Staff"
        />
      </div>
    </div>
  );
}
