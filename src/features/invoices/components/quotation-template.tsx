'use client';

import { forwardRef } from 'react';
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Download, Save } from "lucide-react";
import Image from "next/image";
import { QuotationTemplateData } from './template-types';

type QuotationTemplateProps = {
  quotationData: QuotationTemplateData;
  onBack?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
};

export const QuotationTemplate = forwardRef<HTMLDivElement, QuotationTemplateProps>(
  ({ quotationData, onBack, onPrint, onSave }, ref) => {
  const subtotal = quotationData.items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal * quotationData.taxRate) / 100;
  const discountAmount = quotationData.discountType === 'percentage' 
    ? (subtotal * quotationData.discount) / 100 
    : quotationData.discount;
  const total = subtotal + taxAmount - discountAmount;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div ref={ref} className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm print:shadow-none print:p-0 print:min-h-screen print:flex print:flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start md:items-center mb-8 print:mb-3 pb-8 print:pb-3 border-b">
        <div className="mb-6 md:mb-0 print:mb-0">
          {quotationData.logo ? (
            <Image
              src={quotationData.logo} 
              alt="Company Logo" 
              fill
              className="h-16 mb-4"
            />
          ) : (
            <h1 className="text-3xl font-bold text-primary">{quotationData.company.name || 'Company Name'}</h1>
          )}
          <div className="text-muted-foreground text-sm print:text-xs">
            <p>{quotationData.company.address}</p>
            <p>{quotationData.company.city} {quotationData.company.state} {quotationData.company.zip}</p>
            {quotationData.company.phone && <p>{quotationData.company.phone}</p>}
            {quotationData.company.email && <p>{quotationData.company.email}</p>}
            {quotationData.company.website && <p>{quotationData.company.website}</p>}
          </div>
        </div>
        
        <div className="text-right">
          <h1 className="text-3xl font-bold text-primary mb-2 print:hidden">QUOTATION</h1>
          <div className="text-foreground text-sm font-bold print:text-xs">
            <p>
              <span className='print:hidden'>Quotation #:</span>
              <span className="text-primary print:text-lg">{quotationData.quotationNumber}</span>
            </p>
            <p>
              Date: <span className="font-medium text-muted-foreground">{formatDate(quotationData.date)}</span>
            </p>
            <p>
              Valid Until: <span className="font-medium text-muted-foreground">{formatDate(quotationData.validUntil)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8 print:mb-2 pb-8 print:pb-4 border-b print:border-none">
        <div className="grid print:grid-cols-2 grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="text-muted-foreground text-sm print:text-xs">
            <h2 className="text-lg font-bold mb-4 text-primary">To:</h2>
            <p className="font-medium">
              {quotationData.client.name}{' '}
              {quotationData.client.company && (
                <span className="text-muted-foreground"> - {quotationData.client.company}</span>
              )}
            </p>
            <p>{quotationData.client.address}</p>
            <p>{quotationData.client.city}, {quotationData.client.state} {quotationData.client.zip}</p>
            {quotationData.client.phone && <p>{quotationData.client.phone}</p>}
            {quotationData.client.email && <p>{quotationData.client.email}</p>}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse rounded-xl">
          <thead>
            <tr className="bg-muted/50 text-left text-sm font-medium">
              <th className="p-3 print:py-2 border">Description</th>
              <th className="p-3 print:py-2 border text-right">Qty</th>
              <th className="p-3 print:py-2 border text-right">Rate</th>
              <th className="p-3 print:py-2 border text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quotationData.items.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                <td className="p-3 print:py-2 border">{item.description || 'Item description'}</td>
                <td className="p-3 print:py-2 border text-right">{item.quantity}</td>
                <td className="p-3 print:py-2 border text-right">{formatCurrency(item.rate)}</td>
                <td className="p-3 print:py-2 border text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end print:max-w-xs print:ml-auto mb-8">
        <div className="w-full md:w-1/2">
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          {quotationData.taxRate > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">
                Tax ({quotationData.taxRate}%):
              </span>
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
              <span className="font-medium">Amount in words:</span> {quotationData.amountInWords || 'Zero Rupees Only'}
            </p>
          </div>
        </div>
      </div>

      {/* Spacer to push content to bottom when printing */}
      <div className="print:flex-1" />

      {/* Notes & Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:mb-4">
        {quotationData.notes && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
            <p className="whitespace-pre-line">{quotationData.notes}</p>
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
      <div className="pt-8 print:pt-2 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 print:mb-1 md:mb-0">
            <p className="text-sm print:text-xs text-muted-foreground">Thank you for your interest!</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {onBack && (
              <Button 
                variant="outline" 
                onClick={onBack}
                className="print:hidden"
              >
                <ArrowLeft />
                Back to Edit
              </Button>
            )}
            {onPrint && (
              <Button 
                variant="outline" 
                onClick={onPrint}
                className="print:hidden"
              >
                <Download />
                Print Quotation
              </Button>
            )}
            {onSave && (
              <Button 
                onClick={onSave}
                className="print:hidden"
              >
                <Save />
                Save Quotation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

QuotationTemplate.displayName = 'QuotationTemplate';