'use client';

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

export default function QuotationTemplate({ 
  quotationData, 
  onBack, 
  onPrint, 
  onSave 
}: QuotationTemplateProps) {
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
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm print:shadow-none print:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-8 border-b">
        <div className="mb-6 md:mb-0">
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
          <div className="text-muted-foreground text-sm">
            <p>{quotationData.company.address}</p>
            <p>{quotationData.company.city} {quotationData.company.state} {quotationData.company.zip}</p>
            {quotationData.company.phone && <p>{quotationData.company.phone}</p>}
            {quotationData.company.email && <p>{quotationData.company.email}</p>}
            {quotationData.company.website && <p>{quotationData.company.website}</p>}
          </div>
        </div>
        
        <div className="text-right">
          <h1 className="text-3xl font-bold text-primary mb-2">QUOTATION</h1>
          <div className="text-muted-foreground text-sm">
            <p>Quotation #: <span className="font-medium text-foreground">{quotationData.quotationNumber}</span></p>
            <p>Date: <span className="font-medium text-foreground">{formatDate(quotationData.date)}</span></p>
            <p>Valid Until: <span className="font-medium text-foreground">{formatDate(quotationData.validUntil)}</span></p>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8 pb-8 border-b">
        <h2 className="text-lg font-bold mb-4">Quotation For:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="font-medium">{quotationData.client.name}</p>
            {quotationData.client.company && <p>{quotationData.client.company}</p>}
            <p>{quotationData.client.address}</p>
            <p>{quotationData.client.city}, {quotationData.client.state} {quotationData.client.zip}</p>
            {quotationData.client.phone && <p><span className="font-semibold">Phone: </span>{quotationData.client.phone}</p>}
            {quotationData.client.email && <p><span className="font-semibold">Email: </span>{quotationData.client.email}</p>}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse rounded-xl">
          <thead>
            <tr className="bg-muted/50 text-left text-sm font-medium">
              <th className="p-3 border">Description</th>
              <th className="p-3 border text-right">Qty</th>
              <th className="p-3 border text-right">Rate</th>
              <th className="p-3 border text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quotationData.items.map((item, index) => (
              <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                <td className="p-3 border">{item.description || 'Item description'}</td>
                <td className="p-3 border text-right">{item.quantity}</td>
                <td className="p-3 border text-right">{formatCurrency(item.rate)}</td>
                <td className="p-3 border text-right font-medium">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
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

      {/* Notes & Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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
      <div className="pt-8 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-sm text-muted-foreground">Thank you for your interest!</p>
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
}