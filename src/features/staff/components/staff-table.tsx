'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminGate } from '@/components/auth/permission-gate';
import { format } from 'date-fns';
import { Pencil, ArrowUpDown, Users, Trash2, Search } from 'lucide-react';
import { TablePagination } from '@/components/general/table-pagination';
import { toggleStaffStatus } from '../actions';
import { toast } from 'sonner';
import { deleteStaffMember } from '@/features/staff/actions';
import { StaffMember } from '../types';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

interface Staff {
  id: string;
  staffId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: string;
  isActive: boolean;
  createdAt: string | Date;
}

interface StaffTableProps {
  staff: Staff[];
}

export function StaffTable({ staff }: StaffTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<{
    id: string;
    member: Omit<StaffMember, 'updatedAt' | 'createdAt'>;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStatusChange = async (staffId: string, isActive: boolean) => {
    try {
      await toggleStaffStatus(staffId, isActive);
      toast.success(`Staff ${isActive ? 'activated' : 'deactivated'} successfully`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update staff status');
    }
  };

  const handleDeleteClick = (staffId: string, staffMember: Omit<StaffMember, 'updatedAt' | 'createdAt'>) => {
    setStaffToDelete({ id: staffId, member: staffMember });
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;

    if (staffToDelete.member.isActive) {
      toast.error("Cannot delete an active member.");
      return;
    }

    try {
      setIsProcessing(true);
      await deleteStaffMember(staffToDelete.id, staffToDelete.member);
      toast.success('Staff deleted successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete staff');
    } finally {
      setIsProcessing(false);
    }
  };

  const columns = useMemo<ColumnDef<Staff>[]>(
    () => [
      {
        accessorKey: 'staffId',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Staff ID
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue('staffId') || '-'}</div>
      },
      {
        id: 'name',
        accessorFn: row => `${row.firstName} ${row.lastName}`,
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="font-medium">
            {row.original.firstName} {row.original.lastName}
          </div>
        )
      },
      {
        accessorKey: 'email',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Email
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="lowercase">{row.getValue('email')}</div>
      },
      {
        accessorKey: 'phoneNumber',
        header: 'Phone',
        cell: ({ row }) => <div>{row.getValue('phoneNumber') || '-'}</div>
      },
      {
        accessorKey: 'role',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Role
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const role = row.getValue('role') as string;
          return (
            <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="capitalize">
              {role}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        }
      },
      {
        accessorKey: 'isActive',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const member = row.original;
          return (
            <AdminGate
              fallback={
                <Badge variant={member.isActive ? 'default' : 'secondary'}>
                  {member.isActive ? 'Active' : 'Inactive'}
                </Badge>
              }
            >
              <Switch
                checked={member.isActive}
                onCheckedChange={checked => handleStatusChange(member.id, checked)}
                disabled={member.role == 'admin'}
              />
            </AdminGate>
          );
        },
        filterFn: (row, id, value) => {
          if (value === 'all') return true;
          return value === 'active' ? row.getValue(id) : !row.getValue(id);
        }
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
            Joined
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'MMM dd, yyyy'),
        sortingFn: 'datetime'
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const member = row.original;
          return (
            <AdminGate>
              <Button variant="ghost" size="sm" onClick={() => router.push(`/staff/${member.id}/edit`)}>
                <Pencil className="h-4 w-4 mr-1" />
                <span className="sr-only">Edit {row.original.firstName}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(row.original.id, row.original)}>
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="sr-only">Delete {row.original.firstName}</span>
              </Button>
            </AdminGate>
          );
        }
      }
    ],
    [router]
  );

  const table = useReactTable({
    data: staff,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter
    },
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  if (staff.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No staff members found</h3>
        <p className="text-muted-foreground mb-4">Get started by adding your first staff member</p>
      </div>
    );
  }

  const uniqueRoles = Array.from(new Set(staff.map(s => s.role)));

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <InputGroup className="max-w-sm">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search all columns..."
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
            />
          </InputGroup>
          <Select
            value={(table.getColumn('role')?.getFilterValue() as string[])?.join(',') || 'all'}
            onValueChange={value => {
              table.getColumn('role')?.setFilterValue(value === 'all' ? undefined : [value]);
            }}
          >
            <SelectTrigger className="">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {uniqueRoles.map(role => (
                <SelectItem key={role} value={role} className="capitalize">
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={(table.getColumn('isActive')?.getFilterValue() as string) || 'all'}
            onValueChange={value => {
              table.getColumn('isActive')?.setFilterValue(value === 'all' ? undefined : value);
            }}
          >
            <SelectTrigger className="">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
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
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <TablePagination table={table} itemName="staff members" />
      </div>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Staff Member"
        description="This action cannot be undone. This will permanently delete the staff member and all associated data."
        confirmText="Delete"
        onConfirm={handleDelete}
        isProcessing={isProcessing}
        variant="destructive"
      />
    </>
  );
}
