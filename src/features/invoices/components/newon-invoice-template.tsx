'use client';

import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Download, Save } from 'lucide-react';
import Image from 'next/image';
import { InvoiceTemplateData } from './template-types';

type InvoiceTemplateProps = {
  invoiceData: InvoiceTemplateData;
  onBack?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
};

export const NewonInvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(
  ({ invoiceData, onBack, onPrint, onSave }, ref) => {
  const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal * invoiceData.taxRate) / 100;
  const total = subtotal + taxAmount - invoiceData.discount;
  const grandTotal = total + (invoiceData.previousBalance || 0);

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
          {invoiceData.logo ? (
            <Image src={invoiceData.logo} alt="Company Logo" fill className="h-16 mb-4" />
          ) : (
            <h1 className="text-3xl font-bold text-primary">{invoiceData.company.name || 'Company Name'}</h1>
          )}
          <div className="text-muted-foreground text-sm print:text-xs">
            <p>{invoiceData.company.address}</p>
            <p>
              {invoiceData.company.city} {invoiceData.company.state} {invoiceData.company.zip}
            </p>
            {invoiceData.company.phone && <p>{invoiceData.company.phone}</p>}
            {invoiceData.company.email && <p>{invoiceData.company.email}</p>}
            {invoiceData.company.website && <p>{invoiceData.company.website}</p>}
          </div>
        </div>

        <div className="text-right">
          <h1 className="text-3xl font-bold text-primary mb-2 print:hidden">INVOICE</h1>
          <div className="text-foreground text-sm font-bold print:text-xs">
            <p>
              <span className='print:hidden'>Invoice #:</span>
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
      <div className="mb-8 print:mb-2 pb-8 print:pb-4 border-b print:border-none">
        <div className="grid print:grid-cols-2 grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="text-muted-foreground text-sm print:text-xs">
            <h2 className="text-lg font-bold mb-4 text-primary">To:</h2>
            <p className="font-medium">
              {invoiceData.client.name}{' '}
              {invoiceData.client.company && (
                <span className="text-muted-foreground"> - {invoiceData.client.company}</span>
              )}
            </p>
            <p>{invoiceData.client.address}</p>
            <p>
              {invoiceData.client.city}, {invoiceData.client.state} {invoiceData.client.zip}
            </p>
            {invoiceData.client.phone && <p>{invoiceData.client.phone}</p>}
            {invoiceData.client.email && <p>{invoiceData.client.email}</p>}
          </div>
          <div className="md:text-right print:text-right">
            <h3 className="text-lg font-bold mb-2">Payment Details</h3>
            <div className="bg-muted/30 p-4 rounded-lg inline-block">
              <p>
                <span className="font-semibold">Bank:</span> {invoiceData.paymentDetails.bankName}
              </p>
              <p>
                <span className="font-semibold">Account #:</span> {invoiceData.paymentDetails.accountNumber}
              </p>
              <p>
                <span className="font-semibold">IBAN:</span> {invoiceData.paymentDetails.iban}
              </p>
            </div>
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
            {invoiceData.items.map((item, index) => (
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
          {invoiceData.taxRate > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Tax ({invoiceData.taxRate}%):</span>
              <span className="font-medium">{formatCurrency(taxAmount)}</span>
            </div>
          )}
          {invoiceData.discount > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Discount:</span>
              <span className="font-medium text-destructive">-{formatCurrency(invoiceData.discount)}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-t mt-2">
            <span className="font-medium">Total Amount:</span>
            <span className="font-medium">{formatCurrency(total)}</span>
          </div>

          {invoiceData.previousBalance > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Previous Balance:</span>
              <span className="font-medium">+{formatCurrency(invoiceData.previousBalance)}</span>
            </div>
          )}

          <div className="flex justify-between py-2 border-t">
            <span className="font-bold">Grand Total:</span>
            <span className="font-bold">{formatCurrency(grandTotal)}</span>
          </div>

          {invoiceData.paid > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-medium">-{formatCurrency(invoiceData.paid)}</span>
            </div>
          )}

          <div className="flex justify-between py-2 border-t font-bold">
            <span>Remaining Balance:</span>
            <span className={invoiceData.remainingPayment > 0 ? 'text-red-600' : 'text-green-600'}>
              {formatCurrency(invoiceData.remainingPayment)} {invoiceData.remainingPayment > 0 ? '(Due)' : '(Paid)'}
            </span>
          </div>

          <div className="pt-2 mt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Amount in words:</span> {invoiceData.amountInWords || 'Zero Rupees Only'}
            </p>
          </div>
        </div>
      </div>

      {/* Spacer to push content to bottom when printing */}
      <div className="print:flex-1" />

      {/* Notes & Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:mb-4">
        {invoiceData.notes && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
            <p className="whitespace-pre-line">{invoiceData.notes}</p>
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
      <div className="pt-8 print:pt-2 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 print:mb-1 md:mb-0">
            <p className="text-sm print:text-xs text-muted-foreground">Thank you for your business!</p>
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
                {' '}
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
  );
});

NewonInvoiceTemplate.displayName = 'NewonInvoiceTemplate';
