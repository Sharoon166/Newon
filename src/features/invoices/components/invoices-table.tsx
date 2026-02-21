'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Invoice } from '../types';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Ban,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Plus,
  ChevronUp,
  ChevronDown,
  CalendarIcon,
  X,
  Search,
  Hash,
  Copyright,
  Download
} from 'lucide-react';
import Link from 'next/link';
import { updateInvoiceStatus, restoreInvoiceStock } from '../actions';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoreHorizontal } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DateRange } from 'react-day-picker';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { AddPaymentDialog } from './add-payment-dialog';
import { EditInvoiceDialog } from './edit-invoice-dialog';
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
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { TablePagination } from '@/components/general/table-pagination';
import { printInvoicePDF } from '../utils/print-invoice';

interface InvoicesTableProps {
  invoices: Invoice[];
  onRefresh?: () => void;
  initialDateFrom?: string;
  initialDateTo?: string;
}

export function InvoicesTable({ invoices, onRefresh, initialDateFrom, initialDateTo }: InvoicesTableProps) {
  const router = useRouter();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Initialize date range from URL params
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (initialDateFrom || initialDateTo) {
      return {
        from: initialDateFrom ? new Date(initialDateFrom) : undefined,
        to: initialDateTo ? new Date(initialDateTo) : undefined
      };
    }
    return undefined;
  });

  // Update URL when date range changes
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);

    const params = new URLSearchParams(window.location.search);

    if (range?.from) {
      params.set('dateFrom', format(range.from, 'yyyy-MM-dd'));
    } else {
      params.delete('dateFrom');
    }

    if (range?.to) {
      params.set('dateTo', format(range.to, 'yyyy-MM-dd'));
    } else {
      params.delete('dateTo');
    }

    // Navigate with new params (this will trigger server-side refetch)
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  };

  const handleCancel = async () => {
    if (!selectedInvoice) return;

    try {
      setIsCancelling(true);

      // Restore stock if it was deducted (BEFORE updating status)
      if (selectedInvoice.type === 'invoice' && selectedInvoice.stockDeducted) {
        try {
          await restoreInvoiceStock(selectedInvoice.id);
          toast.success('Stock restored to inventory');
        } catch (stockError) {
          console.error('Error restoring stock:', stockError);
          const errorMessage = stockError instanceof Error ? stockError.message : 'Unknown error';
          toast.error('Failed to restore stock', {
            description: errorMessage
          });
          // Don't proceed with cancellation if stock restoration fails
          return;
        }
      }

      // Update status to cancelled
      await updateInvoiceStatus(selectedInvoice.id, 'cancelled');
      toast.success(`${selectedInvoice.type === 'invoice' ? 'Invoice' : 'Quotation'} cancelled successfully`);
      handleRefresh();
      setCancelDialogOpen(false);
    } catch {
      toast.error(
        'Cannot cancel invoice with payments. Please delete all payments first or process a refund/credit note instead.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'outline' | 'destructive';
        label: string;
        icon: React.ComponentType<{ className?: string }>;
      }
    > = {
      paid: { variant: 'default', label: 'Paid', icon: CheckCircle },
      pending: { variant: 'secondary', label: 'Pending', icon: Clock },
      partial: { variant: 'outline', label: 'Partial', icon: Clock },
      delivered: { variant: 'default', label: 'Delivered', icon: CheckCircle },
      cancelled: { variant: 'destructive', label: 'Cancelled', icon: XCircle },
      draft: { variant: 'secondary', label: 'Draft', icon: FileText },
      sent: { variant: 'outline', label: 'Sent', icon: FileText },
      accepted: { variant: 'default', label: 'Accepted', icon: CheckCircle },
      rejected: { variant: 'destructive', label: 'Rejected', icon: XCircle },
      expired: { variant: 'destructive', label: 'Expired', icon: XCircle },
      converted: { variant: 'default', label: 'Converted', icon: CheckCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const columns = useMemo<ColumnDef<Invoice>[]>(
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
              INV <Hash />
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
          <div className="font-medium flex items-center gap-2">
            {row.getValue('invoiceNumber')}
            {row.original.custom && <Copyright className="text-primary" />}
          </div>
        )
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
            <div className="font-medium">{row.getValue('customerName')}</div>
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
        cell: ({ row }) => format(new Date(row.getValue('date')), 'MMM dd, yyyy'),
        sortingFn: 'datetime'
      },
      {
        accessorKey: 'dueDate',
        header: 'Due Date',
        cell: ({ row }) => {
          const dueDate = row.getValue('dueDate') as string | null;
          return dueDate ? format(new Date(dueDate), 'MMM dd, yyyy') : '-';
        }
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
        cell: ({ row }) => <div className="font-medium">{formatCurrency(row.getValue('totalAmount'))}</div>,
        sortingFn: 'basic'
      },
      {
        accessorKey: 'paidAmount',
        header: 'Paid',
        cell: ({ row }) => <div className="text-green-600">{formatCurrency(row.getValue('paidAmount'))}</div>
      },
      {
        accessorKey: 'balanceAmount',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 hover:bg-transparent"
            >
              Balance
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
        cell: ({ row }) => {
          const balance = row.getValue('balanceAmount') as number;
          return <div className={balance > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(balance)}</div>;
        }
      },
      {
        accessorKey: 'status',
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 hover:bg-transparent"
            >
              Status
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
        cell: ({ row }) => getStatusBadge(row.getValue('status')),
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        }
      },
      {
        accessorKey: 'market',
        header: 'Market',
        cell: ({ row }) => <Badge variant="outline">{row.getValue('market')}</Badge>,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        }
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const invoice = row.original;
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
                <Link href={`/invoices/${invoice.id}`}>
                  <DropdownMenuItem>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  hidden
                  disabled={downloadingPDF === invoice.id}
                  onClick={async () => {
                    setDownloadingPDF(invoice.id);
                    await printInvoicePDF(invoice.id, invoice.invoiceNumber, invoice.type);
                    setDownloadingPDF(null);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {downloadingPDF === invoice.id ? 'Generating...' : 'Download PDF'}
                </DropdownMenuItem>
                {invoice.status !== 'cancelled' && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        // For quotations and pending invoices, navigate to edit page
                        if (invoice.type === 'quotation' || invoice.status === 'pending') {
                          router.push(`/invoices/${invoice.id}/edit`);
                        } else {
                          // For paid/partial invoices, use dialog
                          setSelectedInvoice(invoice);
                          setEditDialogOpen(true);
                        }
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {invoice.type === 'invoice' && invoice.balanceAmount > 0 && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setPaymentDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Payment
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  disabled={invoice.status === 'cancelled' || invoice.status === 'paid'}
                  onClick={() => {
                    setSelectedInvoice(invoice);
                    setCancelDialogOpen(true);
                  }}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Cancel
                  {invoice.status === 'cancelled' && <span className="ml-2 text-xs">(Already cancelled)</span>}
                  {invoice.status === 'paid' && <span className="ml-2 text-xs">(Fully paid)</span>}
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
    data: invoices,
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

  const uniqueStatuses = Array.from(new Set(invoices.map(inv => inv.status)));
  const uniqueMarkets = Array.from(new Set(invoices.map(inv => inv.market)));

  // Check if we have no invoices at all (not just filtered out)
  const hasNoInvoicesAtAll = invoices.length === 0 && !dateRange;

  if (hasNoInvoicesAtAll) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Invoices found</h3>
        <p className="text-muted-foreground mb-4">Create your first invoice to get started</p>
        <Link href="/invoices/new">
          <Button>Create Invoice</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters Row 1 */}
        <div className="flex flex-wrap items-center gap-4">
          <InputGroup className="w-sm grow">
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
            value={(table.getColumn('status')?.getFilterValue() as string[])?.join(',') || 'all'}
            onValueChange={value => {
              table.getColumn('status')?.setFilterValue(value === 'all' ? undefined : [value]);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={(table.getColumn('market')?.getFilterValue() as string[])?.join(',') || 'all'}
            onValueChange={value => {
              table.getColumn('market')?.setFilterValue(value === 'all' ? undefined : [value]);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Markets</SelectItem>
              {uniqueMarkets.map(market => (
                <SelectItem key={market} value={market}>
                  {market}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filters Row 2 - Date Range */}
        <div className="flex flex-wrap items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <div className="flex gap-2 items-center font-semibold">
                <div>Date Range:</div>
                <Button
                  variant="outline"
                  className={cn('justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          {dateRange && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDateRangeChange(undefined)}
              className="h-8 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Clear dates
            </Button>
          )}
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

        <TablePagination table={table} itemName="Invoices" />
      </div>

      <ConfirmationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancel}
        title={`Cancel ${selectedInvoice?.type === 'invoice' ? 'Invoice' : 'Quotation'}`}
        description={`Are you sure you want to cancel ${selectedInvoice?.type === 'invoice' ? 'invoice' : 'quotation'} ${selectedInvoice?.invoiceNumber}? ${
          selectedInvoice?.stockDeducted ? 'Stock will be restored to inventory.' : 'This will mark it as cancelled.'
        }`}
        confirmText="Cancel Invoice"
        variant="destructive"
        isProcessing={isCancelling}
      />

      {selectedInvoice && (
        <>
          <AddPaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            invoiceId={selectedInvoice.id}
            balanceAmount={selectedInvoice.balanceAmount}
            onSuccess={handleRefresh}
          />

          <EditInvoiceDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            invoice={selectedInvoice}
            onSuccess={handleRefresh}
          />
        </>
      )}
    </>
  );
}
