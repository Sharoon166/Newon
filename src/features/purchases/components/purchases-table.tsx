'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2 } from 'lucide-react';
import { Purchase } from '../types';
import { deletePurchase } from '../actions';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PurchasesTableProps {
  purchases: Purchase[];
  locations?: Array<{ id: string; name: string; address?: string }>;
  onEdit: (purchase: Purchase) => void;
  onRefresh: () => void;
  readOnly?: boolean;
}

export function PurchasesTable({
  purchases,
  locations = [],
  onEdit,
  onRefresh,
  readOnly = false
}: PurchasesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (purchase: Purchase) => {
    setPurchaseToDelete(purchase);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!purchaseToDelete) return;

    try {
      setIsDeleting(true);
      await deletePurchase(purchaseToDelete.id || purchaseToDelete._id!);
      toast.success('Purchase deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete purchase');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setPurchaseToDelete(null);
    }
  };

  const getLocationName = (locationId: string | undefined) => {
    if (!locationId) return 'N/A';
    const location = locations.find(loc => loc.id === locationId);
    return location?.name || locationId;
  };

  if (purchases.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No purchases found for this variant.</p>
        <p className="text-sm mt-2">Add your first purchase to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto w-full max-w-6xl mx-auto">
      <div className="rounded-md border-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Purchase ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Retail Price</TableHead>
              <TableHead className="text-right">Wholesale Price</TableHead>
              <TableHead className="text-right">Shipping Cost</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead>Notes</TableHead>
              {!readOnly && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.map(purchase => (
              <TableRow key={purchase.id || purchase._id}>
                <TableCell>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {purchase.purchaseId || 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{purchase.supplier}</Badge>
                </TableCell>
                <TableCell>{getLocationName(purchase.locationId)}</TableCell>
                <TableCell className="text-right">{purchase.quantity}</TableCell>
                <TableCell className="text-right">
                  <span className={purchase.remaining < purchase.quantity ? 'text-orange-600 font-medium' : ''}>
                    {purchase.remaining}
                  </span>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(purchase.unitPrice)}</TableCell>
                <TableCell className="text-right">{formatCurrency(purchase.retailPrice || 0)}</TableCell>
                <TableCell className="text-right">{formatCurrency(purchase.wholesalePrice || 0)}</TableCell>
                <TableCell className="text-right">{formatCurrency(purchase.shippingCost || 0)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(purchase.totalCost)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{purchase.notes || '-'}</TableCell>
                {!readOnly && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(purchase)}
                        title="Edit purchase"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(purchase)}
                        disabled={purchase.remaining < purchase.quantity}
                        title={
                          purchase.remaining < purchase.quantity
                            ? `Cannot delete: ${purchase.quantity - purchase.remaining} unit(s) already sold`
                            : 'Delete purchase'
                        }
                      >
                        <Trash2 className={`h-4 w-4 ${purchase.remaining < purchase.quantity ? 'text-muted-foreground' : 'text-destructive'}`} />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
        onConfirm={handleDelete}
        isProcessing={isDeleting}
      />
    </div>
  );
}
