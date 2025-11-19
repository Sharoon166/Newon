import { PageHeader } from '@/components/general/page-header';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { getProducts } from '@/features/inventory/actions';
import { getInvoiceByNumber } from '@/features/invoices/actions';
import { QuotationConversionForm } from '@/features/invoices/components/quotation-conversion-form';
import { getAllPurchases } from '@/features/purchases/actions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Info } from 'lucide-react';
import { notFound } from 'next/navigation';

interface QuotationConversionPageProps {
  params: {
    quotationId: string;
  };
}

export default async function QuotationConversionPage({ params }: QuotationConversionPageProps) {
  const { quotationId } = await params;

  const quotation = await getInvoiceByNumber(quotationId.toUpperCase());

  if (!quotation || quotation.type != "quotation") {
    return notFound();
  }

  const [variants, purchases] = await Promise.all([getProducts(), getAllPurchases()]);

  return (
    <div className="container mx-auto py-10">
      <PageHeader
        title={`Convert ${quotation.invoiceNumber} to Invoice`}
        description="Review and convert this quotation to an invoice"
      />

      <div className="bg-white py-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Quotation Details</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Quotation #</p>
            <p>{quotation.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p>{formatDate(quotation.date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <div className="inline-flex items-center gap-2">
              {quotation.customerName}
              <Popover>
                <PopoverTrigger>
                  <Info className="text-primary cursor-pointer" />
                  <span className="sr-only">View Details</span>
                </PopoverTrigger>
                <PopoverContent className="text-sm">
                  <div>
                    <span className="font-semibold text-primary">Email: </span>
                    {quotation.customerEmail}
                  </div>
                  <div>
                    <span className="font-semibold text-primary">Pone Number: </span>
                    {quotation.customerPhone}
                  </div>
                  <div>
                    <span className="font-semibold text-primary">Address: </span>
                    {quotation.customerAddress}
                  </div>
                  <div>
                    <span className="font-semibold text-primary">City: </span>
                    {quotation.customerCity}
                  </div>
                  <div>
                    <span className="font-semibold text-primary">State: </span>
                    {quotation.customerState}
                  </div>
                  <div>
                    <span className="font-semibold text-primary">Zip: </span>
                    {quotation.customerZip}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p>{formatCurrency(quotation.totalAmount)}</p>
          </div>
        </div>
        <Separator className="mb-10" />

        <QuotationConversionForm
          quotation={{
            quotationNumber: quotation.invoiceNumber,
            date: typeof quotation.date === 'string' ? quotation.date : quotation.date.toISOString().split('T')[0],
            validUntil: quotation.validUntil
              ? typeof quotation.validUntil === 'string'
                ? quotation.validUntil
                : quotation.validUntil.toISOString().split('T')[0]
              : '',
            customerName: quotation.customerName,
            customerCompany: quotation.customerCompany,
            customerEmail: quotation.customerEmail,
            customerPhone: quotation.customerPhone,
            customerAddress: quotation.customerAddress,
            customerCity: quotation.customerCity ?? '',
            customerState: quotation.customerState ?? '',
            customerZip: quotation.customerZip ?? '',
            customerId: quotation.customerId,
            items: quotation.items.map((item) => ({
              id: crypto.randomUUID(),
              productName: item.productName,
              description: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              unit: item.unit,
              variantId: item.variantId,
              variantSKU: item.variantSKU,
              productId: item.productId,
              purchaseId: item.purchaseId
            })),
            subtotal: quotation.subtotal,
            discountType: quotation.discountType || 'fixed',
            discountValue: quotation.discountValue || 0,
            discountAmount: quotation.discountAmount || 0,
            gstValue: quotation.gstValue || 0,
            gstAmount: quotation.gstAmount || 0,
            taxRate: quotation.gstValue || 0,
            taxAmount: quotation.gstAmount || 0,
            totalAmount: quotation.totalAmount,
            amountInWords: '',
            notes: quotation.notes,
            termsAndConditions: quotation.termsAndConditions,
            terms: quotation.termsAndConditions,
            billingType: quotation.billingType,
            market: quotation.market
          }}
          quotationId={quotation.id}
          customerData={{
            customerName: quotation.customerName,
            customerCompany: quotation.customerCompany,
            customerEmail: quotation.customerEmail,
            customerPhone: quotation.customerPhone,
            customerAddress: quotation.customerAddress,
            customerCity: quotation.customerCity ?? null,
            customerState: quotation.customerState ?? null,
            customerZip: quotation.customerZip ?? null,
            customerId: quotation.customerId
          }}
          variants={variants}
          purchases={purchases}
        />
      </div>
    </div>
  );
}
