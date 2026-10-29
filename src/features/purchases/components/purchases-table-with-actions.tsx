// 'use client';
//
// import { useState, useEffect, useMemo } from 'react';
// import {
//   ColumnDef,
//   SortingState,
//   flexRender,
//   getCoreRowModel,
//   getSortedRowModel,
//   useReactTable
// } from '@tanstack/react-table';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { Badge } from '@/components/ui/badge';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger
// } from '@/components/ui/dropdown-menu';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import {
//   ChevronDown,
//   ChevronUp,
//   Search,
//   ExternalLink,
//   Download,
//   FileSpreadsheet,
//   Trash2,
//   Plus,
//   Edit2,
//   AlertCircle,
//   PackagePlus,
//   Banknote,
//   MoreHorizontal
// } from 'lucide-react';
// import { formatCurrency, formatDate } from '@/lib/utils';
// import { Purchase, PaginatedPurchases, PurchasePaymentStatus } from '../types';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { useDebounce } from '@/hooks/use-debounce';
// import { exportToCsv } from '../utils/export-utils';
// import { ServerPagination } from '@/components/general/server-pagination';
// import {
//   deletePurchase,
//   getPurchasePayments,
//   addPurchasePayment,
//   deletePurchasePayment
// } from '../actions';
// import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
// import { ReceiveDialog, type ReceiveTarget } from '@/features/stock/components/receive-dialog';
// import { toast } from 'sonner';
// import type { EnhancedVariants } from '@/features/inventory/types';
// import { PurchaseForm } from './purchase-form';
// import { PurchasePaymentDialog, type PaymentRow } from './purchase-payment-dialog';
//
// export interface EnhancedPurchase extends Purchase {
//   variant?: {
//     id: string;
//     sku: string;
//     attributes?: Record<string, string>;
//   };
//   productName?: string;
// }
//
// interface PurchasesTableWithActionsProps {
//   purchasesData: PaginatedPurchases;
//   products: EnhancedVariants[];
//   userRole?: 'admin' | 'staff';
//   /** Stock tracking is set up - enables the inline "Receive" flow. */
//   stockReady?: boolean;
// }
//
// export function PurchasesTableWithActions({
//   purchasesData,
//   products,
//   userRole,
//   stockReady = false
// }: PurchasesTableWithActionsProps) {
//   // Staff may create + view purchases; only admins may edit or delete.
//   const canManage = userRole !== 'staff';
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const [sorting, setSorting] = useState<SortingState>([]);
//
//   const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
//   const debouncedSearch = useDebounce(searchInput, 400);
//   const [supplierFilter, setSupplierFilter] = useState(searchParams.get('supplier') || 'all');
//
//   // Dialog states
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [purchaseToDelete, setPurchaseToDelete] = useState<EnhancedPurchase | null>(null);
//   const [isDeleting, setIsDeleting] = useState(false);
//   const [addPurchaseOpen, setAddPurchaseOpen] = useState(false);
//   const [editPurchaseOpen, setEditPurchaseOpen] = useState(false);
//   const [purchaseToEdit, setPurchaseToEdit] = useState<EnhancedPurchase | null>(null);
//
//   // Inline receiving - the same dialog the Stock page's "Awaiting arrival" tab uses.
//   const [receiveOpen, setReceiveOpen] = useState(false);
//   const [receiveTarget, setReceiveTarget] = useState<ReceiveTarget | null>(null);
//
//   // Partial payment tracking.
//   const [paymentOpen, setPaymentOpen] = useState(false);
//   const [paymentPurchase, setPaymentPurchase] = useState<EnhancedPurchase | null>(null);
//   const [paymentInitial, setPaymentInitial] = useState<PaymentRow[]>([]);
//
//   const allSuppliers = useMemo(() => {
//     const supplierSet = new Set<string>();
//     purchasesData.docs.forEach(purchase => {
//       if (purchase.supplier) supplierSet.add(purchase.supplier);
//     });
//     return Array.from(supplierSet).sort();
//   }, [purchasesData]);
//
//   const purchases = purchasesData.docs as EnhancedPurchase[];
//
//   // Push debounced search to URL.
//   // Bail out when the URL already matches, so mounting doesn't fire a
//   // redundant navigation.
//   useEffect(() => {
//     if ((searchParams.get('search') ?? '') === debouncedSearch) return;
//
//     const params = new URLSearchParams(searchParams.toString());
//     if (debouncedSearch) {
//       params.set('search', debouncedSearch);
//       params.set('page', '1');
//     } else {
//       params.delete('search');
//     }
//     router.push(`?${params.toString()}`, { scroll: false });
//   }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps
//
//   // Push supplier filter to URL immediately
//   const handleSupplierChange = (value: string) => {
//     setSupplierFilter(value);
//     const params = new URLSearchParams(searchParams.toString());
//     if (value && value !== 'all') {
//       params.set('supplier', value);
//       params.set('page', '1');
//     } else {
//       params.delete('supplier');
//     }
//     router.push(`?${params.toString()}`, { scroll: false });
//   };
//
//   const locations = useMemo(() => {
//     const locationSet = new Map<string, { id: string; name: string; address?: string; isActive: boolean }>();
//     products.forEach(product => {
//       product.locations?.forEach(location => {
//         if (location.isActive) {
//           locationSet.set(location.id, {
//             id: location.id,
//             name: location.name,
//             address: location.address,
//             isActive: location.isActive
//           });
//         }
//       });
//     });
//     return Array.from(locationSet.values());
//   }, [products]);
//
//   const getVariantDisplay = (purchase: EnhancedPurchase) => {
//     if (!purchase.variant) return purchase.variantId;
//     const attrString = purchase.variant.attributes
//       ? Object.entries(purchase.variant.attributes)
//           .map(([, value]) => value)
//           .join(', ')
//       : '';
//     return attrString ? `${purchase.variant.sku} (${attrString})` : purchase.variant.sku;
//   };
//
//   const handleDeleteClick = (purchase: EnhancedPurchase) => {
//     setPurchaseToDelete(purchase);
//     setDeleteDialogOpen(true);
//   };
//
//   const handleDeleteConfirm = async () => {
//     if (!purchaseToDelete) return;
//     try {
//       setIsDeleting(true);
//       await deletePurchase(purchaseToDelete.id || purchaseToDelete._id!);
//       toast.success('Purchase deleted successfully');
//       router.refresh();
//     } catch (error) {
//       console.error('Error deleting purchase:', error);
//       toast.error(error instanceof Error ? error.message : 'Failed to delete purchase');
//     } finally {
//       setIsDeleting(false);
//       setDeleteDialogOpen(false);
//       setPurchaseToDelete(null);
//     }
//   };
//
//   const handleEditClick = (purchase: EnhancedPurchase) => {
//     setPurchaseToEdit(purchase);
//     setEditPurchaseOpen(true);
//   };
//
//   const handlePurchaseSuccess = () => {
//     setAddPurchaseOpen(false);
//     setEditPurchaseOpen(false);
//     setPurchaseToEdit(null);
//     router.refresh();
//   };
//
//   const handleReceiveClick = (purchase: EnhancedPurchase) => {
//     setReceiveTarget({
//       id: purchase.id || purchase._id!,
//       purchaseId: purchase.purchaseId,
//       productName: purchase.productName || 'Unknown product',
//       sku: purchase.variant?.sku || purchase.variantId || '',
//       ordered: purchase.quantity,
//       // Same convention as the Stock page's "Awaiting arrival" tab: a purchase
//       // that predates tracking has no receivedQuantity and counts as arrived.
//       received: purchase.receivedQuantity ?? purchase.quantity,
//       supplier: purchase.supplier
//     });
//     setReceiveOpen(true);
//   };
//
//   const pendingToReceive = (purchase: EnhancedPurchase) =>
//     purchase.quantity - (purchase.receivedQuantity ?? purchase.quantity);
//
//   const handlePaymentClick = async (purchase: EnhancedPurchase) => {
//     try {
//       const data = await getPurchasePayments(purchase.id || purchase._id!);
//       setPaymentInitial(data as PaymentRow[]);
//       setPaymentPurchase(purchase);
//       setPaymentOpen(true);
//     } catch (error) {
//       console.error('Error loading payments:', error);
//       toast.error('Failed to load payments');
//     }
//   };
//
//   const getPaymentStatus = (purchase: EnhancedPurchase): PurchasePaymentStatus => {
//     if (purchase.paymentStatus) return purchase.paymentStatus;
//     const paid = purchase.paidAmount || 0;
//     const due = purchase.amountDue ?? (purchase.purchasePrice ?? purchase.unitPrice) * purchase.quantity;
//     if (paid <= 0) return 'unpaid';
//     return paid >= due ? 'paid' : 'partial';
//   };
//
//   const renderPaymentStatus = (purchase: EnhancedPurchase) => {
//     const status = getPaymentStatus(purchase);
//
//     const badge =
//       status === 'paid' ? (
//         <Badge variant="default" className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-600">
//           Paid
//         </Badge>
//       ) : status === 'partial' ? (
//         <Badge variant="secondary" className="whitespace-nowrap bg-amber-100 text-amber-800 hover:bg-amber-100">
//           Partial
//         </Badge>
//       ) : (
//         <Badge variant="secondary" className="whitespace-nowrap">
//           Unpaid
//         </Badge>
//       );
//
//     return (
//       <div className="flex flex-col items-start gap-0.5">
//         {badge}
//         {purchase.isUntracked && (
//           <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Untracked</span>
//         )}
//       </div>
//     );
//   };
//
//   const columns: ColumnDef<EnhancedPurchase>[] = [
//     {
//       accessorKey: 'purchaseId',
//       header: 'Purchase ID',
//       cell: ({ row }) => (
//         <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
//           {row.original.purchaseId || 'N/A'}
//         </Badge>
//       )
//     },
//     {
//       accessorKey: 'purchaseDate',
//       header: ({ column }) => (
//         <Button
//           variant="ghost"
//           onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
//           className="p-0 hover:bg-transparent"
//         >
//           Date
//           {column.getIsSorted() === 'asc' ? (
//             <ChevronUp className="ml-2 h-4 w-4" />
//           ) : column.getIsSorted() === 'desc' ? (
//             <ChevronDown className="ml-2 h-4 w-4" />
//           ) : (
//             <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
//           )}
//         </Button>
//       ),
//       cell: ({ row }) => <div className="whitespace-nowrap">{formatDate(row.original.purchaseDate)}</div>,
//       sortingFn: 'datetime'
//     },
//     {
//       accessorKey: 'productName',
//       header: 'Product',
//       cell: ({ row }) => <div className="font-medium">{row.original.productName || 'Unknown Product'} </div>
//     },
//     {
//       accessorKey: 'variant',
//       header: 'Variant',
//       cell: ({ row }) => (
//         <Badge variant="outline" className="font-mono whitespace-nowrap">
//           {getVariantDisplay(row.original)}
//         </Badge>
//       )
//     },
//     {
//       accessorKey: 'origin',
//       header: 'Origin',
//       cell: ({ row }) => {
//         const origin = row.original.origin === 'imported' ? 'imported' : 'local';
//         return (
//           <Badge
//             variant={origin === 'imported' ? 'secondary' : 'outline'}
//             className="whitespace-nowrap font-medium capitalize"
//           >
//             {origin === 'imported' ? 'Imported' : 'Local'}
//           </Badge>
//         );
//       }
//     },
//     {
//       accessorKey: 'supplier',
//       header: 'Supplier',
//       cell: ({ row }) => <Badge variant="secondary">{row.original.supplier}</Badge>
//     },
//     {
//       accessorKey: 'quantity',
//       header: 'Qty',
//       cell: ({ row }) => row.original.quantity
//     },
//     {
//       accessorKey: 'remaining',
//       header: 'Remaining',
//       cell: ({ row }) => (
//         <span className={row.original.remaining < row.original.quantity ? 'text-orange-600 font-medium' : ''}>
//           {row.original.remaining}
//         </span>
//       )
//     },
//     // Mirrors the "Delivered x / y" column on invoices - only meaningful once
//     // stock tracking has been set up.
//     ...(stockReady
//       ? [
//           {
//             id: 'received',
//             header: 'Received',
//             cell: ({ row }: { row: { original: EnhancedPurchase } }) => {
//               const received = row.original.receivedQuantity ?? row.original.quantity;
//               const pending = Math.max(0, row.original.quantity - received);
//               return (
//                 <span className="whitespace-nowrap">
//                   <span className={pending > 0 ? 'font-medium text-orange-600' : 'font-medium'}>{received}</span>
//                   <span className="text-muted-foreground"> / {row.original.quantity}</span>
//                   {pending > 0 && <span className="ml-1 text-xs text-muted-foreground">({pending} to come)</span>}
//                 </span>
//               );
//             }
//           } satisfies ColumnDef<EnhancedPurchase>
//         ]
//       : []),
//     {
//       accessorKey: 'unitPrice',
//       header: 'Unit Price',
//       cell: ({ row }) => formatCurrency(row.original.unitPrice)
//     },
//     {
//       accessorKey: 'retailPrice',
//       header: 'Retail Price',
//       cell: ({ row }) => formatCurrency(row.original.retailPrice || 0)
//     },
//     {
//       accessorKey: 'totalCost',
//       header: 'Total',
//       cell: ({ row }) => <div className="font-medium">{formatCurrency(row.original.totalCost)}</div>
//     },
//     // Supplier money columns are admin-only: staff neither see nor act on
//     // what has been paid or is owed.
//     ...(canManage
//       ? [
//           {
//             accessorKey: 'paidAmount',
//             header: 'Paid',
//             cell: ({ row }: { row: { original: EnhancedPurchase } }) =>
//               formatCurrency(row.original.paidAmount || 0)
//           } satisfies ColumnDef<EnhancedPurchase>,
//           {
//             accessorKey: 'balanceAmount',
//             header: 'Balance',
//             cell: ({ row }: { row: { original: EnhancedPurchase } }) => {
//               const balance = row.original.balanceAmount ?? 0;
//               return (
//                 <div className={balance > 0 ? 'font-medium text-orange-600' : ''}>{formatCurrency(balance)}</div>
//               );
//             }
//           } satisfies ColumnDef<EnhancedPurchase>
//         ]
//       : []),
//     {
//       id: 'paymentStatus',
//       header: 'Payment',
//       cell: ({ row }) => renderPaymentStatus(row.original)
//     },
//     {
//       id: 'actions',
//       cell: ({ row }) => (
//         <div className="flex justify-end gap-1">
//           {stockReady && pendingToReceive(row.original) > 0 && (
//             <Button
//               variant="ghost"
//               size="icon"
//               onClick={() => handleReceiveClick(row.original)}
//               title="Receive stock"
//             >
//               <PackagePlus className="h-4 w-4" />
//             </Button>
//           )}
//           {canManage && (
//             <Button
//               variant="ghost"
//               size="icon"
//               onClick={() => handlePaymentClick(row.original)}
//               disabled={row.original.isUntracked}
//               title={
//                 row.original.isUntracked
//                   ? 'Payment tracking was not available when this purchase was made'
//                   : 'Payments'
//               }
//             >
//               <Banknote className="h-4 w-4" />
//             </Button>
//           )}
//           {canManage && (
//             <Button
//               variant="ghost"
//               // size="icon"
//               onClick={() => router.push(`/inventory/${row.original.productId}/edit`)}
//               title="Go to product"
//             >
//               <ExternalLink className="h-4 w-4" />
//             </Button>
//           )}
//           {canManage && (
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <Button variant="ghost" size="icon" title="More actions">
//                   <MoreHorizontal className="h-4 w-4" />
//                 </Button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent align="end">
//                 <DropdownMenuItem onClick={() => handleEditClick(row.original)}>
//                   <Edit2 className="mr-2 h-4 w-4" />
//                   Edit purchase
//                 </DropdownMenuItem>
//                 <DropdownMenuItem
//                   onClick={() => handleDeleteClick(row.original)}
//                   disabled={row.original.remaining < row.original.quantity}
//                   title={
//                     row.original.remaining < row.original.quantity
//                       ? `Cannot delete: ${row.original.quantity - row.original.remaining} unit(s) already sold`
//                       : 'Delete purchase'
//                   }
//                   className="text-destructive focus:text-destructive"
//                 >
//                   <Trash2 className="mr-2 h-4 w-4" />
//                   Delete purchase
//                 </DropdownMenuItem>
//               </DropdownMenuContent>
//             </DropdownMenu>
//           )}
//         </div>
//       )
//     }
//   ];
//
//   const table = useReactTable({
//     data: purchases,
//     columns,
//     state: { sorting },
//     onSortingChange: setSorting,
//     getCoreRowModel: getCoreRowModel(),
//     getSortedRowModel: getSortedRowModel()
//   });
//
//   const handleExportCsv = () => {
//     const data = table.getRowModel().rows.map(row => ({
//       'Purchase Date': formatDate(row.original.purchaseDate),
//       Product: row.original.productName || 'Unknown',
//       Variant: row.original.variant?.sku || row.original.variantId || '',
//       Supplier: row.original.supplier || '',
//       Quantity: row.original.quantity,
//       Remaining: row.original.remaining,
//       'Unit Price': String(formatCurrency(row.original.unitPrice || 0)),
//       'Retail Price': String(formatCurrency(row.original.retailPrice || 0)),
//       'Wholesale Price': String(formatCurrency(row.original.wholesalePrice || 0)),
//       'Shipping Cost': String(formatCurrency(row.original.shippingCost || 0)),
//       'Total Cost': String(formatCurrency(row.original.totalCost)),
//       // Supplier money columns are admin-only, same as in the table.
//       ...(canManage
//         ? {
//             Paid: String(formatCurrency(row.original.paidAmount || 0)),
//             Balance: String(formatCurrency(row.original.balanceAmount ?? 0))
//           }
//         : {}),
//       'Payment Status': row.original.isUntracked ? 'Paid (untracked)' : getPaymentStatus(row.original)
//     }));
//     exportToCsv(data, `purchases-${new Date().toISOString().split('T')[0]}`);
//   };
//
//   const handleExportPdf = () => {
//     router.push('/purchases/print');
//   };
//
//   return (
//     <div className="w-full max-w-7xl overflow-x-auto mx-auto">
//       <div className="flex flex-col gap-4 py-4">
//         <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
//           <div className="relative w-full md:w-96">
//             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
//             <Input
//               type="search"
//               placeholder="Search by product, SKU, or supplier..."
//               value={searchInput}
//               onChange={e => setSearchInput(e.target.value)}
//               className="w-full pl-8"
//             />
//           </div>
//           <div className="flex flex-wrap items-center gap-2">
//             <Button onClick={() => setAddPurchaseOpen(true)} disabled={products.length === 0} className="grow">
//               <Plus className="mr-2 h-4 w-4" />
//               Add Purchase
//             </Button>
//             <Button variant="outline" size="sm" className="gap-1" onClick={handleExportCsv}>
//               <FileSpreadsheet className="h-4 w-4" />
//               <span className="hidden sm:inline">CSV</span>
//             </Button>
//             <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPdf}>
//               <Download className="h-4 w-4" />
//               <span className="hidden sm:inline">PDF</span>
//             </Button>
//             <Select value={supplierFilter} onValueChange={handleSupplierChange}>
//               <SelectTrigger className="w-45">
//                 <SelectValue placeholder="Filter by supplier" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Suppliers</SelectItem>
//                 {allSuppliers.map(supplier => (
//                   <SelectItem key={supplier} value={supplier}>
//                     {supplier}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//         </div>
//       </div>
//
//       <div className="rounded-md border">
//         <Table>
//           <TableHeader>
//             {table.getHeaderGroups().map(headerGroup => (
//               <TableRow key={headerGroup.id}>
//                 {headerGroup.headers.map(header => (
//                   <TableHead key={header.id}>
//                     {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
//                   </TableHead>
//                 ))}
//               </TableRow>
//             ))}
//           </TableHeader>
//           <TableBody>
//             {table.getRowModel().rows?.length ? (
//               table.getRowModel().rows.map(row => (
//                 <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'} className="hover:bg-muted/50">
//                   {row.getVisibleCells().map(cell => (
//                     <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
//                   ))}
//                 </TableRow>
//               ))
//             ) : (
//               <TableRow>
//                 <TableCell colSpan={columns.length} className="h-24 text-center">
//                   No results.
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </div>
//
//       <ServerPagination
//         currentPage={purchasesData.page}
//         totalPages={purchasesData.totalPages}
//         totalDocs={purchasesData.totalDocs}
//         hasNextPage={purchasesData.hasNextPage}
//         hasPrevPage={purchasesData.hasPrevPage}
//         pageSize={purchasesData.limit}
//         itemName="purchases"
//       />
//
//       <ConfirmationDialog
//         open={deleteDialogOpen}
//         onOpenChange={setDeleteDialogOpen}
//         title="Delete Purchase?"
//         description={
//           purchaseToDelete
//             ? `Are you sure you want to delete this purchase? This will remove ${purchaseToDelete.quantity} unit(s) from inventory and cannot be undone. ${
//                 purchaseToDelete.remaining === purchaseToDelete.quantity
//                   ? 'All units are still available (none have been sold).'
//                   : ''
//               }`
//             : 'Are you sure you want to delete this purchase?'
//         }
//         confirmText="Delete"
//         cancelText="Cancel"
//         variant="destructive"
//         icon={<AlertCircle className="h-12 w-12 text-destructive" />}
//         onConfirm={handleDeleteConfirm}
//         isProcessing={isDeleting}
//       />
//
//       <ReceiveDialog
//         open={receiveOpen}
//         onOpenChange={setReceiveOpen}
//         target={receiveTarget}
//         onSuccess={() => router.refresh()}
//       />
//
//       {paymentPurchase && (
//         <PurchasePaymentDialog
//           key={paymentPurchase.id || paymentPurchase._id}
//           open={paymentOpen}
//           onOpenChange={setPaymentOpen}
//           purchaseId={paymentPurchase.id || paymentPurchase._id!}
//           purchaseLabel={paymentPurchase.purchaseId}
//           amountDue={
//             paymentPurchase.amountDue ??
//             (paymentPurchase.purchasePrice ?? paymentPurchase.unitPrice) * paymentPurchase.quantity
//           }
//           initialPayments={paymentInitial}
//           getPayments={getPurchasePayments}
//           addPayment={addPurchasePayment}
//           deletePayment={deletePurchasePayment}
//           onSuccess={() => router.refresh()}
//         />
//       )}
//
//       <PurchaseForm
//         productId=""
//         variants={products}
//         locations={locations}
//         open={addPurchaseOpen}
//         onOpenChange={setAddPurchaseOpen}
//         onSuccess={handlePurchaseSuccess}
//       />
//
//       {purchaseToEdit && (
//         <PurchaseForm
//           productId={purchaseToEdit.productId}
//           variantId={purchaseToEdit.variantId}
//           variants={products.filter(p => p.productId === purchaseToEdit.productId)}
//           purchase={purchaseToEdit}
//           locations={locations}
//           open={editPurchaseOpen}
//           onOpenChange={setEditPurchaseOpen}
//           onSuccess={handlePurchaseSuccess}
//         />
//       )}
//     </div>
//   );
// }
'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import {
  Column,
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
  Banknote,
  MoreHorizontal,
  Columns3,
  Filter,
  ShieldAlert
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { Purchase, PaginatedPurchases, PurchasePaymentStatus } from '../types';
import { DEFAULT_PURCHASE_SORT, parsePurchaseSort } from '../sort';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/use-debounce';
import { exportToCsv } from '../utils/export-utils';
import { ServerPagination } from '@/components/general/server-pagination';
import { deletePurchase, getPurchasePayments, addPurchasePayment, deletePurchasePayment } from '../actions';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { PurchaseDeleteBlockedDialog } from './purchase-delete-blocked-dialog';
import { resolvePurchasePaymentBlock, type PurchasePaymentBlock } from '../utils/delete-guard';
import { ReceiveDialog, type ReceiveTarget } from '@/features/stock/components/receive-dialog';
import { MarkDamagedDialog, type MarkDamagedTarget } from '@/features/stock/components/mark-damaged-dialog';
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
  /**
   * Supplier options for the filter dropdown, loaded from the Supplier
   * collection by the page. Falls back to the suppliers on the loaded rows
   * when omitted.
   */
  suppliers?: Array<{ supplierId: string; name: string }>;
  userRole?: 'admin' | 'staff';
  /** May the caller see cost data (cost, unit price, payments) of imported products. */
  canViewImportedCosts?: boolean;
  /** May the caller record a purchase against an imported product. */
  canCreateImported?: boolean;
  /** Stock tracking is set up - enables the inline "Receive" flow. */
  stockReady?: boolean;
}

