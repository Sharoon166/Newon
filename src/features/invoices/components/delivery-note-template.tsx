import { forwardRef } from 'react';
import { COMPANY_DETAILS } from '@/constants';
import { brands } from '@/stores/useBrandStore';
import Image from 'next/image';
import { Mail, Phone } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DeliveryNoteItem {
  description: string;
  quantity: number;
  variantSKU?: string;
}

interface DeliveryNoteData {
  deliveryNoteNumber: string;
  date: string;
  orderNumber: string;
  shippingDate?: string;
  market: 'newon' | 'waymor';
  client: {
    name: string;
    company?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone: string;
  };
  items: DeliveryNoteItem[];
  company: typeof COMPANY_DETAILS;
}

interface DeliveryNoteTemplateProps {
  data: DeliveryNoteData;
  onBack?: () => void;
  onPrint?: () => void;
}

export const DeliveryNoteTemplate = forwardRef<HTMLDivElement, DeliveryNoteTemplateProps>(({ data }, ref) => {
  const brand = brands.find(b => b.id === data.market) || brands[0];

  return (
    <div ref={ref} className="pt-10 bg-white max-w-4xl mx-auto print-page-container">
      {/* MAIN PRINT LAYOUT */}
      <div className="print:flex print:flex-col print-main-content p-8">
        {/* HEADER */}
        <div className="bg-[#3d5a80] text-white py-6 px-8 -mx-8 -mt-8 mb-8 print-no-break">
          <h1 className="text-3xl font-bold text-center">DELIVERY NOTE</h1>
        </div>

        {/* COMPANY + CLIENT */}
        <div className="grid grid-cols-2 gap-8 mb-8 border-b pb-6 print-no-break">
          {/* Company */}
          <div>
            {brand?.logo ? (
              <Image src={brand.logo} unoptimized alt="Company Logo" width={120} height={60} className="w-28 mb-2" />
            ) : (
              <h2 className="text-xl font-bold mb-2">{data.company.name}</h2>
            )}

            <div className="text-sm space-y-1">
              <p>{data.company.address}</p>
              <p>
                {data.company.city}, {data.company.state} {data.company.zip}
              </p>
              <p>{data.company.website}</p>
              {brand?.ntnNo && (
                <p>
                  <span className="font-semibold">NTN#:</span> {brand.ntnNo}
                </p>
              )}
              {brand?.strnNo && (
                <p>
                  <span className="font-semibold">STRN#:</span> {brand.strnNo}
                </p>
              )}
            </div>
          </div>

          {/* Client */}
          <div className="text-right text-sm space-y-1">
            <p>
              <span className="font-semibold">To:</span> {data.client.name}
            </p>

            {data.client.company && <p className="text-sm">{data.client.company}</p>}
            {data.client.address && (
              <div className="text-sm">
                <p className="capitalize">{data.client.address}</p>
              </div>
            )}
            <div className="space-y-1 mt-4">
              <div className="flex justify-end gap-2">
                <span className="font-semibold">Order Number:</span>
                <span>{data.orderNumber}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span className="font-semibold">Contact:</span>
                <span>{data.client.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="mb-8 invoice-table-container print-expandable-content">
          <Table className="invoice-table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">S/N</TableHead>
                <TableHead>ITEM</TableHead>
                <TableHead className="w-24 text-center">QTY</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {item.description}
                    {item.variantSKU && <div className="text-xs text-muted-foreground">SKU: {item.variantSKU}</div>}
                  </TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                </TableRow>
              ))}
              {/* Empty rows to fill space */}
              {Array.from({ length: Math.max(0, 10 - data.items.length) }).map((_, index) => (
                <TableRow key={`empty-${index}`}>
                  <TableCell className="h-12">{data.items.length + index + 1}</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* FLEXIBLE SPACER (Push bottom to bottom if short page) */}
        <div className="print-flexible-spacer"></div>

        {/* BOTTOM SECTION */}
        <div className="print-bottom-content">
          {/* Signature */}
          <div className="mt-8 pt-12 border-t-2 border-dashed border-gray-300 print-footer-section">
            <div className="flex justify-end">
              <div className="text-center">
                <div className="border-b-2 border-gray-400 w-48 mb-2"></div>
                <p className="text-sm font-semibold">Signature</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t flex justify-between items-center text-sm text-gray-600 print-footer-section">
            <span className="inline-flex gap-2 items-center">
              <Phone className="size-4" />
              {data.company.phone}
            </span>
            <span className="inline-flex gap-2 items-center">
              <Mail className="size-4" />
              {data.company.email}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

DeliveryNoteTemplate.displayName
 = 'DeliveryNoteTemplate';