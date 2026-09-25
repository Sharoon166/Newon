'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Invoice } from '../types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
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
  Search,
  Hash,
  Copyright,
  Download,
  Truck
} from 'lucide-react';
import Link from 'next/link';
import { updateInvoiceStatus, restoreInvoiceStock } from '../actions';
import { getDeliverySummary } from '../utils/delivery-summary';
import { INVOICE_EDIT_CUTOFF_DATE } from '@/constants';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
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
import { MoreHorizontal } from 'lucide-react';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { AddPaymentDialog } from './add-payment-dialog';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState
} from '@tanstack/react-table';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { printInvoicePDF } from '../utils/print-invoice';
import type { PaginatedInvoices } from '../types';
import { ServerPagination } from '@/components/general/server-pagination';

interface InvoicesTableProps {
  invoicesData: PaginatedInvoices;
  onRefresh?: () => void;
  userRole?: 'admin' | 'staff';
}

export function InvoicesTable({ invoicesData, onRefresh, userRole }: InvoicesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deliveryBlockedInvoice, setDeliveryBlockedInvoice] = useState<Invoice | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '');
  const debouncedSearchValue = useDebounce(searchValue, 500);

  const invoices = invoicesData.docs;

  // Sync the debounced search value into the URL.
  //
  // `searchParams` is a dependency and this effect calls router.push, which in
  // turn produces a new searchParams — so without the idempotence guard below,
  // every push re-triggered the effect and the page navigated forever. Bail out
  // when the URL already reflects the current search term.
  useEffect(() => {
    if ((searchParams.get('search') ?? '') === debouncedSearchValue) return;

    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearchValue) {
      params.set('search', debouncedSearchValue);
      params.set('page', '1'); // Reset to first page on search
    } else {
      params.delete('search');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [debouncedSearchValue, router, searchParams]);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  };

  const handleCancel = async () => {
    if (!selectedInvoice) return;

    // Goods already out of the shop have to be reversed on the Stock page
    // first - bail out before any stock is touched.
    const delivery = getDeliverySummary(selectedInvoice);
    if (delivery.delivered > 0) {
      setCancelDialogOpen(false);
      setDeliveryBlockedInvoice(selectedInvoice);
      return;
    }

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
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      toast.error(
        message || 'Cannot cancel invoice with payments. Please delete all payments first or process a refund/credit note instead.'
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

  /**
   * Physical delivery of goods, derived from `items[].deliveredQuantity`.
   *
   * Kept deliberately wordy ("Awaiting delivery" / "Partly delivered" /
   * "All units delivered") so it can't be mistaken for the payment-driven
   * `Status` badge next to it, which may also read "Delivered".
   */
  const getDeliveryBadge = (invoice: Invoice) => {
    const { applicable, total, delivered, pending } = getDeliverySummary(invoice);

    if (!applicable || total === 0) {
      return <span className="text-muted-foreground">—</span>;
    }

    if (delivered === 0) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 w-fit">
          <Clock className="h-3 w-3" />
          Awaiting delivery
        </Badge>
      );
    }

    if (pending === 0) {
      return (
        <Badge className="flex items-center gap-1 w-fit">
          <CheckCircle className="h-3 w-3" />
          All units delivered
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
        <Truck className="h-3 w-3" />
        Partly delivered {delivered}/{total}
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
            <Link href={`/invoices/${row.original.id}`} className="hover:underline">
              {row.getValue('invoiceNumber')}
            </Link>
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
        id: 'delivery',
        accessorFn: row => getDeliverySummary(row).ratio,
        header: ({ column }) => {
          const isSorted = column.getIsSorted();
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="p-0 hover:bg-transparent h-auto flex flex-col items-start gap-0.5"
            >
              <span className="flex items-center gap-1">
                Physical delivery
                {isSorted ? (
                  isSorted === 'asc' ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )
                ) : (
                  <ChevronDown className="h-4 w-4 opacity-50" />
                )}
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                units handed over from stock
              </span>
            </Button>
          );
        },
        cell: ({ row }) => getDeliveryBadge(row.original),
        sortingFn: 'basic'
      },
      {
        accessorKey: 'market',
        header: 'Market',
        cell: ({ row }) => <Badge variant="outline">{row.getValue('market')}</Badge>,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        }
      },
      // Staff may view the document but not edit, pay, or cancel it.
      {
        id: 'actions' as const,
        cell: ({ row }: { row: { original: Invoice } }) => {
          const invoice = row.original;
          const isEditRestricted = new Date(invoice.date) < INVOICE_EDIT_CUTOFF_DATE;
          const canManage = userRole !== 'staff';

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
                {canManage && invoice.status !== 'cancelled' && (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        router.push(`/invoices/${invoice.id}/edit`);
                      }}
                      disabled={isEditRestricted}
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
                {canManage && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      disabled={invoice.status === 'cancelled' || invoice.status === 'paid' || !!invoice.projectId}
                      onClick={() => {
                        // Deliveries block cancellation up-front so the user gets
                        // an explanation instead of a failed action later.
                        if (getDeliverySummary(invoice).delivered > 0) {
                          setDeliveryBlockedInvoice(invoice);
                          return;
                        }
                        setSelectedInvoice(invoice);
                        setCancelDialogOpen(true);
                      }}
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancel
                      {invoice.status === 'cancelled' && <span className="ml-2 text-xs">(Already cancelled)</span>}
                      {invoice.status === 'paid' && <span className="ml-2 text-xs">(Fully paid)</span>}
                      {invoice.projectId && <span className="ml-2 text-xs">(Project invoice)</span>}
                      {getDeliverySummary(invoice).delivered > 0 && (
                        <span className="ml-2 text-xs">(Reverse deliveries first)</span>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }
      }
    ],
    [userRole]
  );

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters
    }
  });

  return (
    <>
      <div className="space-y-4">
        {/* Filters Row 1 */}
        <div className="flex flex-wrap items-center gap-4">
          <InputGroup className="max-w-sm grow">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search all columns..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
            />
          </InputGroup>
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

        <ServerPagination
          currentPage={invoicesData.page || 1}
          totalPages={invoicesData.totalPages}
          totalDocs={invoicesData.totalDocs}
          hasNextPage={invoicesData.hasNextPage}
          hasPrevPage={invoicesData.hasPrevPage}
          pageSize={invoicesData.limit}
          itemName="invoices"
        />
      </div>

      <ConfirmationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleCancel}
        title={`Cancel ${selectedInvoice?.type === 'invoice' ? 'Invoice' : 'Quotation'}`}
        description={
          selectedInvoice?.projectId
            ? `This ${selectedInvoice?.type === 'invoice' ? 'invoice' : 'quotation'} is linked to a project and cannot be cancelled. Please manage it through the project page.`
            : `Are you sure you want to cancel ${selectedInvoice?.type === 'invoice' ? 'invoice' : 'quotation'} ${selectedInvoice?.invoiceNumber}? ${
                selectedInvoice?.stockDeducted
                  ? 'Stock will be restored to inventory.'
                  : 'This will mark it as cancelled.'
              }`
        }
        confirmText={selectedInvoice?.projectId ? undefined : 'Cancel Invoice'}
        variant="destructive"
        isProcessing={isCancelling}
      />

      {/* Cancellation is blocked while goods are still out for delivery. */}
      <AlertDialog
        open={!!deliveryBlockedInvoice}
        onOpenChange={open => {
          if (!open) setDeliveryBlockedInvoice(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse the deliveries first</AlertDialogTitle>
            <AlertDialogDescription>
              {deliveryBlockedInvoice && (
                <>
                  <span className="font-medium text-foreground">
                    {getDeliverySummary(deliveryBlockedInvoice).delivered} of{' '}
                    {getDeliverySummary(deliveryBlockedInvoice).total}
                  </span>{' '}
                  unit(s) on <span className="font-medium text-foreground">{deliveryBlockedInvoice.invoiceNumber}</span>{' '}
                  have already been handed over from stock, with{' '}
                  {getDeliverySummary(deliveryBlockedInvoice).pending} still pending.
                  <br />
                  <br />
                  Reverse those deliveries on the Stock page (History tab) first. Cancellation stays locked until the
                  stock page shows them as reversed.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/stock?tab=history">Open Stock history</Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedInvoice && (
        <>
          <AddPaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            invoiceId={selectedInvoice.id}
            balanceAmount={selectedInvoice.balanceAmount}
            onSuccess={handleRefresh}
          />
        </>
      )}
    </>
  );
}
