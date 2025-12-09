'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { getInvoice, deductInvoiceStock, restoreInvoiceStock } from '@/features/invoices/actions';
import { Invoice } from '@/features/invoices/types';
import { PageHeader } from '@/components/general/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Plus, Edit, RefreshCw, ArrowUpRight, Info, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AddPaymentDialog } from '@/features/invoices/components/add-payment-dialog';
import { UpdateStatusDialog } from '@/features/invoices/components/update-status-dialog';
import { EditInvoiceDialog } from '@/features/invoices/components/edit-invoice-dialog';
import { PaymentsList } from '@/features/invoices/components/payments-list';
import { NewonInvoiceTemplate } from '@/features/invoices/components/invoice-template';
import { InvoiceTemplateData, QuotationTemplateData } from '@/features/invoices/components/template-types';
import { toast } from 'sonner';
import { COMPANY_DETAILS, PAYMENT_DETAILS } from '@/constants';
import { QuotationTemplate } from '@/features/invoices/components/quotation-template';
import Link from 'next/link';
import { convertToWords } from '@/features/invoices/utils';
import { printInvoicePDF } from '@/features/invoices/utils/print-invoice';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
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
      toast.error((error as Error).message || 'Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactToPrint = useReactToPrint({
    contentRef: printRef,
    preserveAfterPrint: true,
    documentTitle:
      invoice?.type === 'invoice' ? `Invoice-${invoice.invoiceNumber}.pdf` : `Quotation-${invoice?.invoiceNumber}.pdf`,
    onBeforePrint: async () => {
      document.title =
        invoice?.type === 'invoice'
          ? `Invoice-${invoice.invoiceNumber}.pdf`
          : `Quotation-${invoice?.invoiceNumber}.pdf`;
    },
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

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setIsGeneratingPDF(true);
    try {
      await printInvoicePDF(invoice.id, invoice.invoiceNumber, invoice.type);
    } finally {
      setIsGeneratingPDF(false);
    }
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
          email: invoice.customerEmail || '',
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
        amountInWords: `${convertToWords(Math.round(invoice.balanceAmount + (invoice.balanceAmount > 0 ? 0 : 0)))} Rupees Only`,
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
          email: invoice.customerEmail || '',
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
        amountInWords: `${convertToWords(Math.round(invoice.totalAmount))} Rupees Only`,
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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)} disabled={invoice.status === 'cancelled'}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => setStatusDialogOpen(true)} disabled={invoice.status === 'cancelled'}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Status
          </Button>
          {invoice.type === 'invoice' && invoice.balanceAmount > 0 && invoice.status !== 'cancelled' && (
            <Button onClick={() => setPaymentDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          )}
          {invoice.type === 'invoice' && !invoice.stockDeducted && (
            <Button variant="outline" onClick={handleDeductStock} hidden>
              Deduct Stock
            </Button>
          )}
          {invoice.type === 'invoice' && invoice.stockDeducted && invoice.status === 'cancelled' && (
            <Button variant="outline" onClick={handleRestoreStock} hidden>
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
          <Button hidden aria-hidden onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cancelled Banner */}
          {invoice.status === 'cancelled' && (
            <Card className="border-destructive bg-destructive/10">
              <CardContent className="flex items-center gap-2 py-4">
                <Info className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">
                    This {invoice.type === 'invoice' ? 'invoice' : 'quotation'} has been cancelled
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Editing, status updates, and payments are disabled for cancelled {invoice.type === 'invoice' ? 'invoices' : 'quotations'}.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <div className="flex max-sm:flex-col justify-between max-sm:items-start gap-4">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {invoice.invoiceNumber}
                    {invoice.custom && (
                      <span className="text-amber-600" title="Custom Invoice">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 6v6l4 2" />
                        </svg>
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-2 capitalize">
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
                <div className="max-sm:text-right">
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
              {invoice.convertedToInvoice && invoice.convertedInvoiceId && (
                <div>
                  <Link
                    href={`/invoices/${invoice.convertedInvoiceId}`}
                    className="inline-flex items-center gap-2 text-primary underline underline-offset-2"
                  >
                    View Invoice <ArrowUpRight />
                  </Link>
                </div>
              )}
            </CardHeader>
          </Card>

          {/* Customer Info */}
          {invoice.customerId === 'otc' ? (
            <Card className='text-blue-500 bg-blue-50 border-blue-500'>
              <CardContent className='flex gap-2'>
                <Info />
                This is an Over the Counter(OTC) Customer
              </CardContent>
            </Card>
          ) : (
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
                    {invoice.customerEmail && <p>{invoice.customerEmail}</p>}
                    {invoice.customerPhone && <p>{invoice.customerPhone}</p>}
                    {(invoice.customerAddress || invoice.customerCity || invoice.customerState || invoice.customerZip) && (
                      <p className="mt-2">
                        {[invoice.customerAddress, invoice.customerCity, invoice.customerState, invoice.customerZip].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
              {invoice.custom && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-amber-800">Custom Invoice</p>
                  <p className="text-xs text-amber-600">Contains custom items or modified rates</p>
                </div>
              )}
              {invoice.description && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">Internal Notes:</p>
                  <p className="text-xs text-blue-600 whitespace-pre-wrap">{invoice.description}</p>
                </div>
              )}
              {invoice.profit !== undefined && invoice.profit > 0 && (
                <div className="flex justify-between bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                  <span className="text-sm font-medium text-green-800">Profit:</span>
                  <span className="font-semibold text-green-700">{formatCurrency(invoice.profit)}</span>
                </div>
              )}
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
          {invoice.type === 'invoice' && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentsList
                  invoiceId={invoice.id}
                  payments={invoice.payments}
                  onUpdate={fetchInvoice}
                  isCancelled={invoice.status === 'cancelled'}
                />
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
          <SheetHeader className='pt-12 lg:pl-12'>
            <SheetTitle className="text-lg font-semibold text-primary inline-flex items-center gap-2">
              <Printer /> Print Preview
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {invoice.type === 'invoice' ? (
              <NewonInvoiceTemplate
                invoiceData={templateData as InvoiceTemplateData}
                onBack={() => setIsPrintPreviewOpen(false)}
                onPrint={handleReactToPrint}
                ref={printRef}
              />
            ) : (
              <QuotationTemplate
                quotationData={templateData as QuotationTemplateData}
                onBack={() => setIsPrintPreviewOpen(false)}
                onPrint={handleReactToPrint}
                ref={printRef}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
