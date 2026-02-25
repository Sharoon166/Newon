'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { getInvoice, deductInvoiceStock, restoreInvoiceStock } from '@/features/invoices/actions';
import { Invoice } from '@/features/invoices/types';
import { PageHeader } from '@/components/general/page-header';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Printer,
  Plus,
  Edit,
  RefreshCw,
  ArrowUpRight,
  Info,
  Download,
  Eye,
  Layers,
  Coins
} from 'lucide-react';
import Link from 'next/link';
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
  const [productImages, setProductImages] = useState<Map<string, string>>(new Map());
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [breakdownSheetOpen, setBreakdownSheetOpen] = useState(false);
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

      // Fetch product images
      await fetchImages(data.items);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error((error as Error).message || 'Failed to load invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchImages = async (items: Invoice['items']) => {
    const imageMap = new Map<string, string>();

    try {
      const variantIds = items.filter(item => item.variantId).map(item => item.variantId as string);

      if (variantIds.length === 0) return;

      // Fetch images from API
      const response = await fetch('/api/products/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantIds })
      });

      if (response.ok) {
        const data = await response.json();
        Object.entries(data).forEach(([variantId, imageUrl]) => {
          if (imageUrl) {
            imageMap.set(variantId, imageUrl as string);
          }
        });
        setProductImages(imageMap);
      }
    } catch (error) {
      console.warn('Failed to fetch product images:', error);
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

  const handleViewBreakdown = (index: number) => {
    setSelectedItemIndex(index);
    setBreakdownSheetOpen(true);
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
            purchaseId: item.purchaseId,
            imageUrl: item.variantId ? productImages.get(item.variantId) : undefined
          })),
          taxRate: invoice.gstValue || 0,
          discount: invoice.discountValue,
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
            purchaseId: item.purchaseId,
            imageUrl: item.variantId ? productImages.get(item.variantId) : undefined
          })),
          taxRate: invoice.gstValue || 0,
          discount: invoice.discountValue,
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
          {/* Edit button - Navigate to edit page for quotations and pending invoices, use dialog for paid/partial */}
          {invoice.type === 'quotation' || invoice.status === 'pending' ? (
            <Button variant="outline" asChild disabled={invoice.status === 'cancelled'}>
              <Link href={`/invoices/${invoice.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => setEditDialogOpen(true)} 
              disabled={invoice.status === 'cancelled'}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
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
                    Editing, status updates, and payments are disabled for cancelled{' '}
                    {invoice.type === 'invoice' ? 'invoices' : 'quotations'}.
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
            <Card className="text-blue-500 bg-blue-50 border-blue-500">
              <CardContent className="flex gap-2">
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
                    {(invoice.customerAddress ||
                      invoice.customerCity ||
                      invoice.customerState ||
                      invoice.customerZip) && (
                      <p className="mt-2">
                        {[invoice.customerAddress, invoice.customerCity, invoice.customerState, invoice.customerZip]
                          .filter(Boolean)
                          .join(', ')}
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}. </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          {item.variantSKU && item.variantId?.startsWith('var') && (
                            <p className="text-sm text-muted-foreground">SKU: {item.variantSKU}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{formatCurrency(item.unitPrice)}</p>
                          {item.customExpenses && item.customExpenses.length > 0 && item.customExpenses[0].actualCost !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              Actual: {formatCurrency(item.customExpenses[0].actualCost)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                      <TableCell className="text-right">
                        {item.isVirtualProduct && (
                          <Button variant="ghost" size="sm" onClick={() => handleViewBreakdown(index)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Breakdown
                          </Button>
                        )}
                      </TableCell>
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
          <SheetHeader className="pt-12 lg:pl-12">
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

      {/* Virtual Product Breakdown Sheet */}
      <Sheet open={breakdownSheetOpen} onOpenChange={setBreakdownSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl px-8 pb-12 overflow-y-auto">
          <SheetHeader className="px-0">
            <SheetTitle className="text-primary">Virtual Product Breakdown</SheetTitle>
          </SheetHeader>

          {selectedItemIndex !== null &&
            invoice.items[selectedItemIndex] &&
            (() => {
              const item = invoice.items[selectedItemIndex];
              const componentCost = item.totalComponentCost || 0;
              const customCost = item.totalCustomExpenses || 0;
              const totalCost = componentCost + customCost;
              const profit = item.totalPrice - totalCost;
              const margin = item.totalPrice > 0 ? ((profit / item.totalPrice) * 100).toFixed(1) : '0.0';

              return (
                <div className="mt-6 space-y-6">
                  {/* Product Header */}
                  <div className="pt-6 pb-4 border-b">
                    <h2 className="text-2xl font-semibold tracking-tight">{item.productName}</h2>
                    <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                      {item.variantSKU && <span>SKU: {item.variantSKU}</span>}
                      <span>
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  </div>

                  {/* KPI Bar */}
                  <div className="py-6 border-b">
                    <div className="flex justify-between flex-wrap gap-6">
                      <div>
                        <p className="text-xs uppercase text-muted-foreground tracking-wide">Selling Price</p>
                        <p className="mt-1 text-2xl font-semibold">{formatCurrency(item.totalPrice)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground tracking-wide">Total Cost</p>
                        <p className="mt-1 text-2xl font-semibold">{formatCurrency(totalCost)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-muted-foreground tracking-wide">Profit</p>
                        <p className={`mt-1 text-3xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(profit)}
                        </p>
                        <p className="text-xs text-muted-foreground">{margin}% margin</p>
                      </div>
                    </div>
                  </div>

                  {/* Cost Breakdown Section */}
                  <div className="py-6 space-y-8">
                    <h3 className="text-lg font-semibold tracking-tight text-primary">Cost Breakdown</h3>

                    {/* Component Breakdown */}
                    {item.componentBreakdown && item.componentBreakdown.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium text-primary inline-flex items-center gap-2">
                            <Layers className="size-6" />
                            Components
                          </h3>
                          <p className="text-sm text-muted-foreground">{formatCurrency(componentCost)}</p>
                        </div>
                        <div className="divide-y">
                          {item.componentBreakdown.map((c, idx) => (
                            <div key={idx} className="flex justify-between items-center py-3">
                              <div>
                                <p className="font-medium">{c.productName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {c.sku} @ {c.purchaseId}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {c.quantity} × {formatCurrency(c.unitCost)}
                                </p>
                              </div>
                              <p className="font-medium">{formatCurrency(c.totalCost)}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Expenses */}
                    {item.customExpenses && item.customExpenses.length > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium text-primary inline-flex items-center gap-2">
                            <Coins className="size-6" />
                            Custom Expenses
                          </h3>
                          <p className="text-sm text-muted-foreground">{formatCurrency(customCost)}</p>
                        </div>
                        <div className="divide-y">
                          {item.customExpenses.map((e, idx) => {
                            const actualCost = e.actualCost ?? 0;
                            const clientCost = e.clientCost ?? 0;
                            const expenseProfit = clientCost - actualCost;
                            const expenseMargin = actualCost > 0 ? ((expenseProfit / actualCost) * 100).toFixed(1) : '0.0';
                            
                            return (
                              <div key={idx} className="py-3 space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">{e.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{e.category}</p>
                                    {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">{formatCurrency(clientCost)}</p>
                                    <p className="text-xs text-muted-foreground">Client Cost</p>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center text-sm bg-muted/50 rounded p-2">
                                  <div className="flex gap-4">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Actual Cost</p>
                                      <p className="font-medium">{formatCurrency(actualCost)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Profit</p>
                                      <p className={`font-medium ${expenseProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(expenseProfit)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Margin</p>
                                    <p className={`font-medium ${parseFloat(expenseMargin) >= 20 ? 'text-green-600' : parseFloat(expenseMargin) >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
                                      {expenseMargin}%
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
