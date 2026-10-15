'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  Download,
  FileSpreadsheet,
  Trash2,
  Plus,
  Edit2,
  AlertCircle,
  PackagePlus,
  Banknote
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Purchase, PaginatedPurchases, PurchasePaymentStatus } from '../types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { exportToCsv } from '../utils/export-utils';
import { ServerPagination } from '@/components/general/server-pagination';
import {
  deletePurchase,
  getPurchasePayments,
  addPurchasePayment,
  deletePurchasePayment
} from '../actions';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { ReceiveDialog, type ReceiveTarget } from '@/features/stock/components/receive-dialog';
import { toast } from 'sonner';
import type { EnhancedVariants } from '@/features/inventory/types';
import { PurchaseForm } from './purchase-form';
import { PurchasePaymentDialog, type PaymentRow } from './purchase-payment-dialog';

export interface EnhancedPurchase extends Purchase {
  variant?: {
    id: string;
    sku: string;
    attributes?: Record<string, string>;
  };
  productName?: string;
}

interface PurchasesTableWithActionsProps {
  purchasesData: PaginatedPurchases;
  products: EnhancedVariants[];
  userRole?: 'admin' | 'staff';
  /** Stock tracking is set up - enables the inline "Receive" flow. */
  stockReady?: boolean;
}

