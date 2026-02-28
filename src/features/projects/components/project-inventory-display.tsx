'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Package, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { Invoice } from '@/features/invoices/types';
import { format } from 'date-fns';

interface ProjectInventoryDisplayProps {
  projectId: string;
  invoices: Invoice[];
}

export function ProjectInventoryDisplay({ invoices }: ProjectInventoryDisplayProps) {
  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No invoices linked to this project</p>
        <p className="text-sm text-muted-foreground mt-2">
          Link invoices to view their inventory items here
        </p>
      </div>
    );
  }

  const allItems = invoices.flatMap(invoice =>
    invoice.items
      .filter(item => item.productId || item.virtualProductId)
      .map(item => ({
        ...item,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.date
      }))
  );

  if (allItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No inventory items in linked invoices</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {invoices.map(invoice => {
        const items = invoice.items.filter(item => item.productId || item.virtualProductId);
        
        if (items.length === 0) return null;

        return (
          <div key={invoice.invoiceNumber} className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  href={`/invoices/${invoice.invoiceNumber}`}
                  className="text-sm font-medium hover:underline flex items-center gap-2"
                >
                  {invoice.invoiceNumber}
                  <ExternalLink className="h-3 w-3" />
                </Link>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(invoice.date), 'PPP')}
                </p>
              </div>
              <Badge variant="outline">{items.length} items</Badge>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.isVirtualProduct && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Virtual Product
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.variantSKU || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {items.some(item => item.componentBreakdown && item.componentBreakdown.length > 0) && (
              <div className="ml-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Component Breakdown:</p>
                {items
                  .filter(item => item.componentBreakdown && item.componentBreakdown.length > 0)
                  .map((item, itemIdx) => (
                    <div key={itemIdx} className="ml-4 space-y-1">
                      <p className="text-sm font-medium">{item.productName}:</p>
                      <div className="ml-4 space-y-1">
                        {item.componentBreakdown?.map((comp, compIdx) => (
                          <p key={compIdx} className="text-sm text-muted-foreground">
                            • {comp.productName} ({comp.sku}) - Qty: {comp.quantity} @ {formatCurrency(comp.unitCost)} = {formatCurrency(comp.totalCost)}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="pt-4 border-t">
        <div className="flex justify-between items-center">
          <p className="font-semibold">Total Items:</p>
          <p className="font-semibold">{allItems.length}</p>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="font-semibold">Total Value:</p>
          <p className="font-semibold">
            {formatCurrency(allItems.reduce((sum, item) => sum + item.totalPrice, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}
