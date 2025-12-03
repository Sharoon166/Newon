'use client';

import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Download, Save } from 'lucide-react';
import Image from 'next/image';
import { InvoiceTemplateData } from './template-types';
import useBrandStore from '@/stores/useBrandStore';

type InvoiceTemplateProps = {
  invoiceData: InvoiceTemplateData;
  onBack?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
};

type InvoiceTemplatePropsWithMode = InvoiceTemplateProps & {
  viewMode?: 'print' | 'mobile';
};

export const NewonInvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplatePropsWithMode>(
  ({ invoiceData, onBack, onPrint, onSave, viewMode = 'print' }, ref) => {
    const { getCurrentBrand, } = useBrandStore();
    const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * invoiceData.taxRate) / 100;
    const discountAmount =
      invoiceData.discountType === 'percentage' ? (subtotal * invoiceData.discount) / 100 : invoiceData.discount;
    const total = subtotal + taxAmount - discountAmount;

    const isOTC = invoiceData.customerId === 'otc';
    const outstandingBalance = isOTC ? 0 : invoiceData.outstandingBalance || 0;
    const paidAmount = invoiceData.paid || 0;
    const grandTotal = Math.max(0, total - paidAmount);

    const isMobileView = viewMode === 'mobile';

    
    return (
      <div
        ref={ref}
        className={`max-w-4xl mx-auto bg-white ${
          isMobileView 
            ? 'p-4 border-0 shadow-none' 
            : 'p-8 not-print:border rounded-lg shadow-sm print:shadow-none print:p-4 print:flex print:flex-col'
        }`}
      >
        {/* Header */}
        <div className={`flex flex-col sm:flex-row print:flex-row justify-between items-start md:items-center ${
          isMobileView ? 'mb-4 pb-4' : 'mb-8 print:mb-2 pb-8 print:pb-2'
        } border-b print-no-break`}>
          <div className="mb-6 md:mb-0 print:mb-0">
            {getCurrentBrand()?.logo ? (
              <Image src={getCurrentBrand()?.logo || ""} unoptimized alt="Company Logo" width={200} height={100} className="w-24 mb-4" />
            ) : (
              <h1 className="text-3xl font-bold text-primary">{invoiceData.company.name || 'Company Name'}</h1>
            )}
            <div className="text-muted-foreground text-sm print:text-xs">
              <p className="max-w-sm">{invoiceData.company.address}</p>
              <p>
                {invoiceData.company.city} {invoiceData.company.state} {invoiceData.company.zip}
              </p>
              {invoiceData.company.phone && <p>{invoiceData.company.phone}</p>}
              {invoiceData.company.email && <p>{invoiceData.company.email}</p>}
              {invoiceData.company.website && <p>{invoiceData.company.website}</p>}
              {getCurrentBrand()?.ntnNo && (
                <p>
                  <span className="font-semibold">NTN#:</span> {getCurrentBrand().ntnNo}
                </p>
              )}
              {getCurrentBrand()?.strnNo && (
                <p>
                  <span className="font-semibold">STRN#:</span>
                  {getCurrentBrand().strnNo}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-foreground text-sm font-bold print:text-xs">
              <p>
                <span className="print:hidden">Invoice #:</span>
                <span className="text-primary print:text-lg">{invoiceData.invoiceNumber}</span>
              </p>
              <p>
                Date: <span className="font-medium text-muted-foreground">{formatDate(invoiceData.date)}</span>
              </p>
              <p>
                Due Date: <span className="font-medium text-muted-foreground">{formatDate(invoiceData.dueDate)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8 print:mb-2 pb-8 print:pb-2 border-b print:border-none print-no-break">
          <div className="grid print:grid-cols-2 grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="text-muted-foreground text-sm print:text-xs">
              <h2 className="text-lg font-bold mb-1 text-primary">
                To:{' '}
                {isOTC && <span className="text-muted-foreground font-medium text-sm">{invoiceData.client.name}</span>}
              </h2>
              {!isOTC && (
                <>
                  <p className="font-medium">
                    {invoiceData.client.name}{' '}
                    {invoiceData.client.company && (
                      <span className="text-muted-foreground"> - {invoiceData.client.company}</span>
                    )}
                  </p>
                  {invoiceData.client.address && <p>{invoiceData.client.address}</p>}
                  {(invoiceData.client.city || invoiceData.client.state || invoiceData.client.zip) && (
                    <p>
                      {[invoiceData.client.city, invoiceData.client.state, invoiceData.client.zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  {invoiceData.client.phone && <p>{invoiceData.client.phone}</p>}
                  {invoiceData.client.email && <p>{invoiceData.client.email}</p>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className={`${isMobileView ? 'mb-3' : 'mb-4 print:mb-2'} invoice-table-container`}>
          <table className={`w-full border-collapse ${isMobileView ? '' : 'rounded-xl'} invoice-table`}>
            <thead>
              <tr className="bg-muted/50 text-left text-sm font-medium">
                <th className="p-3 print:py-2 border">#</th>
                <th className="p-3 print:py-2 border">Description</th>
                <th className="p-3 print:py-2 border text-right">Qty</th>
                <th className="p-3 print:py-2 border text-right">Rate</th>
                <th className="p-3 print:py-2 border text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceData.items.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                  <td className="p-3 print:py-2 border">{index + 1}.</td>
                  <td className="p-3 print:py-2 border">{item.description || 'Item description'}</td>
                  <td className="p-3 print:py-2 border text-right">{item.quantity}</td>
                  <td className="p-3 print:py-2 border text-right">{formatCurrency(item.rate)}</td>
                  <td className="p-3 print:py-2 border text-right font-medium">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Details and Totals Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-4 print:mb-2 print-no-break print:grid-cols-2">
          {/* Payment Details - Left Side */}
          <div className="flex-1 max-md:order-2 print:order-1">
            <div>
              <h3 className="text-base font-bold mb-3 text-primary flex items-center gap-2">Payment Details</h3>
              <div className="space-y-2 text-sm print:text-xs">
                <div className="grid gap-2">
                  <span className="text-muted-foreground font-medium">Bank:</span>
                  <span className="font-semibold">{invoiceData.paymentDetails.bankName}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground font-medium">Account #:</span>
                  <span className="font-semibold">{invoiceData.paymentDetails.accountNumber}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground font-medium">IBAN:</span>
                  <span className="font-semibold">{invoiceData.paymentDetails.iban}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Totals - Right Side */}
          <div className="w-full order-1">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {invoiceData.taxRate > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Tax ({invoiceData.taxRate}%):</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            {invoiceData.discount > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">
                  Discount {invoiceData.discountType === 'percentage' ? `(${invoiceData.discount}%)` : ''}:
                </span>
                <span className="font-medium text-destructive">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t mt-2">
              <span className="font-medium">Total:</span>
              <span className="font-medium">{formatCurrency(total)}</span>
            </div>

            {invoiceData.paid > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Paid:</span>
                <span className="font-medium">{formatCurrency(invoiceData.paid)}</span>
              </div>
            )}



            {!isOTC && outstandingBalance > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Outstanding Balance:</span>
                <span className="font-medium text-orange-600">{formatCurrency(outstandingBalance)}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-t font-bold">
              <span>Grand Total:</span>
              <span className="font-bold">{formatCurrency(grandTotal)}</span>
            </div>

            <div className="pt-2 mt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Amount in words:</span> {invoiceData.amountInWords || 'Zero Rupees Only'}
              </p>
            </div>
          </div>
        </div>

        {/* Flexible spacer */}
        <div className="flex-1 print-flexible-spacer" />

        {/* Bottom content group - delivery notes, terms, and footer */}
        <div className="print-bottom-content">
          {/* Delivery Notes Section */}
          <div className="mb-6 print:mb-3 print-footer-section delivery-notes-section border-2 border-primary/60 rounded-lg p-2">
            <div className="bg-linear-to-br from-muted/30 to-muted/10">
              <h3 className="text-sm font-bold mb-3 text-primary flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Delivery Notes
              </h3>
              <div className="min-h-[60px] text-sm text-muted-foreground">
                <p className="italic  print:text-xs">Signature / Remarks</p>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4 print:mb-2 print-footer-section">
            {invoiceData.notes && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                <p className="whitespace-pre-line text-xs">{invoiceData.notes}</p>
              </div>
            )}
            {invoiceData.terms && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Terms & Conditions</h3>
                <p className="whitespace-pre-line text-xs">{invoiceData.terms}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 print:pt-2 border-t print-footer-section">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 print:mb-0 md:mb-0">
              <p className="text-sm print:text-xs text-muted-foreground">Thank you for your buisness!</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 print:hidden">
              {onBack && (
                <Button variant="outline" onClick={onBack} className="print:hidden">
                  <ArrowLeft />
                  Back to Edit
                </Button>
              )}
              {onPrint && (
                <Button onClick={onPrint} className="print:hidden">
                  <Download />
                  Print Invoice
                </Button>
              )}
              {onSave && (
                <Button onClick={onSave} className="print:hidden">
                  <Save />
                  Save Invoice
                </Button>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }
);

NewonInvoiceTemplate.displayName = 'NewonInvoiceTemplate';