export function PurchasesTableWithActions({
  purchasesData,
  products,
  userRole,
  stockReady = false
}: PurchasesTableWithActionsProps) {
  // Staff may create + view purchases; only admins may edit or delete.
  const canManage = userRole !== 'staff';
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([]);

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [supplierFilter, setSupplierFilter] = useState(searchParams.get('supplier') || 'all');

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<EnhancedPurchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addPurchaseOpen, setAddPurchaseOpen] = useState(false);
  const [editPurchaseOpen, setEditPurchaseOpen] = useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<EnhancedPurchase | null>(null);

  // Inline receiving - the same dialog the Stock page's "Awaiting arrival" tab uses.
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<ReceiveTarget | null>(null);

  // Partial payment tracking.
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPurchase, setPaymentPurchase] = useState<EnhancedPurchase | null>(null);
  const [paymentInitial, setPaymentInitial] = useState<PaymentRow[]>([]);

  const allSuppliers = useMemo(() => {
    const supplierSet = new Set<string>();
    purchasesData.docs.forEach(purchase => {
      if (purchase.supplier) supplierSet.add(purchase.supplier);
    });
    return Array.from(supplierSet).sort();
  }, [purchasesData]);

  const purchases = purchasesData.docs as EnhancedPurchase[];

  // Push debounced search to URL.
  // Bail out when the URL already matches, so mounting doesn't fire a
  // redundant navigation.
  useEffect(() => {
    if ((searchParams.get('search') ?? '') === debouncedSearch) return;

    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set('search', debouncedSearch);
      params.set('page', '1');
    } else {
      params.delete('search');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push supplier filter to URL immediately
  const handleSupplierChange = (value: string) => {
    setSupplierFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== 'all') {
      params.set('supplier', value);
      params.set('page', '1');
    } else {
      params.delete('supplier');
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const locations = useMemo(() => {
    const locationSet = new Map<string, { id: string; name: string; address?: string; isActive: boolean }>();
    products.forEach(product => {
      product.locations?.forEach(location => {
        if (location.isActive) {
          locationSet.set(location.id, {
            id: location.id,
            name: location.name,
            address: location.address,
            isActive: location.isActive
          });
        }
      });
    });
    return Array.from(locationSet.values());
  }, [products]);

  const getVariantDisplay = (purchase: EnhancedPurchase) => {
    if (!purchase.variant) return purchase.variantId;
    const attrString = purchase.variant.attributes
      ? Object.entries(purchase.variant.attributes)
          .map(([, value]) => value)
          .join(', ')
      : '';
    return attrString ? `${purchase.variant.sku} (${attrString})` : purchase.variant.sku;
  };

  const handleDeleteClick = (purchase: EnhancedPurchase) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!purchaseToDelete) return;
    try {
      setIsDeleting(true);
      await deletePurchase(purchaseToDelete.id || purchaseToDelete._id!);
      toast.success('Purchase deleted successfully');
      router.refresh();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete purchase');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
    }
  };

  const handleEditClick = (purchase: EnhancedPurchase) => {
    setPurchaseToEdit(purchase);
    setEditPurchaseOpen(true);
  };

  const handlePurchaseSuccess = () => {
    setAddPurchaseOpen(false);
    setEditPurchaseOpen(false);
    setPurchaseToEdit(null);
    router.refresh();
  };

  const handleReceiveClick = (purchase: EnhancedPurchase) => {
    setReceiveTarget({
      id: purchase.id || purchase._id!,
      purchaseId: purchase.purchaseId,
      productName: purchase.productName || 'Unknown product',
      sku: purchase.variant?.sku || purchase.variantId || '',
      ordered: purchase.quantity,
      // Same convention as the Stock page's "Awaiting arrival" tab: a purchase
      // that predates tracking has no receivedQuantity and counts as arrived.
      received: purchase.receivedQuantity ?? purchase.quantity,
      supplier: purchase.supplier
    });
    setReceiveOpen(true);
  };

  const pendingToReceive = (purchase: EnhancedPurchase) =>
    purchase.quantity - (purchase.receivedQuantity ?? purchase.quantity);

  const handlePaymentClick = async (purchase: EnhancedPurchase) => {
    try {
      const data = await getPurchasePayments(purchase.id || purchase._id!);
      setPaymentInitial(data as PaymentRow[]);
      setPaymentPurchase(purchase);
      setPaymentOpen(true);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load payments');
    }
  };

  const getPaymentStatus = (purchase: EnhancedPurchase): PurchasePaymentStatus => {
    if (purchase.paymentStatus) return purchase.paymentStatus;
    const paid = purchase.paidAmount || 0;
    const due = purchase.amountDue ?? (purchase.totalCost || 0) + (purchase.shippingCost || 0);
    if (paid <= 0) return 'unpaid';
    return paid >= due ? 'paid' : 'partial';
  };

  const renderPaymentStatus = (purchase: EnhancedPurchase) => {
    const status = getPaymentStatus(purchase);

    const badge =
      status === 'paid' ? (
        <Badge variant="default" className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-600">
          Paid
        </Badge>
      ) : status === 'partial' ? (
        <Badge variant="secondary" className="whitespace-nowrap bg-amber-100 text-amber-800 hover:bg-amber-100">
          Partial
        </Badge>
      ) : (
        <Badge variant="secondary" className="whitespace-nowrap">
          Unpaid
        </Badge>
      );

    return (
      <div className="flex flex-col items-start gap-0.5">
        {badge}
        {purchase.isUntracked && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Untracked</span>
        )}
      </div>
    );
  };

  const columns: ColumnDef<EnhancedPurchase>[] = [
    {
      accessorKey: 'purchaseId',
      header: 'Purchase ID',
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
          {row.original.purchaseId || 'N/A'}
        </Badge>
      )
    },
    {
      accessorKey: 'purchaseDate',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="p-0 hover:bg-transparent"
        >
          Date
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          )}
        </Button>
      ),
      cell: ({ row }) => <div className="whitespace-nowrap">{formatDate(row.original.purchaseDate)}</div>,
      sortingFn: 'datetime'
    },
    {
      accessorKey: 'productName',
      header: 'Product',
      cell: ({ row }) => <div className="font-medium">{row.original.productName || 'Unknown Product'}</div>
    },
    {
      accessorKey: 'variant',
      header: 'Variant',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono whitespace-nowrap">
          {getVariantDisplay(row.original)}
        </Badge>
      )
    },
    {
      accessorKey: 'origin',
      header: 'Origin',
      cell: ({ row }) => {
        const origin = row.original.origin === 'imported' ? 'imported' : 'local';
        return (
          <Badge
            variant={origin === 'imported' ? 'secondary' : 'outline'}
            className="whitespace-nowrap font-medium capitalize"
          >
            {origin === 'imported' ? 'Imported' : 'Local'}
          </Badge>
        );
      }
    },
    {
      accessorKey: 'supplier',
      header: 'Supplier',
      cell: ({ row }) => <Badge variant="secondary">{row.original.supplier}</Badge>
    },
    {
      accessorKey: 'quantity',
      header: 'Qty',
      cell: ({ row }) => row.original.quantity
    },
    {
      accessorKey: 'remaining',
      header: 'Remaining',
      cell: ({ row }) => (
        <span className={row.original.remaining < row.original.quantity ? 'text-orange-600 font-medium' : ''}>
          {row.original.remaining}
        </span>
      )
    },
    // Mirrors the "Delivered x / y" column on invoices - only meaningful once
    // stock tracking has been set up.
    ...(stockReady
      ? [
          {
            id: 'received',
            header: 'Received',
            cell: ({ row }: { row: { original: EnhancedPurchase } }) => {
              const received = row.original.receivedQuantity ?? row.original.quantity;
              const pending = Math.max(0, row.original.quantity - received);
              return (
                <span className="whitespace-nowrap">
                  <span className={pending > 0 ? 'font-medium text-orange-600' : 'font-medium'}>{received}</span>
                  <span className="text-muted-foreground"> / {row.original.quantity}</span>
                  {pending > 0 && <span className="ml-1 text-xs text-muted-foreground">({pending} to come)</span>}
                </span>
              );
            }
          } satisfies ColumnDef<EnhancedPurchase>
        ]
      : []),
    {
      accessorKey: 'unitPrice',
      header: 'Unit Price',
      cell: ({ row }) => formatCurrency(row.original.unitPrice)
    },
    {
      accessorKey: 'retailPrice',
      header: 'Retail Price',
      cell: ({ row }) => formatCurrency(row.original.retailPrice || 0)
    },
    {
      accessorKey: 'totalCost',
      header: 'Total',
      cell: ({ row }) => <div className="font-medium">{formatCurrency(row.original.totalCost)}</div>
    },
    {
      accessorKey: 'paidAmount',
      header: 'Paid',
      cell: ({ row }) => formatCurrency(row.original.paidAmount || 0)
    },
    {
      accessorKey: 'balanceAmount',
      header: 'Balance',
      cell: ({ row }) => {
        const balance = row.original.balanceAmount ?? 0;
        return (
          <div className={balance > 0 ? 'font-medium text-orange-600' : ''}>{formatCurrency(balance)}</div>
        );
      }
    },
    {
      id: 'paymentStatus',
      header: 'Payment',
      cell: ({ row }) => renderPaymentStatus(row.original)
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          {stockReady && pendingToReceive(row.original) > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleReceiveClick(row.original)}
              title="Receive stock"
            >
              <PackagePlus className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePaymentClick(row.original)}
            disabled={row.original.isUntracked}
            title={
              row.original.isUntracked
                ? 'Payment tracking was not available when this purchase was made'
                : 'Payments'
            }
          >
            <Banknote className="h-4 w-4" />
          </Button>
          {canManage && (
            <Button variant="ghost" size="icon" onClick={() => handleEditClick(row.original)} title="Edit purchase">
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {canManage && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteClick(row.original)}
              disabled={row.original.remaining < row.original.quantity}
              title={
                row.original.remaining < row.original.quantity
                  ? `Cannot delete: ${row.original.quantity - row.original.remaining} unit(s) already sold`
                  : 'Delete purchase'
              }
            >
              <Trash2
                className={row.original.remaining < row.original.quantity ? 'text-muted-foreground' : 'text-destructive'}
              />
            </Button>
          )}
          {canManage && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/inventory/${row.original.productId}/edit`)}
              title="Go to product"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  const table = useReactTable({
    data: purchases,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  const handleExportCsv = () => {
    const data = table.getRowModel().rows.map(row => ({
      'Purchase Date': formatDate(row.original.purchaseDate),
      Product: row.original.productName || 'Unknown',
      Variant: row.original.variant?.sku || row.original.variantId || '',
      Supplier: row.original.supplier || '',
      Quantity: row.original.quantity,
      Remaining: row.original.remaining,
      'Unit Price': String(formatCurrency(row.original.unitPrice || 0)),
      'Retail Price': String(formatCurrency(row.original.retailPrice || 0)),
      'Wholesale Price': String(formatCurrency(row.original.wholesalePrice || 0)),
      'Shipping Cost': String(formatCurrency(row.original.shippingCost || 0)),
      'Total Cost': String(formatCurrency(row.original.totalCost)),
      Paid: String(formatCurrency(row.original.paidAmount || 0)),
      Balance: String(formatCurrency(row.original.balanceAmount ?? 0)),
      'Payment Status': row.original.isUntracked ? 'Paid (untracked)' : getPaymentStatus(row.original)
    }));
    exportToCsv(data, `purchases-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    router.push('/purchases/print');
  };

  return (
    <div className="w-full max-w-7xl overflow-x-auto mx-auto">
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by product, SKU, or supplier..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-8"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setAddPurchaseOpen(true)} disabled={products.length === 0} className="grow">
              <Plus className="mr-2 h-4 w-4" />
              Add Purchase
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportCsv}>
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPdf}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Select value={supplierFilter} onValueChange={handleSupplierChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {allSuppliers.map(supplier => (
                  <SelectItem key={supplier} value={supplier}>
                    {supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="rounded-md border">
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
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} className="hover:bg-muted/50">
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

      <ServerPagination
        currentPage={purchasesData.page}
        totalPages={purchasesData.totalPages}
        totalDocs={purchasesData.totalDocs}
        hasNextPage={purchasesData.hasNextPage}
        hasPrevPage={purchasesData.hasPrevPage}
        pageSize={purchasesData.limit}
        itemName="purchases"
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Purchase?"
        description={
          purchaseToDelete
            ? `Are you sure you want to delete this purchase? This will remove ${purchaseToDelete.quantity} unit(s) from inventory and cannot be undone. ${
                purchaseToDelete.remaining === purchaseToDelete.quantity
                  ? 'All units are still available (none have been sold).'
                  : ''
              }`
            : 'Are you sure you want to delete this purchase?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        icon={<AlertCircle className="h-12 w-12 text-destructive" />}
        onConfirm={handleDeleteConfirm}
        isProcessing={isDeleting}
      />

      <ReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        target={receiveTarget}
        onSuccess={() => router.refresh()}
      />

      {paymentPurchase && (
        <PurchasePaymentDialog
          key={paymentPurchase.id || paymentPurchase._id}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          purchaseId={paymentPurchase.id || paymentPurchase._id!}
          purchaseLabel={paymentPurchase.purchaseId}
          amountDue={paymentPurchase.amountDue ?? (paymentPurchase.totalCost || 0) + (paymentPurchase.shippingCost || 0)}
          initialPayments={paymentInitial}
          getPayments={getPurchasePayments}
          addPayment={addPurchasePayment}
          deletePayment={deletePurchasePayment}
          onSuccess={() => router.refresh()}
        />
      )}

      <PurchaseForm
        productId=""
        variants={products}
        locations={locations}
        open={addPurchaseOpen}
        onOpenChange={setAddPurchaseOpen}
        onSuccess={handlePurchaseSuccess}
      />

      {purchaseToEdit && (
        <PurchaseForm
          productId={purchaseToEdit.productId}
          variantId={purchaseToEdit.variantId}
          variants={products.filter(p => p.productId === purchaseToEdit.productId)}
          purchase={purchaseToEdit}
          locations={locations}
          open={editPurchaseOpen}
          onOpenChange={setEditPurchaseOpen}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}
