'use client';

import { useState, useMemo, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Invoice, InvoiceItem } from '@/features/invoices/types';
import { groupItemsByVariant, type GroupedInvoiceItem } from '@/features/invoices/utils/group-items';

interface InvoiceItemsTableProps {
  invoice: Invoice;
  showTotals?: boolean;
}

export function InvoiceItemsTable({ invoice, showTotals = false }: InvoiceItemsTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroupExpansion = (key: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Group invoice items by variantId for display
  const groupedItems = useMemo(() => {
    return groupItemsByVariant(
      invoice.items.map(item => ({
        ...item,
        rate: item.unitPrice,
        amount: item.totalPrice
      }))
    );
  }, [invoice.items]);

  // Calculate total cost and profit (uses raw items for accuracy)
  const totalCost = invoice.items.reduce((sum, item) => {
    let itemCost = 0;

    if (item.isVirtualProduct) {
      itemCost = ((item.totalComponentCost || 0) + (item.totalCustomExpenses || 0)) * item.quantity;
    } else {
      itemCost = (item.originalRate || 0) * item.quantity;
    }

    return sum + itemCost;
  }, 0);

  const profit = invoice.totalAmount - totalCost;

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedItems.map((group) => (
            <Fragment key={group.key}>
              <TableRow>
                <TableCell>
                  {group.batches.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => toggleGroupExpansion(group.key)}>
                      {expandedGroups.has(group.key) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{group.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {group.isVirtualProduct && (
                        <Badge variant="secondary" className="text-xs">
                          Virtual Product
                        </Badge>
                      )}
                      {group.variantSKU && (
                        <span className="text-xs text-muted-foreground">SKU: {group.variantSKU}</span>
                      )}
                      {group.batches.length > 1 && (
                        <Badge variant="outline" className="text-xs">
                          {group.batches.length} batches
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {group.totalQuantity} {group.unit}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(group.unifiedRate)}
                  {group.batches.length > 1 && (
                    <div className="text-muted-foreground text-xs">
                      Avg across {group.batches.length} batches
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(group.totalAmount)}
                </TableCell>
              </TableRow>

              {/* Batch breakdown when expanded */}
              {expandedGroups.has(group.key) && group.batches.length > 1 && (
                <TableRow>
                  <TableCell colSpan={5} className="bg-gray-50 p-0">
                    <div className="p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Batch Breakdown</h4>
                      <div className="bg-white rounded border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="text-xs font-semibold">Purchase/Batch</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Quantity</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Unit Price</TableHead>
                              <TableHead className="text-xs font-semibold text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.batches.map((batch, idx) => {
                              const originalItem = invoice.items[batch.fieldIndex];
                              return (
                                <TableRow key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                  <TableCell className="text-sm">
                                    {batch.purchaseId || `Batch ${idx + 1}`}
                                  </TableCell>
                                  <TableCell className="text-sm text-right">{batch.quantity}</TableCell>
                                  <TableCell className="text-sm text-right">
                                    {formatCurrency(batch.rate)}
                                  </TableCell>
                                  <TableCell className="text-sm text-right font-semibold">
                                    {formatCurrency(batch.amount)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-blue-50">
                              <TableCell className="text-sm font-semibold">Total</TableCell>
                              <TableCell className="text-sm text-right font-bold">{group.totalQuantity}</TableCell>
                              <TableCell className="text-sm text-right font-bold">
                                {formatCurrency(group.unifiedRate)}
                              </TableCell>
                              <TableCell className="text-sm text-right font-bold text-blue-700">
                                {formatCurrency(group.totalAmount)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}

              {/* VP component breakdown when expanded */}
              {group.isVirtualProduct && expandedGroups.has(group.key) && (
                <TableRow>
                  <TableCell colSpan={5} className="bg-gray-50 p-0">
                    <div className="p-4 space-y-4">
                      {/* Show component breakdown from the first batch item that has it */}
                      {invoice.items
                        .filter(item => item.virtualProductId === group.virtualProductId && item.componentBreakdown && item.componentBreakdown.length > 0)
                        .slice(0, 1)
                        .map((item, itemIdx) => (
                          <Fragment key={itemIdx}>
                            {item.componentBreakdown && item.componentBreakdown.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Component Breakdown</h4>
                                <div className="bg-white rounded border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-gray-50">
                                        <TableHead className="text-xs font-semibold">Product</TableHead>
                                        <TableHead className="text-xs font-semibold">SKU</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">Quantity</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">Unit Cost</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">Total Cost</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {item.componentBreakdown.map((component, idx) => (
                                        <TableRow key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                          <TableCell className="text-sm">{component.productName}</TableCell>
                                          <TableCell className="text-sm text-muted-foreground">{component.sku}</TableCell>
                                          <TableCell className="text-sm text-right">{component.quantity}</TableCell>
                                          <TableCell className="text-sm text-right">
                                            {formatCurrency(component.unitCost)}
                                          </TableCell>
                                          <TableCell className="text-sm text-right font-semibold">
                                            {formatCurrency(component.totalCost)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow className="bg-blue-50">
                                        <TableCell colSpan={4} className="text-sm font-semibold text-right">
                                          Total Component Cost:
                                        </TableCell>
                                        <TableCell className="text-sm text-right font-bold text-blue-700">
                                          {formatCurrency(item.totalComponentCost || 0)}
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}
                            {item.customExpenses && item.customExpenses.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">Custom Expenses</h4>
                                <div className="bg-white rounded border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-gray-50">
                                        <TableHead className="text-xs font-semibold">Name</TableHead>
                                        <TableHead className="text-xs font-semibold">Category</TableHead>
                                        <TableHead className="text-xs font-semibold">Description</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">Actual Cost</TableHead>
                                        <TableHead className="text-xs font-semibold text-right">Client Cost</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {item.customExpenses.map((expense, idx) => (
                                        <TableRow key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                          <TableCell className="text-sm font-medium">{expense.name}</TableCell>
                                          <TableCell className="text-sm">
                                            <Badge variant="outline" className="text-xs capitalize">
                                              {expense.category}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-sm text-muted-foreground">
                                            {expense.description || '-'}
                                          </TableCell>
                                          <TableCell className="text-sm text-right text-orange-600">
                                            {formatCurrency(expense.actualCost)}
                                          </TableCell>
                                          <TableCell className="text-sm text-right font-semibold">
                                            {formatCurrency(expense.clientCost)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow className="bg-orange-50">
                                        <TableCell colSpan={4} className="text-sm font-semibold text-right">
                                          Total Custom Expenses:
                                        </TableCell>
                                        <TableCell className="text-sm text-right font-bold text-orange-700">
                                          {formatCurrency(item.totalCustomExpenses || 0)}
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}
                          </Fragment>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
      {showTotals && (
        <div className="bg-gray-50 border-t">
          <Table>
            <TableBody>
              <TableRow>
                <TableCell colSpan={4} className="text-right font-medium">
                  Subtotal:
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(invoice.subtotal)}</TableCell>
              </TableRow>
              {invoice.discountAmount > 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-medium">
                    Discount:
                  </TableCell>
                  <TableCell className="text-right font-medium text-red-600">
                    -{formatCurrency(invoice.discountAmount)}
                  </TableCell>
                </TableRow>
              )}
              {invoice.gstAmount > 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-medium">
                    GST:
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(invoice.gstAmount)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-bold">
                  Total:
                </TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(invoice.totalAmount)}</TableCell>
              </TableRow>
              <TableRow className="bg-green-50">
                <TableCell colSpan={4} className="text-right font-bold text-green-700">
                  Profit:
                </TableCell>
                <TableCell className="text-right font-bold text-green-700">{formatCurrency(profit)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
