'use client';

import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Download, Save } from "lucide-react";

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
};

type CompanyDetails = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
};

type ClientDetails = {
  name: string;
  company: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  email: string;
  phone: string;
};

type PaymentDetails = {
  bankName: string;
  accountNumber: string;
  iban: string;
};

type InvoiceData = {
  logo?: string;
  company: CompanyDetails;
  client: ClientDetails;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  taxRate: number;
  discount: number;
  notes: string;
  terms: string;
  paymentDetails: PaymentDetails;
  previousBalance: number;
  paid: number;
  remainingPayment: number;
  amountInWords: string;
};

type InvoiceTemplateProps = {
  invoiceData: InvoiceData;
  onBack?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
};

export function NewonInvoiceTemplate({ 
  invoiceData, 
  onBack, 
  onPrint, 
  onSave 
}: InvoiceTemplateProps) {
  const subtotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal * invoiceData.taxRate) / 100;
  const total = subtotal + taxAmount - invoiceData.discount;
  const grandTotal = total + (invoiceData.previousBalance || 0);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Use company information from form data

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm print:shadow-none print:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-8 border-b">
        <div className="mb-6 md:mb-0">
          {invoiceData.logo ? (
            <img 
              src={invoiceData.logo} 
              alt="Company Logo" 
              className="h-16 mb-4"
            />
          ) : (
            <h1 className="text-3xl font-bold text-primary">{invoiceData.company.name || 'Company Name'}</h1>
          )}
          <div className="text-muted-foreground text-sm">
            <p>{invoiceData.company.address}</p>
            <p>{invoiceData.company.city} {invoiceData.company.state} {invoiceData.company.zip}</p>
            {invoiceData.company.phone && <p>{invoiceData.company.phone}</p>}
            {invoiceData.company.email && <p>{invoiceData.company.email}</p>}
            {invoiceData.company.website && <p>{invoiceData.company.website}</p>}
          </div>
        </div>
        
        <div className="text-right">
          <h1 className="text-3xl font-bold text-primary mb-2">INVOICE</h1>
          <div className="text-muted-foreground text-sm">
            <p>Invoice #: <span className="font-medium text-foreground">{invoiceData.invoiceNumber}</span></p>
            <p>Date: <span className="font-medium text-foreground">{formatDate(invoiceData.date)}</span></p>
            <p>Due Date: <span className="font-medium text-foreground">{formatDate(invoiceData.dueDate)}</span></p>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-8 pb-8 border-b">
        <h2 className="text-lg font-bold mb-4">Bill To:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="font-medium">{invoiceData.client.name}</p>
            {invoiceData.client.company && <p>{invoiceData.client.company}</p>}
            <p>{invoiceData.client.address}</p>
            <p>{invoiceData.client.city}, {invoiceData.client.state} {invoiceData.client.zip}</p>
            {invoiceData.client.phone && <p><span className="font-semibold">Phone: </span>{invoiceData.client.phone}</p>}
            {invoiceData.client.email && <p><span className="font-semibold">Email: </span>{invoiceData.client.email}</p>}
          </div>
          <div className="md:text-right">
            <h3 className="text-lg font-bold mb-2">Payment Details</h3>
            <div className="bg-muted/30 p-4 rounded-lg inline-block">
              <p><span className="font-semibold">Bank:</span> {invoiceData.paymentDetails.bankName}</p>
              <p><span className="font-semibold">Account #:</span> {invoiceData.paymentDetails.accountNumber}</p>
              <p><span className="font-semibold">IBAN:</span> {invoiceData.paymentDetails.iban}</p>
            </div>
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
            {invoiceData.items.map((item, index) => (
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
          {invoiceData.taxRate > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">
                Tax ({invoiceData.taxRate}%):
              </span>
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

      {/* Notes & Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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
      <div className="pt-8 border-t">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-sm text-muted-foreground">Thank you for your business!</p>
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
              > <Download />
                Print Invoice
              </Button>
            )}
            {onSave && (
              <Button 
                onClick={onSave}
                className="print:hidden"
              >
                <Save />
                Save Invoice
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
