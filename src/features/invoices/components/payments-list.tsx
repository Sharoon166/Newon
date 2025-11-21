'use client';

import { useState } from 'react';
import { Payment } from '../types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { deletePayment, updatePayment } from '../actions';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { EditPaymentDialog } from './edit-payment-dialog';

interface PaymentsListProps {
  invoiceId: string;
  payments: Payment[];
  onUpdate: () => void;
  isCancelled?: boolean;
}

export function PaymentsList({ invoiceId, payments, onUpdate, isCancelled = false }: PaymentsListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (selectedPaymentIndex === null) return;

    try {
      setIsDeleting(true);
      await deletePayment(invoiceId, selectedPaymentIndex);
      toast.success('Payment deleted successfully');
      onUpdate();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error((error as Error).message || 'Failed to delete payment');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const methodConfig: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      cash: { variant: 'default', label: 'Cash' },
      bank_transfer: { variant: 'secondary', label: 'Bank Transfer' },
      online: { variant: 'outline', label: 'Online' },
      cheque: { variant: 'secondary', label: 'Cheque' },
      upi: { variant: 'default', label: 'UPI' }
    };

    const config = methodConfig[method] || methodConfig.cash;

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No payments recorded yet</p>
      </div>
    );
  }

  const selectedPayment = selectedPaymentIndex !== null ? payments[selectedPaymentIndex] : null;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment, index) => (
            <TableRow key={index}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{format(new Date(payment.date), 'MMM dd, yyyy')}</TableCell>
              <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
              <TableCell>{getPaymentMethodBadge(payment.method)}</TableCell>
              <TableCell>{payment.reference || '-'}</TableCell>
              <TableCell className="max-w-xs truncate">{payment.notes || '-'}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedPaymentIndex(index);
                      setEditDialogOpen(true);
                    }}
                    disabled={isCancelled}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedPaymentIndex(index);
                      setDeleteDialogOpen(true);
                    }}
                    disabled={isCancelled}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Payment"
        description="Are you sure you want to delete this payment? This will update the invoice balance."
        confirmText="Delete"
        variant="destructive"
        isProcessing={isDeleting}
      />

      {selectedPayment && selectedPaymentIndex !== null && (
        <EditPaymentDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          invoiceId={invoiceId}
          paymentIndex={selectedPaymentIndex}
          payment={selectedPayment}
          onSuccess={onUpdate}
        />
      )}
    </>
  );
}
