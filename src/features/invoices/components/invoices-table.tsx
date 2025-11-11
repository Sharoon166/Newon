'use client';

import { useState } from 'react';
import { Invoice } from '../types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, FileText, CheckCircle, XCircle, Clock, Edit, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { deleteInvoice } from '../actions';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
import { UpdateStatusDialog } from './update-status-dialog';
import { EditInvoiceDialog } from './edit-invoice-dialog';

interface InvoicesTableProps {
  invoices: Invoice[];
  onRefresh: () => void;
}

export function InvoicesTable({ invoices, onRefresh }: InvoicesTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!selectedInvoice) return;

    try {
      setIsDeleting(true);
      await deleteInvoice(selectedInvoice.id);
      onRefresh?.();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string; icon: any }> = {
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

  if (invoices.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No documents found</h3>
        <p className="text-muted-foreground mb-4">Create your first invoice or quotation to get started</p>
        <Link href="/invoices/new">
          <Button>Create Document</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Market</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map(invoice => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{invoice.customerName}</div>
                    {invoice.customerCompany && (
                      <div className="text-sm text-muted-foreground">{invoice.customerCompany}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{format(new Date(invoice.date), 'MMM dd, yyyy')}</TableCell>
                <TableCell>
                  {invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM dd, yyyy') : '-'}
                </TableCell>
                <TableCell className="font-medium">{formatCurrency(invoice.totalAmount)}</TableCell>
                <TableCell className="text-green-600">{formatCurrency(invoice.paidAmount)}</TableCell>
                <TableCell className={invoice.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(invoice.balanceAmount)}
                </TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{invoice.market}</Badge>
                </TableCell>
                <TableCell className="text-right">
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
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setStatusDialogOpen(true);
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Update Status
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Invoice"
        description={`Are you sure you want to delete invoice ${selectedInvoice?.invoiceNumber}? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isProcessing={isDeleting}
      />

      {selectedInvoice && (
        <>
          <AddPaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            invoiceId={selectedInvoice.id}
            balanceAmount={selectedInvoice.balanceAmount}
            onSuccess={onRefresh}
          />

          <UpdateStatusDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            invoiceId={selectedInvoice.id}
            currentStatus={selectedInvoice.status}
            type={selectedInvoice.type}
            onSuccess={onRefresh}
          />

          <EditInvoiceDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            invoice={selectedInvoice}
            onSuccess={onRefresh}
          />
        </>
      )}
    </>
  );
}
