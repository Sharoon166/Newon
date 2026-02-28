'use client';

import { useState, Fragment } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Invoice } from '@/features/invoices/types';

interface InvoiceItemsTableProps {
  invoice: Invoice;
  showTotals?: boolean;
}

export function InvoiceItemsTable({ invoice, showTotals = true }: InvoiceItemsTableProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItemExpansion = (index: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Calculate total cost and profit
  const totalCost = invoice.items.reduce((sum, item) => {
    let itemCost = 0;

    // Priority 1: If item has custom expenses, use totalCustomExpenses ONLY (ignore originalRate)
    if (item.customExpenses && item.customExpenses.length > 0) {
      itemCost = item.totalCustomExpenses || 0;
    } else if (item.isVirtualProduct && (item.totalComponentCost || 0) > 0) {
      // Priority 2: For virtual products without custom expenses, use component cost (only if > 0)
      itemCost = item.totalComponentCost || 0;
    } else {
      // Priority 3: For regular products, use originalRate * quantity
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
            <TableHead >Sr.</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoice.items.map((item, index) => (
            <Fragment key={item.variantSKU}>
              <TableRow>
                <TableCell>
                  {item.isVirtualProduct && (item.componentBreakdown || item.customExpenses) && (
                    <Button variant="ghost" size="icon" onClick={() => toggleItemExpansion(index)}>
                      {expandedItems.has(index) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                    {(index+1)}.
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{item.productName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {item.isVirtualProduct && (
                        <Badge variant="secondary" className="text-xs">
                          Virtual Product
                        </Badge>
                      )}
                      {item.variantSKU && <span className="text-xs text-muted-foreground">SKU: {item.variantSKU}</span>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {item.quantity} {item.unit}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.unitPrice)}

                  <div className="text-muted-foreground text-xs">
                    Original: {formatCurrency(
                      item.customExpenses && item.customExpenses.length > 0
                        ? item.totalCustomExpenses || 0
                        : item.isVirtualProduct && (item.totalComponentCost || 0) > 0
                        ? item.totalComponentCost || 0
                        : item.originalRate ?? 0
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(item.totalPrice)}</TableCell>
              </TableRow>
              {item.isVirtualProduct && expandedItems.has(index) && (
                <TableRow>
                  <TableCell colSpan={5} className="bg-gray-50 p-0">
                    <div className="p-4 space-y-4">
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
                <TableCell colSpan={4} className="text-right text-lg font-bold">
                  Total:
                </TableCell>
                <TableCell className="text-right text-lg font-bold">{formatCurrency(invoice.totalAmount)}</TableCell>
              </TableRow>
              <TableRow className="bg-green-50">
                <TableCell colSpan={4} className="text-right text-lg font-bold text-green-700">
                  Profit:
                </TableCell>
                <TableCell className="text-right text-lg font-bold text-green-700">
                  {formatCurrency(profit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
