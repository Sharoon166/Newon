'use client';

import { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/general/table-pagination';
import { Plus, Trash2, Edit, FileText, Users, TrendingUp, AlertCircle, DollarSign, LucideIcon, Receipt, ReceiptText, Banknote } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { AuditAction } from '@/models/ProjectAuditLog';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender
} from '@tanstack/react-table';

interface AuditLog {
  _id: string;
  projectId: string;
  action: AuditAction;
  userId: string;
  userName: string;
  userRole: string;
  description: string;
  metadata?: Record<string, string | number | boolean | undefined>;
  createdAt: string;
}

interface ProjectAuditLogsProps {
  logs: AuditLog[];
  users: Array<{ id: string; name: string }>;
}

const actionConfig: Record<AuditAction, { icon: LucideIcon; badgeClass: string; label: string }> = {
  project_created: { icon: Plus, badgeClass: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Created' },
  project_updated: { icon: Edit, badgeClass: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Updated' },
  project_status_changed: {
    icon: TrendingUp,
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    label: 'Status Changed'
  },
  inventory_added: {
    icon: Plus,
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    label: 'Inventory Added'
  },
  inventory_updated: { icon: Edit, badgeClass: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Inventory Updated' },
  inventory_deleted: { icon: Trash2, badgeClass: 'bg-red-100 text-red-700 border-red-200', label: 'Inventory Deleted' },
  expense_added: {
    icon: Receipt,
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    label: 'Expense Added'
  },
  expense_updated: { icon: ReceiptText, badgeClass: 'bg-sky-100 text-sky-700 border-sky-200', label: 'Expense Updated' },
  expense_deleted: { icon: Trash2, badgeClass: 'bg-red-100 text-red-700 border-red-200', label: 'Expense Deleted' },
  payment_added: {
    icon: Banknote,
    badgeClass: 'bg-green-100 text-green-700 border-green-200',
    label: 'Payment Added'
  },
  payment_deleted: { icon: Trash2, badgeClass: 'bg-red-100 text-red-700 border-red-200', label: 'Payment Deleted' },
  staff_assigned: { icon: Users, badgeClass: 'bg-teal-100 text-teal-700 border-teal-200', label: 'Staff Assigned' },
  staff_removed: { icon: Users, badgeClass: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Staff Removed' },
  invoice_generated: {
    icon: FileText,
    badgeClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    label: 'Invoice Generated'
  }
};

export function ProjectAuditLogs({ logs, users }: ProjectAuditLogsProps) {
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const filteredData = useMemo(() => {
    let filtered = logs;

    if (selectedUser !== 'all') {
      filtered = filtered.filter(log => log.userId === selectedUser);
    }

    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    return filtered;
  }, [logs, selectedUser, selectedAction]);

  const columns = useMemo<ColumnDef<AuditLog>[]>(
    () => [
      {
        id: 'activity',
        header: 'Activity',
        cell: ({ row }) => {
          const log = row.original;
          const config = actionConfig[log.action];
          const Icon = config?.icon || AlertCircle;

          return (
            <div className="flex items-center gap-3 min-w-0">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <Badge className={`${config?.badgeClass || 'bg-gray-100 text-gray-700'} text-xs font-medium shrink-0`}>
                  {config?.label || log.action}
                </Badge>
                <span className="text-sm truncate">{log.description}</span>
              </div>
            </div>
          );
        }
      },
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => {
          const log = row.original;
          return (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{log.userName}</span>
              <span className="text-muted-foreground">•</span>
              <Badge variant="outline" className="text-xs capitalize">
                {log.userRole}
              </Badge>
            </div>
          );
        }
      },
      {
        id: 'date',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(row.original.createdAt)}</span>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  });

  const actionTypes = Array.from(new Set(logs.map(log => log.action)));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h3 className="text-lg font-semibold">Activity Log</h3>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedAction} onValueChange={setSelectedAction}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actionTypes.map(action => (
                <SelectItem key={action} value={action}>
                  {actionConfig[action]?.label || action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-muted-foreground">No activity logs found</p>
        </div>
      ) : (
        <>
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
                {table.getRowModel().rows.map(row => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination table={table} itemName="logs" />
        </>
      )}
    </div>
  );
}