// Column ids that should be right-aligned (numbers and actions).
const RIGHT_ALIGNED = new Set(['totalCost', 'retailPrice', 'actions']);

// Labels shown in the Columns menu.
const COLUMN_LABELS: Record<string, string> = {
  purchaseDate: 'Purchase',
  productName: 'Product',
  origin: 'Origin',
  supplier: 'Supplier',
  stock: 'Stock',
  totalCost: 'Cost',
  retailPrice: 'Retail price',
  amountPaid: 'Paid',
  paymentStatus: 'Payment status'
};

const getVariantDisplay = (purchase: EnhancedPurchase) => {
  if (!purchase.variant) return purchase.variantId;
  const attrString = purchase.variant.attributes
    ? Object.entries(purchase.variant.attributes)
        .map(([, value]) => value)
        .join(', ')
    : '';
  return attrString ? `${purchase.variant.sku} (${attrString})` : purchase.variant.sku;
};

const getPaymentStatus = (purchase: EnhancedPurchase): PurchasePaymentStatus => {
  if (purchase.paymentStatus) return purchase.paymentStatus;
  const paid = purchase.paidAmount || 0;
  const due = purchase.amountDue ?? (purchase.purchasePrice ?? purchase.unitPrice) * purchase.quantity;
  if (paid <= 0) return 'unpaid';
  return paid >= due ? 'paid' : 'partial';
};

