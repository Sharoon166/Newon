'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { Invoice } from '@/features/invoices/types';

interface ProjectInvoicesListProps {
  invoices: Invoice[];
}

export function ProjectInvoicesList({ invoices }: ProjectInvoicesListProps) {
  if (invoices.length === 0) {
    return null;
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
      pending: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
      partial: { bg: 'bg-blue-50', text: 'text-blue-700' },
      paid: { bg: 'bg-green-50', text: 'text-green-700' },
      cancelled: { bg: 'bg-red-50', text: 'text-red-700' },
      sent: { bg: 'bg-purple-50', text: 'text-purple-700' },
      accepted: { bg: 'bg-green-50', text: 'text-green-700' },
      rejected: { bg: 'bg-red-50', text: 'text-red-700' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-700' }
    };
    return configs[status] || configs.draft;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Generated Invoices ({invoices.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.map(invoice => {
            const statusConfig = getStatusConfig(invoice.status);
            
            return (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-sm font-semibold">{invoice.invoiceNumber}</p>
                    <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0 text-xs`}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 md:gap-4 text-xs text-muted-foreground ">
                    <span>Date: {formatDate(new Date(invoice.date))}</span>
                    <span>Total: {formatCurrency(invoice.totalAmount)}</span>
                    {invoice.type === 'invoice' && (
                      <>
                        <span>Paid: {formatCurrency(invoice.paidAmount)}</span>
                        <span className={invoice.balanceAmount > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                          Balance: {formatCurrency(invoice.balanceAmount)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <Link href={`/invoices/${invoice.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
