'use client';

import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowLeft, Download, Save } from 'lucide-react';
import Image from 'next/image';
import { QuotationTemplateData } from './template-types';
import useBrandStore from '@/stores/useBrandStore';

type QuotationTemplateProps = {
  quotationData: QuotationTemplateData;
  onBack?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
};

export const QuotationTemplate = forwardRef<HTMLDivElement, QuotationTemplateProps>(
  ({ quotationData, onBack, onPrint, onSave }, ref) => {
    const { getCurrentBrand } = useBrandStore();

    const subtotal = quotationData.items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * quotationData.taxRate) / 100;
    const discountAmount =
      quotationData.discountType === 'percentage' ? (subtotal * quotationData.discount) / 100 : quotationData.discount;
    const total = subtotal + taxAmount - discountAmount;

    return (
      <div
        ref={ref}
        className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm print:shadow-none print:p-4 print:flex print:flex-col"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start md:items-center mb-8 print:mb-2 pb-8 print:pb-2 border-b print-no-break">
          <div className="mb-6 md:mb-0 print:mb-0">
            {quotationData.logo ? (
              <Image src={quotationData.logo} alt="Company Logo" fill className="h-16 mb-4" />
            ) : (
              <h1 className="text-3xl font-bold text-primary">{quotationData.company.name || 'Company Name'}</h1>
            )}
            <div className="text-muted-foreground text-sm print:text-xs">
              <p>{quotationData.company.address}</p>
              <p>
                {quotationData.company.city} {quotationData.company.state} {quotationData.company.zip}
              </p>
              {quotationData.company.phone && <p>{quotationData.company.phone}</p>}
              {quotationData.company.email && <p>{quotationData.company.email}</p>}
              {quotationData.company.website && <p>{quotationData.company.website}</p>}
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
            <h1 className="text-3xl font-bold text-primary mb-2 print:hidden">QUOTATION</h1>
            <div className="text-foreground text-sm font-bold print:text-xs">
              <p>
                <span className="print:hidden">Quotation #:</span>
                <span className="text-primary print:text-lg">{quotationData.quotationNumber}</span>
              </p>
              <p>
                Date: <span className="font-medium text-muted-foreground">{formatDate(quotationData.date)}</span>
              </p>
              <p>
                Valid Until:{' '}
                <span className="font-medium text-muted-foreground">{formatDate(quotationData.validUntil)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8 print:mb-2 pb-8 print:pb-2 border-b print:border-none print-no-break">
          <div className="grid print:grid-cols-2 grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="text-muted-foreground text-sm print:text-xs">
              <h2 className="text-lg font-bold mb-4 text-primary">To:</h2>
              <p className="font-medium">
                {quotationData.client.name}{' '}
                {quotationData.client.company && (
                  <span className="text-muted-foreground"> - {quotationData.client.company}</span>
                )}
              </p>
              {quotationData.client.address && <p>{quotationData.client.address}</p>}
              {(quotationData.client.city || quotationData.client.state || quotationData.client.zip) && (
                <p>
                  {[quotationData.client.city, quotationData.client.state, quotationData.client.zip]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}
              {quotationData.client.phone && <p>{quotationData.client.phone}</p>}
              {quotationData.client.email && <p>{quotationData.client.email}</p>}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4 print:mb-2 quotation-table-container">
          <table className="w-full border-collapse rounded-xl quotation-table">
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
              {quotationData.items.map((item, index) => (
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

        {/* Totals Section */}
        <div className="flex justify-end mb-4 print:mb-2 print-no-break">
          <div className="w-full md:w-1/2">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {quotationData.taxRate > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Tax ({quotationData.taxRate}%):</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            {quotationData.discount > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">
                  Discount {quotationData.discountType === 'percentage' ? `(${quotationData.discount}%)` : ''}:
                </span>
                <span className="font-medium text-destructive">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t mt-2 font-bold">
              <span>Total Amount:</span>
              <span>{formatCurrency(total)}</span>
            </div>



            <div className="pt-2 mt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Amount in words:</span>{' '}
                {quotationData.amountInWords || 'Zero Rupees Only'}
              </p>
            </div>
          </div>
        </div>

        {/* Flexible spacer */}
        <div className="flex-1 print-flexible-spacer" />
      
        {/* Bottom content group - delivery notes, terms, and footer */}
        <div className="print-bottom-content">
          {/* Delivery Notes Section */}
          <div className="mb-6 print:mb-3 print-footer-section delivery-notes-section">
            <div className="border-2 border-primary/30 rounded-lg p-4 bg-linear-to-br from-muted/30 to-muted/10">
              <h3 className="text-base font-bold mb-3 text-primary flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
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
                <p className="italic">Additional delivery instructions or notes can be added here...</p>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-4 print:mb-2 print-footer-section">
            {quotationData.notes && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                <p className="whitespace-pre-line text-xs">{quotationData.notes}</p>
              </div>
            )}
            {quotationData.terms && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Terms & Conditions</h3>
                <p className="whitespace-pre-line text-xs">{quotationData.terms}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-4 print:pt-2 border-t print-footer-section">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-center md:text-left mb-4 print:mb-0 md:mb-0">
              <p className="text-sm print:text-xs text-muted-foreground">Thank you for your interest!</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {onBack && (
                <Button variant="outline" onClick={onBack} className="print:hidden">
                  <ArrowLeft />
                  Back to Edit
                </Button>
              )}
              {onPrint && (
                <Button variant="outline" onClick={onPrint} className="print:hidden">
                  <Download />
                  Print Quotation
                </Button>
              )}
              {onSave && (
                <Button onClick={onSave} className="print:hidden">
                  <Save />
                  Save Quotation
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

QuotationTemplate.displayName = 'QuotationTemplate';
