'use client';

import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import type { EnrichedExpense } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { deleteExpense, deletePaymentTransaction } from '../actions';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { AddPaymentDialog } from './add-payment-dialog';
import { ExpenseCategory } from '@/features/expenses/types';

interface ExpensesTableWithPaymentsProps {
  data: EnrichedExpense[];
  projectId: string;
  userId: string;
  userRole: string;
  canDelete?: boolean;
  onRefresh?: () => void;
}

export function ExpensesTableWithPayments({ 
  data, 
  projectId, 
  userId, 
  userRole, 
  canDelete, 
  onRefresh 
}: ExpensesTableWithPaymentsProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTransactionDialogOpen, setDeleteTransactionDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<EnrichedExpense | null>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getCategoryBadge = (category: ExpenseCategory) => {
    const categoryConfig: Record<ExpenseCategory, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      materials: { variant: 'default', label: 'Materials' },
      labor: { variant: 'secondary', label: 'Labor' },
      equipment: { variant: 'outline', label: 'Equipment' },
      transport: { variant: 'default', label: 'Transport' },
      rent: { variant: 'secondary', label: 'Rent' },
      utilities: { variant: 'outline', label: 'Utilities' },
      fuel: { variant: 'default', label: 'Fuel' },
      maintenance: { variant: 'secondary', label: 'Maintenance' },
      marketing: { variant: 'outline', label: 'Marketing' },
      'office-supplies': { variant: 'default', label: 'Office Supplies' },
      'professional-services': { variant: 'secondary', label: 'Professional Services' },
      insurance: { variant: 'outline', label: 'Insurance' },
      taxes: { variant: 'default', label: 'Taxes' },
      salary: { variant: 'secondary', label: 'Other' },
      other: { variant: 'secondary', label: 'Other' }
    };

    const config = categoryConfig[category];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: 'unpaid' | 'partial' | 'paid') => {
    const config = {
      unpaid: { bg: 'bg-red-50', text: 'text-red-700', label: 'Unpaid' },
      partial: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Partial' },
      paid: { bg: 'bg-green-50', text: 'text-green-700', label: 'Paid' }
    };
    const { bg, text, label } = config[status] ?? config.unpaid;
    return <Badge className={`${bg} ${text} border-0`}>{label}</Badge>;
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      jazzcash: 'JazzCash',
      easypaisa: 'Easypaisa',
      'bank-transfer': 'Bank Transfer',
      cheque: 'Cheque',
      other: 'Other'
    };
    return labels[source] || source;
  };

  const toggleRow = (expenseId: string) => {
    const newExpanded = new Set(expandedRows);
    
    if (newExpanded.has(expenseId)) {
      newExpanded.delete(expenseId);
    } else {
      newExpanded.add(expenseId);
    }
    
    setExpandedRows(newExpanded);
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense) return;

    try {
      setIsDeleting(true);
      await deleteExpense(projectId, selectedExpense.id!, userId, userRole);
      toast.success('Expense deleted successfully');
      setDeleteDialogOpen(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete expense';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!selectedExpenseId || !selectedTransactionId) return;

    try {
      setIsDeleting(true);
      await deletePaymentTransaction(selectedExpenseId, selectedTransactionId, userId);
      toast.success('Payment transaction deleted successfully');
      setDeleteTransactionDialogOpen(false);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      toast.error('Failed to delete payment transaction');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Remaining</TableHead>
              <TableHead>Added By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  No expenses found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((expense) => {
                const isExpanded = expandedRows.has(expense.expenseId!);
                const canDeleteExpense = canDelete && (userRole === 'admin' || expense.addedBy === userId);
                const canManagePayments = userRole === 'admin' && expense.expenseId;

                return (
                  <Fragment key={expense.id}>
                    <TableRow>
                      <TableCell>
                        {expense.expenseId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRow(expense.expenseId!)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(new Date(expense.date))}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{expense.description}</div>
                          {expense.notes && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {expense.notes}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(expense.category)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {formatCurrency(expense.totalPaid)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${expense.remainingAmount > 0 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                          {formatCurrency(expense.remainingAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{expense.addedByName || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {expense.addedByRole}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(expense.paymentStatus)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {canManagePayments && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedExpenseId(expense.expenseId!);
                                setPaymentDialogOpen(true);
                              }}
                              title="Add Payment"
                              className="hover:bg-green-50"
                            >
                              <Plus className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {canDeleteExpense && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedExpense(expense);
                                setDeleteDialogOpen(true);
                              }}
                              title="Delete expense"
                              className="hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={10} className="bg-gray-50 p-0">
                          <div className="p-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between border-b pb-3">
                                <h4 className="text-sm font-semibold text-gray-900">Payment History</h4>
                                <div className="flex items-center gap-6">
                                  <div className="text-right">
                                    <div className="text-xs text-muted-foreground">Total Amount</div>
                                    <div className="text-sm font-semibold">{formatCurrency(expense.amount)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-muted-foreground">Paid</div>
                                    <div className="text-sm font-semibold text-green-600">{formatCurrency(expense.totalPaid)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-muted-foreground">Remaining</div>
                                    <div className="text-sm font-semibold text-orange-600">{formatCurrency(expense.remainingAmount)}</div>
                                  </div>
                                </div>
                              </div>
                              
                              {expense.transactions.length === 0 ? (
                                <div className="text-center py-8 text-sm text-muted-foreground bg-white rounded border border-dashed">
                                  No payment transactions yet. Click the + button to add a payment.
                                </div>
                              ) : (
                                <div className="bg-white rounded">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-gray-50">
                                        <TableHead className="text-xs font-semibold">Amount</TableHead>
                                        <TableHead className="text-xs font-semibold">Source</TableHead>
                                        <TableHead className="text-xs font-semibold">Notes</TableHead>
                                        <TableHead className="text-xs font-semibold">Added By</TableHead>
                                        <TableHead className="text-xs w-[50px]"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {expense.transactions.map((transaction, idx) => (
                                        <TableRow key={transaction.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                          <TableCell className="text-sm font-semibold text-green-600">
                                            {formatCurrency(transaction.amount)}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            <Badge variant="secondary" className="text-xs">
                                              {getSourceLabel(transaction.source)}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                            {transaction.notes || '-'}
                                          </TableCell>
                                          <TableCell className="text-sm">
                                            <div>
                                              <div>{transaction.addedByName || 'Unknown'}</div>
                                              <div className="text-xs text-muted-foreground">
                                                {formatDate(new Date(transaction.createdAt || transaction.date))}
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            {userRole === 'admin' && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                  setSelectedExpenseId(expense.expenseId!);
                                                  setSelectedTransactionId(transaction.id!);
                                                  setDeleteTransactionDialogOpen(true);
                                                }}
                                                title="Delete transaction"
                                              >
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                              </Button>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedExpenseId && (
        <AddPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          expenseId={selectedExpenseId}
          userId={userId}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteExpense}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText="Delete Expense"
        variant="destructive"
        isProcessing={isDeleting}
      />

      <ConfirmationDialog
        open={deleteTransactionDialogOpen}
        onOpenChange={setDeleteTransactionDialogOpen}
        onConfirm={handleDeleteTransaction}
        title="Delete Payment Transaction"
        description="Are you sure you want to delete this payment transaction? This action cannot be undone."
        confirmText="Delete Transaction"
        variant="destructive"
        isProcessing={isDeleting}
      />
    </>
  );
}