const getAmountDue = (purchase: EnhancedPurchase) =>
  purchase.amountDue ?? (purchase.purchasePrice ?? purchase.unitPrice) * purchase.quantity;

const pendingToReceive = (purchase: EnhancedPurchase) =>
  Math.max(0, purchase.quantity - (purchase.receivedQuantity ?? purchase.quantity));

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

/**
 * Header button for a server-sorted column.
 *
 * It always passes an explicit direction to `toggleSorting`, so a click flips
 * asc <-> desc and can never clear the sort: the URL-backed sort has no
 * "unsorted" state (the server defaults to newest-first). The click writes
 * `?sort=&dir=&page=1`, which refetches the page from the server in that order.
 */
function SortHeader({
  column,
  label,
  disabled
}: {
  column: Column<EnhancedPurchase, any>;
  label: string;
  disabled?: boolean;
}) {
  const sorted = column.getIsSorted();
  const nextDesc = sorted ? sorted === 'asc' : column.getFirstSortDir() === 'desc';

  return (
    <Button
      variant="ghost"
      disabled={disabled}
      onClick={() => column.toggleSorting(nextDesc)}
      title={`Sort by ${label.toLowerCase()}`}
      className={cn('h-8 gap-1 p-0 hover:bg-transparent', RIGHT_ALIGNED.has(column.id) ? '-mr-3' : '-ml-3')}
    >
      {label}
      {sorted === 'asc' ? (
        <ChevronUp className="h-4 w-4" />
      ) : sorted === 'desc' ? (
        <ChevronDown className="h-4 w-4" />
      ) : (
        <ChevronDown className="h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}

export function PurchasesTableWithActions({
  purchasesData,
  products,
  suppliers,
  userRole,
  canViewImportedCosts = userRole !== 'staff',
  canCreateImported = userRole !== 'staff',
  stockReady = false
}: PurchasesTableWithActionsProps) {
  // Staff may create + view purchases; only admins may edit or delete.
  const canManage = userRole !== 'staff';
  // Cost of an imported product's purchase is admin-only - the server already
  // strips those fields, this only decides how the row is rendered.
  const hideImportedCosts = !canViewImportedCosts;
  const router = useRouter();
  const searchParams = useSearchParams();
  // Sorting is server-driven: a header click pushes ?sort=&dir= to the URL and
  // the page refetches (like the search box already does). `isPending` covers
  // that round trip so headers can be disabled while the new order loads.
  const [isPending, startTransition] = useTransition();
  const sortParam = searchParams.get('sort');
  const dirParam = searchParams.get('dir');
  const sorting = useMemo<SortingState>(() => {
    const { id, desc } = parsePurchaseSort(sortParam, dirParam);
    return [{ id, desc }];
  }, [sortParam, dirParam]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    retailPrice: false
  });

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [supplierFilter, setSupplierFilter] = useState(searchParams.get('supplier') || 'all');
  // Exact variant-SKU deep-link (?sku=), e.g. the Stock page's "View
  // purchases" button. The server has already scoped the rows to it.
  const skuFilter = searchParams.get('sku') || '';

  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<EnhancedPurchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Set instead of the confirmation dialog when the purchase still has payments.
  const [paymentBlock, setPaymentBlock] = useState<{
    purchase: EnhancedPurchase;
    block: PurchasePaymentBlock;
  } | null>(null);
  const [addPurchaseOpen, setAddPurchaseOpen] = useState(false);
  const [editPurchaseOpen, setEditPurchaseOpen] = useState(false);
  const [purchaseToEdit, setPurchaseToEdit] = useState<EnhancedPurchase | null>(null);

  // Inline receiving - the same dialog the Stock page's "Awaiting arrival" tab uses.
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<ReceiveTarget | null>(null);

  // Mark damaged - write off units from a specific purchase batch.
  const [damagedOpen, setDamagedOpen] = useState(false);
  const [damagedTarget, setDamagedTarget] = useState<MarkDamagedTarget | null>(null);

  // Partial payment tracking.
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentPurchase, setPaymentPurchase] = useState<EnhancedPurchase | null>(null);
  const [paymentInitial, setPaymentInitial] = useState<PaymentRow[]>([]);

  // Supplier filter options come from the Supplier collection (passed by the
  // page), so the dropdown lists every supplier - not only those that happen
  // to have purchases on the currently rendered page.
  const allSuppliers = useMemo(() => {
    if (suppliers) return [...suppliers].sort((a, b) => a.name.localeCompare(b.name));
    const seen = new Map<string, { supplierId: string; name: string }>();
    purchasesData.docs.forEach(purchase => {
      if (purchase.supplier && !seen.has(purchase.supplier)) {
        seen.set(purchase.supplier, { supplierId: '', name: purchase.supplier });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers, purchasesData]);

  const purchases = purchasesData.docs as EnhancedPurchase[];

  // A row whose cost the signed-in user may not see (the server already
  // redacted it; the origin check is a fallback for rows fetched without the
  // action).
  const importedCostHidden = (purchase: EnhancedPurchase) =>
    !!purchase.costsRedacted || (hideImportedCosts && purchase.origin === 'imported');

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
      // A name on its own filters loosely; pair it with the supplier's
      // business id so the server can match linked purchases exactly (with
      // an anchored-name fallback for purchases that predate linking).
      const option = allSuppliers.find(s => s.name === value);
      params.set('supplier', value);
      if (option?.supplierId) {
        params.set('supplierId', option.supplierId);
      } else {
        params.delete('supplierId');
      }
      params.set('page', '1');
    } else {
      params.delete('supplier');
      params.delete('supplierId');
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

  const handleDeleteClick = async (purchase: EnhancedPurchase) => {
    try {
      const block = await resolvePurchasePaymentBlock(purchase);
      if (block) {
        setPaymentBlock({ purchase, block });
        return;
      }
    } catch (error) {
      // The check itself failed - fall through and let the server-side guard decide.
      console.error('Error checking purchase payments:', error);
    }
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

  const handleDamagedClick = (purchase: EnhancedPurchase) => {
    setDamagedTarget({
      id: purchase.id || purchase._id!,
      purchaseId: purchase.purchaseId,
      productName: purchase.productName || 'Unknown product',
      sku: purchase.variant?.sku || purchase.variantId || '',
      quantity: purchase.quantity,
      remaining: purchase.remaining
    });
    setDamagedOpen(true);
  };

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

  const columns = useMemo<ColumnDef<EnhancedPurchase>[]>(
    () => [
      {
        accessorKey: 'purchaseDate',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="-ml-3 h-8 p-0 hover:bg-transparent"
          >
            Purchase
            {column.getIsSorted() === 'asc' ? (
              <ChevronUp className="ml-1 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ChevronDown className="ml-1 h-4 w-4" />
            ) : (
              <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
            )}
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <span className='font-semibold'>{row.original.purchaseId || 'N/A'}</span>
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {formatDate(row.original.purchaseDate)}
            </span>
          </div>
        ),
        sortingFn: 'datetime'
      },
      {
        accessorKey: 'productName',
        header: 'Product',
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex min-w-45 flex-col gap-1">
            <span className="font-medium leading-tight">{row.original.productName || 'Unknown product'}</span>
            <Badge variant="outline" className="w-fit font-mono whitespace-nowrap">
              {getVariantDisplay(row.original)}
            </Badge>
          </div>
        )
      },
      {
        accessorKey: 'origin',
        header: 'Origin',
        cell: ({ row }) => {
          const isImported = row.original.origin === 'imported';
          return (
            <Badge variant={isImported ? 'secondary' : 'default'} className="whitespace-nowrap font-medium capitalize w-full">
              {isImported ? 'Imported' : 'Local'}
            </Badge>
          );
        }
      },
      {
        accessorKey: 'supplier',
        header: 'Supplier',
        cell: ({ row }) => {
          // Who supplies imported stock is admin-only - show the row, hide the name.
          if (row.original.supplierRedacted) {
            return (
              <span className="text-muted-foreground" title="Supplier of imported products is hidden">
                —
              </span>
            );
          }
          return (
            <Badge variant="outline" className="whitespace-nowrap">
              {row.original.supplier}
            </Badge>
          );
        }
      },
      {
        id: 'stock',
        header: 'Stock',
        cell: ({ row }) => {
          const p = row.original;
          const received = p.receivedQuantity ?? p.quantity;
          const pending = pendingToReceive(p);
          const lowStock = p.remaining < p.quantity;

          return (
            <div className="flex flex-col gap-0.5 tabular-nums">
              {stockReady ? (
                <span className="whitespace-nowrap">
                  <span className={pending > 0 ? 'font-medium text-orange-600' : 'font-medium'}>{received}</span>
                  <span className="text-muted-foreground"> / {p.quantity} received</span>
                </span>
              ) : (
                <span className="whitespace-nowrap font-medium">{p.quantity} ordered</span>
              )}
              <span className={`whitespace-nowrap text-xs ${lowStock ? 'text-orange-600' : 'text-muted-foreground'}`}>
                {p.remaining} left
              </span>
            </div>
          );
        }
      },
      {
        accessorKey: 'totalCost',
        header: 'Cost',
        cell: ({ row }) => {
          // Imported purchases cost admin-only - show the row, hide the money.
          if (importedCostHidden(row.original)) {
            return (
              <span className="text-muted-foreground" title="Cost of imported products is hidden">
                —
              </span>
            );
          }
          return (
            <div className="flex flex-col items-end tabular-nums">
              <span className="font-medium">{formatCurrency(row.original.totalCost)}</span>
              <span className="text-xs text-muted-foreground">{formatCurrency(row.original.unitPrice)} each</span>
            </div>
          );
        }
      },
      {
        accessorKey: 'retailPrice',
        header: 'Retail price',
        cell: ({ row }) => <span className="tabular-nums">{formatCurrency(row.original.retailPrice || 0)}</span>
      },
      ...(canManage
        ? [
            {
              id: 'amountPaid',
              header: 'Paid',
              cell: ({ row }) => (
                <div className="whitespace-nowrap tabular-nums">
                  <span className="font-medium">{formatCurrency(row.original.paidAmount || 0)}</span>
                  <span className="text-muted-foreground"> / {formatCurrency(getAmountDue(row.original))}</span>
                </div>
              )
            } satisfies ColumnDef<EnhancedPurchase>
          ]
        : []),
      {
        id: 'paymentStatus',
        header: 'Payment status',
        cell: ({ row }) => {
          const balance = row.original.balanceAmount ?? 0;
          return (
            <div className="flex flex-col items-start gap-1">
              {renderPaymentStatus(row.original)}
              {/* Supplier money is admin-only. */}
              {canManage && balance > 0 && (
                <span className="text-xs tabular-nums text-orange-600">Due {formatCurrency(balance)}</span>
              )}
            </div>
          );
        }
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
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
            {canManage && (
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
            )}
            {canManage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="More actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => handleEditClick(row.original)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit purchase
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/inventory/${row.original.productId}/edit`)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Go to product
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDamagedClick(row.original)}
                    disabled={row.original.remaining <= 0}
                    title={
                      row.original.remaining <= 0
                        ? 'No remaining units to mark as damaged'
                        : 'Mark units as damaged'
                    }
                  >
                    <ShieldAlert className="mr-2 h-4 w-4" />
                    Mark as damaged
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick(row.original)}
                    disabled={row.original.remaining < row.original.quantity}
                    title={
                      row.original.remaining < row.original.quantity
                        ? `Cannot delete: ${row.original.quantity - row.original.remaining} unit(s) already sold`
                        : 'Delete purchase'
                    }
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete purchase
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )
      }
    ],
    // Handlers only call stable setters, the router, or imported actions,
    // so they don't need to be dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage, hideImportedCosts, stockReady, router]
  );

  const table = useReactTable({
    data: purchases,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: updater => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const first = next[0];
      const params = new URLSearchParams(searchParams.toString());
      if (first && (first.id !== DEFAULT_PURCHASE_SORT.id || first.desc !== DEFAULT_PURCHASE_SORT.desc)) {
        params.set('sort', first.id);
        params.set('dir', first.desc ? 'desc' : 'asc');
      } else {
        // Back to the server default (newest first) - keep the URL clean.
        params.delete('sort');
        params.delete('dir');
      }
      params.set('page', '1');
      startTransition(() => router.push(`?${params.toString()}`, { scroll: false }));
    },
    onColumnVisibilityChange: setColumnVisibility,
    // Rows arrive already ordered by the aggregation pipeline - reordering the
    // loaded page here would disagree with pagination.
    manualSorting: true,
    getCoreRowModel: getCoreRowModel()
  });

  const handleExportCsv = () => {
    const data = table.getRowModel().rows.map(row => {
      // Cost columns are blank for imported purchases the user may not price
      // (retail price always ships: staff sell at it). Same rule as the table.
      const hideCost = importedCostHidden(row.original);
      const cost = (value: number | undefined) => (hideCost ? '' : String(formatCurrency(value || 0)));

      return {
        'Purchase Date': formatDate(row.original.purchaseDate),
        Product: row.original.productName || 'Unknown',
        Variant: row.original.variant?.sku || row.original.variantId || '',
        Supplier: row.original.supplier || '',
        Quantity: row.original.quantity,
        Remaining: row.original.remaining,
        'Unit Price': cost(row.original.unitPrice),
        'Retail Price': String(formatCurrency(row.original.retailPrice || 0)),
        'Wholesale Price': cost(row.original.wholesalePrice),
        'Shipping Cost': cost(row.original.shippingCost),
        'Total Cost': cost(row.original.totalCost),
        // Supplier money columns are admin-only, same as in the table.
        ...(canManage
          ? {
              Paid: String(formatCurrency(row.original.paidAmount || 0)),
              Balance: String(formatCurrency(row.original.balanceAmount ?? 0))
            }
          : {}),
        'Payment Status': row.original.isUntracked ? 'Paid (untracked)' : getPaymentStatus(row.original)
      };
    });
    exportToCsv(data, `purchases-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    router.push('/purchases/print');
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 py-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Columns3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllLeafColumns()
                  .filter(column => column.getCanHide())
                  .map(column => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={value => column.toggleVisibility(!!value)}
                    >
                      {COLUMN_LABELS[column.id] ?? column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportCsv}>
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportPdf}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Select value={supplierFilter} onValueChange={handleSupplierChange}>
              <SelectTrigger className="w-45">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {allSuppliers.map(supplier => (
                  <SelectItem key={supplier.supplierId || supplier.name} value={supplier.name}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Exact-SKU deep-link: show what the list is scoped to, and a way out. */}
      {skuFilter && (
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <Badge variant="secondary" className="gap-1">
            Variant
            <span className="font-mono">{skuFilter}</span>
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('sku');
              params.set('page', '1');
              router.push(`?${params.toString()}`, { scroll: false });
            }}
          >
            View all purchases
          </Button>
        </div>
      )}

      {/* Table: scrolls inside its own box so the header stays visible  */}
      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className={`h-10 whitespace-nowrap font-medium tracking-wide ${
                      RIGHT_ALIGNED.has(header.column.id) ? 'text-right' : ''
                    }`}
                  >
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
                    <TableCell
                      key={cell.id}
                      className={`py-3 align-middle ${RIGHT_ALIGNED.has(cell.column.id) ? 'text-right' : ''}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
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

      <PurchaseDeleteBlockedDialog
        open={!!paymentBlock}
        onOpenChange={open => {
          if (!open) setPaymentBlock(null);
        }}
        purchase={paymentBlock?.purchase ?? null}
        block={paymentBlock?.block ?? null}
      />

      <ReceiveDialog
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
        target={receiveTarget}
        onSuccess={() => router.refresh()}
      />

      <MarkDamagedDialog
        open={damagedOpen}
        onOpenChange={setDamagedOpen}
        target={damagedTarget}
        onSuccess={() => router.refresh()}
      />

      {paymentPurchase && (
        <PurchasePaymentDialog
          key={paymentPurchase.id || paymentPurchase._id}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          purchaseId={paymentPurchase.id || paymentPurchase._id!}
          purchaseLabel={paymentPurchase.purchaseId}
          amountDue={
            paymentPurchase.amountDue ??
            (paymentPurchase.purchasePrice ?? paymentPurchase.unitPrice) * paymentPurchase.quantity
          }
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
        canCreateImported={canCreateImported}
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
          canCreateImported={canCreateImported}
          open={editPurchaseOpen}
          onOpenChange={setEditPurchaseOpen}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}
