'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import {
  getInvoice,
  convertQuotationToInvoice,
  deductInvoiceStock,
  restoreInvoiceStock
} from '@/features/invoices/actions';
import { Invoice } from '@/features/invoices/types';
import { PageHeader } from '@/components/general/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Plus, Edit, RefreshCw, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { AddPaymentDialog } from '@/features/invoices/components/add-payment-dialog';
import { UpdateStatusDialog } from '@/features/invoices/components/update-status-dialog';
import { EditInvoiceDialog } from '@/features/invoices/components/edit-invoice-dialog';
import { NewonInvoiceTemplate } from '@/features/invoices/components/newon-invoice-template';
import { InvoiceTemplateData, QuotationTemplateData } from '@/features/invoices/components/template-types';
import { toast } from 'sonner';
import { COMPANY_DETAILS, PAYMENT_DETAILS } from '@/constants';
import { QuotationTemplate } from '@/features/invoices/components/quotation-template';
import Link from 'next/link';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params.id) {
      fetchInvoice();
    }
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      setIsLoading(true);
      const data = await getInvoice(params.id as string);
      setInvoice(data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      alert('Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!invoice || invoice.type !== 'quotation') return;

    try {
      const newInvoice = await convertQuotationToInvoice(invoice.id, 'system-user');
      toast.success(`Quotation converted to invoice: ${newInvoice.invoiceNumber}`);
      router.push(`/invoices/${newInvoice.id}`);
    } catch (error) {
      console.error('Error converting quotation:', error);
      toast.error('Failed to convert quotation');
    }
  };

  const handleReactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle:
      invoice?.type === 'invoice' ? `Invoice-${invoice.invoiceNumber}` : `Quotation-${invoice?.invoiceNumber}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 18mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print\\:hidden {
          display: none !important;
        }
      }
    `
  });

  const handlePrint = () => {
    // Open preview sheet first
    setIsPrintPreviewOpen(true);
    // Then trigger print after a short delay to ensure sheet is rendered
    setTimeout(() => {
      handleReactToPrint();
    }, 300);
  };

  const handleDeductStock = async () => {
    if (!invoice) return;

    try {
      await deductInvoiceStock(invoice.id);
      toast.success('Stock deducted successfully');
      fetchInvoice();
    } catch (error) {
      console.error('Error deducting stock:', error);
      toast.error((error as Error).message || 'Failed to deduct stock');
    }
  };

  const handleRestoreStock = async () => {
    if (!invoice) return;

    try {
      await restoreInvoiceStock(invoice.id);
      toast.success('Stock restored successfully');
      fetchInvoice();
    } catch (error) {
      console.error('Error restoring stock:', error);
      toast.error((error as Error).message || 'Failed to restore stock');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Invoice not found</h2>
          <Button onClick={() => router.push('/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  // Transform invoice data to template format
  const templateData =
    invoice.type === 'invoice'
      ? ({
          logo: undefined,
          company: COMPANY_DETAILS,
          client: {
            name: invoice.customerName,
            company: invoice.customerCompany,
            address: invoice.customerAddress,
            city: invoice.customerCity || '',
            state: invoice.customerState || '',
            zip: invoice.customerZip || '',
            email: invoice.customerEmail,
            phone: invoice.customerPhone
          },
          invoiceNumber: invoice.invoiceNumber,
          date: typeof invoice.date === 'string' ? invoice.date : invoice.date.toISOString(),
          dueDate: invoice.dueDate
            ? typeof invoice.dueDate === 'string'
              ? invoice.dueDate
              : invoice.dueDate.toISOString()
            : '',
          items: invoice.items.map(item => ({
            id: item.productId,
            description: item.productName,
            quantity: item.quantity,
            rate: item.unitPrice,
            amount: item.totalPrice,
            productId: item.productId,
            variantId: item.variantId,
            variantSKU: item.variantSKU,
            purchaseId: item.purchaseId
          })),
          taxRate: invoice.gstValue || 0,
          discount: invoice.discountAmount,
          discountType: invoice.discountType || 'fixed',
          notes: invoice.notes,
          terms: invoice.termsAndConditions,
          paymentDetails: {
            bankName: PAYMENT_DETAILS.BANK_NAME,
            accountNumber: PAYMENT_DETAILS.ACCOUNT_NUMBER,
            iban: PAYMENT_DETAILS.IBAN
          },
          previousBalance: 0,
          paid: invoice.paidAmount,
          remainingPayment: invoice.balanceAmount,
          amountInWords: 'Amount in words',
          billingType: invoice.billingType,
          market: invoice.market,
          customerId: invoice.customerId
        } as InvoiceTemplateData)
      : ({
          logo: undefined,
          company: COMPANY_DETAILS,
          client: {
            name: invoice.customerName,
            company: invoice.customerCompany,
            address: invoice.customerAddress,
            city: invoice.customerCity || '',
            state: invoice.customerState || '',
            zip: invoice.customerZip || '',
            email: invoice.customerEmail,
            phone: invoice.customerPhone
          },
          quotationNumber: invoice.invoiceNumber,
          date: typeof invoice.date === 'string' ? invoice.date : invoice.date.toISOString(),
          validUntil: invoice.validUntil
            ? typeof invoice.validUntil === 'string'
              ? invoice.validUntil
              : invoice.validUntil.toISOString()
            : '',
          items: invoice.items.map(item => ({
            id: item.productId,
            description: item.productName,
            quantity: item.quantity,
            rate: item.unitPrice,
            amount: item.totalPrice,
            productId: item.productId,
            variantId: item.variantId,
            variantSKU: item.variantSKU,
            purchaseId: item.purchaseId
          })),
          taxRate: invoice.gstValue || 0,
          discount: invoice.discountAmount,
          discountType: invoice.discountType || 'fixed',
          notes: invoice.notes,
          terms: invoice.termsAndConditions,
          amountInWords: 'Amount in words',
          billingType: invoice.billingType,
          market: invoice.market,
          customerId: invoice.customerId
        } as QuotationTemplateData);

  return (
    <div className="container mx-auto py-10">
      <PageHeader
        title={`${invoice.type === 'invoice' ? 'Invoice' : 'Quotation'} ${invoice.invoiceNumber}`}
        backLink="/invoices"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Status
          </Button>
          {invoice.type === 'invoice' && invoice.balanceAmount > 0 && (
            <Button onClick={() => setPaymentDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          )}
          {invoice.type === 'invoice' && !invoice.stockDeducted && (
            <Button variant="outline" onClick={handleDeductStock}>
              Deduct Stock
            </Button>
          )}
          {invoice.type === 'invoice' && invoice.stockDeducted && invoice.status === 'cancelled' && (
            <Button variant="outline" onClick={handleRestoreStock}>
              Restore Stock
            </Button>
          )}
          {invoice.type === 'quotation' && !invoice.convertedToInvoice && invoice.status === 'accepted' && (
            <Button asChild>
              <Link href={`/invoices/new/${invoice.invoiceNumber}`}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Convert to Invoice
              </Link>
            </Button>
          )}
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{invoice.invoiceNumber}</CardTitle>
                  <div className="flex gap-2 mt-2 capitalize">
                    <Badge>{invoice.status}</Badge>
                    <Badge variant="outline">{invoice.market}</Badge>
                    <Badge variant="outline">{invoice.billingType}</Badge>
                    {invoice.type === 'invoice' && (
                      <Badge variant={invoice.stockDeducted ? 'default' : 'secondary'}>
                        {invoice.stockDeducted ? 'Stock Deducted' : 'Stock Not Deducted'}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(invoice.date), 'MMM dd, yyyy')}</p>
                  {invoice.dueDate && (
                    <>
                      <p className="text-sm text-muted-foreground mt-2">Due Date</p>
                      <p className="font-medium">{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</p>
                    </>
                  )}
                  {invoice.validUntil && (
                    <>
                      <p className="text-sm text-muted-foreground mt-2">Valid Until</p>
                      <p className="font-medium">{format(new Date(invoice.validUntil), 'MMM dd, yyyy')}</p>
                    </>
                  )}
                </div>
              </div>
              {invoice.convertedToInvoice && invoice.convertedInvoiceId && <div>
                <Link href={`/invoices/${invoice.convertedInvoiceId}`} className='inline-flex items-center gap-2 text-primary underline underline-offset-2'>
                  View Invoice <ArrowUpRight />
                </Link>
              </div>}
            </CardHeader>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="font-semibold">{invoice.customerName}</p>
                  {invoice.customerCompany && <p className="text-muted-foreground">{invoice.customerCompany}</p>}
                </div>
                <div className="text-sm">
                  <p>{invoice.customerEmail}</p>
                  <p>{invoice.customerPhone}</p>
                  <p className="mt-2">
                    {invoice.customerAddress}
                    {invoice.customerCity && `, ${invoice.customerCity}`}
                    {invoice.customerState && `, ${invoice.customerState}`}
                    {invoice.customerZip && ` ${invoice.customerZip}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.variantSKU && <p className="text-sm text-muted-foreground">SKU: {item.variantSKU}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Discount {invoice.discountType === 'percentage' ? `(${invoice.discountValue}%)` : ''}:
                  </span>
                  <span className="font-medium text-red-600">-{formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}
              {invoice.gstAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    GST {invoice.gstType === 'percentage' ? `(${invoice.gstValue}%)` : ''}:
                  </span>
                  <span className="font-medium">{formatCurrency(invoice.gstAmount)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              {invoice.type === 'invoice' && (
                <>
                  <div className="border-t pt-3 flex justify-between">
                    <span className="text-muted-foreground">Paid:</span>
                    <span className="font-medium text-green-600">{formatCurrency(invoice.paidAmount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Balance:</span>
                    <span className={invoice.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(invoice.balanceAmount)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          {invoice.type === 'invoice' && invoice.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.payments.map((payment, index) => (
                    <div key={index} className="flex justify-between items-start border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">{payment.method}</p>
                        {payment.reference && <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>}
                      </div>
                      <p className="text-sm text-muted-foreground">{format(new Date(payment.date), 'MMM dd, yyyy')}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {invoice && (
        <>
          <AddPaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            invoiceId={invoice.id}
            balanceAmount={invoice.balanceAmount}
            onSuccess={fetchInvoice}
          />

          <UpdateStatusDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            invoiceId={invoice.id}
            currentStatus={invoice.status}
            type={invoice.type}
            onSuccess={fetchInvoice}
          />

          <EditInvoiceDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            invoice={invoice}
            onSuccess={fetchInvoice}
          />
        </>
      )}

      {/* Print Preview Sheet */}
      <Sheet open={isPrintPreviewOpen} onOpenChange={setIsPrintPreviewOpen}>
        <SheetContent side="right" className="w-full sm:max-w-5xl overflow-y-auto">
          <SheetHeader>
            <h2 className="text-lg font-semibold text-primary inline-flex items-center gap-2">
              {' '}
              <Printer /> Print Preview
            </h2>
          </SheetHeader>
          <div className="mt-6" ref={printRef}>
            {invoice.type === 'invoice' ? (
              <NewonInvoiceTemplate
                invoiceData={templateData as InvoiceTemplateData}
                onBack={() => setIsPrintPreviewOpen(false)}
                onPrint={handleReactToPrint}
              />
            ) : (
              <QuotationTemplate
                quotationData={templateData as QuotationTemplateData}
                onBack={() => setIsPrintPreviewOpen(false)}
                onPrint={handleReactToPrint}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
