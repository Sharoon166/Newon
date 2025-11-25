'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Eye,
  Edit,
  RefreshCw,
  Ban,
  FileText,
  CheckCircle,
  XCircle,
  Printer,
  Hash
} from 'lucide-react';
import { Invoice } from '../types';
import { formatCurrency } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { TablePagination } from '@/components/general/table-pagination';
import { format } from 'date-fns';
import { updateInvoiceStatus } from '../actions';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { UpdateStatusDialog } from './update-status-dialog';
import { EditInvoiceDialog } from './edit-invoice-dialog';
import { toast } from 'sonner';

interface QuotationsTableProps {
  quotations: Invoice[];
  onRefresh?: () => void;
}

export function QuotationsTable({ quotations, onRefresh }: QuotationsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Invoice | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ComponentType<{ className?: string }> }
    > = {
      draft: { variant: 'secondary', label: 'Draft', icon: FileText },
      sent: { variant: 'outline', label: 'Sent', icon: FileText },
      accepted: { variant: 'default', label: 'Accepted', icon: CheckCircle },
      rejected: { variant: 'destructive', label: 'Rejected', icon: XCircle },
      expired: { variant: 'destructive', label: 'Expired', icon: XCircle },
      converted: { variant: 'default', label: 'Converted', icon: CheckCircle },
      cancelled: { variant: 'destructive', label: 'Cancelled', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleCancel = async () => {
    if (!selectedQuotation) return;

    try {
      setIsCancelling(true);
      await updateInvoiceStatus(selectedQuotation.id, 'cancelled');
      toast.success('Quotation cancelled successfully');
      onRefresh?.();
      setCancelDialogOpen(false);
    } catch (error) {
      console.error('Error cancelling quotation:', error);
      toast.error((error as Error).message || 'Failed to cancel quotation');
    } finally {
      setIsCancelling(false);
    }
  };

  const columns: ColumnDef<Invoice>[] = useMemo(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 hover:bg-transparent"
            >
              QT <Hash />
              {isSorted ? (
                isSorted === 'asc' ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )
              ) : (
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => <div className="font-medium">{row.original.invoiceNumber}</div>
      },
      {
        accessorKey: 'customerName',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 hover:bg-transparent"
            >
              Customer
              {isSorted ? (
                isSorted === 'asc' ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )
              ) : (
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.customerName}</div>
            {row.original.customerCompany && (
              <div className="text-sm text-muted-foreground">{row.original.customerCompany}</div>
            )}
          </div>
        )
      },
      {
        accessorKey: 'date',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 hover:bg-transparent"
            >
              Date
              {isSorted ? (
                isSorted === 'asc' ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )
              ) : (
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => format(new Date(row.original.date), 'MMM dd, yyyy')
      },
      {
        accessorKey: 'validUntil',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 hover:bg-transparent"
            >
              Valid Until
              {isSorted ? (
                isSorted === 'asc' ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )
              ) : (
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => (row.original.validUntil ? format(new Date(row.original.validUntil), 'MMM dd, yyyy') : '-')
      },
      {
        accessorKey: 'totalAmount',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 hover:bg-transparent"
            >
              Amount
              {isSorted ? (
                isSorted === 'asc' ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )
              ) : (
                <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
              )}
            </Button>
          );
        },
        cell: ({ row }) => <div className="font-medium">{formatCurrency(row.original.totalAmount)}</div>
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => getStatusBadge(row.original.status),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        }
      },
      {
        accessorKey: 'market',
        header: 'Market',
        cell: ({ row }) => <Badge variant="outline">{row.original.market}</Badge>,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        }
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const quotation = row.original;
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
                <Link href={`/invoices/${quotation.id}`}>
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                </Link>
                <Link href={`/invoices/${quotation.id}/print`}>
                  <DropdownMenuItem>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedQuotation(quotation);
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedQuotation(quotation);
                    setStatusDialogOpen(true);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update Status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  disabled={quotation.status === 'cancelled' || quotation.status === 'converted'}
                  onClick={() => {
                    setSelectedQuotation(quotation);
                    setCancelDialogOpen(true);
                  }}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel
                  {quotation.status === 'cancelled' && <span className="ml-2 text-xs">(Already cancelled)</span>}
                  {quotation.status === 'converted' && <span className="ml-2 text-xs">(Converted to invoice)</span>}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }
      }
    ],
    []
  );

  const table = useReactTable({
    data: quotations,
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

  if (quotations.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No quotations found</h3>
        <p className="text-muted-foreground mb-4">Create your first quotation to get started</p>
        <Link href="/invoices/new">
          <Button>Create Quotation</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <InputGroup>
            <InputGroupAddon>
              <Search className="h-4 w-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search by quotation number, customer name, email..."
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(String(e.target.value))}
            />
          </InputGroup>
        </div>

        <Select
          value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
          onValueChange={value => {
            table.getColumn('status')?.setFilterValue(value === 'all' ? undefined : value);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={(table.getColumn('market')?.getFilterValue() as string) ?? 'all'}
          onValueChange={value => {
            table.getColumn('market')?.setFilterValue(value === 'all' ? undefined : value);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by market" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Markets</SelectItem>
            <SelectItem value="newon">Newon</SelectItem>
            <SelectItem value="waymor">Waymor</SelectItem>
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
      <TablePagination table={table} />

      {/* Dialogs */}
      <ConfirmationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancel}
        title="Cancel Quotation"
        description={`Are you sure you want to cancel quotation ${selectedQuotation?.invoiceNumber}? This will mark it as cancelled.`}
        confirmText="Cancel Quotation"
        variant="destructive"
        isProcessing={isCancelling}
      />

      {selectedQuotation && (
        <>
          <UpdateStatusDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            invoiceId={selectedQuotation.id}
            currentStatus={selectedQuotation.status}
            type={selectedQuotation.type}
            onSuccess={() => onRefresh?.()}
          />

          <EditInvoiceDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            invoice={selectedQuotation}
            onSuccess={() => onRefresh?.()}
          />
        </>
      )}
    </div>
  );
}
