import { forwardRef } from 'react';
import Image from 'next/image';
import { COMPANY_DETAILS } from '@/constants';
import { convertToWords } from '@/features/invoices/utils';
import { brands } from '@/stores/useBrandStore';
import { formatDate } from '@/lib/utils';

export interface ChallanLine {
  description: string;
  /** Secondary line under the description (variant SKU / component breakdown). */
  note?: string;
  quantity: number;
  /** Invoice unit price for this line, when the slip links to an invoice item. */
  rate?: number;
}

interface StockChallanFormData {
  challanNumber: string;
  date: string;
  invoiceNumber?: string;
  /** Heading override - stock in / stock out / adjustment / starting count. */
  title?: string;
  /** Second document field ("Purchase No." / "Inv. No." / "Entries"). */
  reference?: { label: string; value: string };
  market: 'newon' | 'waymor';
  client: {
    name: string;
    company?: string;
    address?: string;
    phone?: string;
  };
  lines: ChallanLine[];
  /** Sum under the quantity column, for challans without rates. */
  totalQuantity?: number;
  /** Hide the address / mobile rows (stock in has no party contact block). */
  showContact?: boolean;
  /** Printed under the goods grid (starting counts / quick counts). */
  note?: string;
  /** Terms printed under the signature block (defaults to the delivery ones). */
  terms?: string[];
  company: typeof COMPANY_DETAILS;
}

interface StockChallanTemplateProps {
  data: StockChallanFormData;
}

const formatAmount = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Form-style stock out challan (the classic bordered form: header, party details,
 * S.N / Description / Quantity / Rate / Amount grid, amount in words, signature).
 * Rates come from the linked invoice, so lines without a matching invoice item
 * simply show "—".
 */
export const StockChallanTemplate = forwardRef<HTMLDivElement, StockChallanTemplateProps>(({ data }, ref) => {
  const brand = brands.find(b => b.id === data.market) || brands[0];

  const amountFor = (line: ChallanLine) => (line.rate !== undefined ? line.rate * line.quantity : undefined);
  const amounts = data.lines.map(amountFor);
  const hasAmounts = amounts.some(value => value !== undefined);
  const totalAmount = amounts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  // Defaults keep the invoice stock out challan looking exactly as before.
  const heading = data.title ?? 'STOCK OUT CHALLAN';
  const showContact = data.showContact !== false;
  const reference = data.reference ?? (data.invoiceNumber ? { label: 'Inv. No.', value: data.invoiceNumber } : null);
  const terms = data.terms ?? ["1. Goods once delivered are subject to the company's standard terms of sale."];
  const fillerRows = Math.max(0, 8 - data.lines.length);

  return (
    <div ref={ref} className="bg-white max-w-4xl mx-auto text-black">
      <div className="border-2 border-black">
        {/* COMPANY HEADER */}
        <div className="flex items-start gap-4 border-b-2 border-black p-3">
          <div className="shrink-0 p-1">
            {brand?.logo ? (
              <Image
                src={brand.logo}
                unoptimized
                alt="Company Logo"
                width={96}
                height={96}
                className="h-20 w-20 object-contain"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center px-1 text-center text-xs font-bold">
                {data.company.name}
              </div>
            )}
          </div>

          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold uppercase">{brand?.displayName || data.company.name}</h1>
            <p className="text-xs">{data.company.address}</p>
            <p className="text-xs">
              {data.company.city}, {data.company.state} {data.company.zip}
            </p>
            <p className="text-xs">
              Mob: {data.company.phone} | Email: {data.company.email}
            </p>
            {brand?.description && <p className="mt-1 text-[10px] italic">{brand.description}</p>}
            {(brand?.ntnNo || brand?.strnNo) && (
              <p className="mt-1 text-[11px]">
                {brand?.ntnNo && <span>NTN: {brand.ntnNo}</span>}
                {brand?.ntnNo && brand?.strnNo && <span className="mx-2">|</span>}
                {brand?.strnNo && <span>STRN: {brand.strnNo}</span>}
              </p>
            )}
          </div>

          <div className="w-24 shrink-0" aria-hidden />
        </div>

        {/* TITLE */}
        <div className="border-b-2 border-black py-2 text-center">
          <h2 className="text-lg font-bold tracking-wide">{heading}</h2>
        </div>

        {/* PARTY / DOCUMENT DETAILS */}
        <div className="space-y-2 border-b-2 border-black p-4 text-sm">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <p className="flex items-end gap-2">
              <span className="font-semibold">Sr.</span>
              <span className="min-w-40 border-b border-dotted border-black pb-0.5">{data.challanNumber}</span>
            </p>
            <p className="flex items-end gap-2">
              <span className="font-semibold">Date:</span>
              <span className="min-w-32 border-b border-dotted border-black pb-0.5">{formatDate(data.date)}</span>
            </p>
            {reference && (
              <p className="flex items-end gap-2">
                <span className="font-semibold">{reference.label}:</span>
                <span className="min-w-32 border-b border-dotted border-black pb-0.5">{reference.value}</span>
              </p>
            )}
          </div>

          <p className="flex items-end gap-2">
            <span className="font-semibold">M/s:</span>
            <span className="min-w-72 border-b border-dotted border-black pb-0.5">
              {[data.client.company, data.client.name].filter(Boolean).join(' — ')}
            </span>
          </p>

          {showContact && (
            <>
              <p className="flex items-end gap-2">
                <span className="font-semibold">Add:</span>
                <span className="min-w-72 border-b border-dotted border-black pb-0.5">{data.client.address || '—'}</span>
              </p>

              <p className="flex items-end gap-2">
                <span className="font-semibold">Mob. No.:</span>
                <span className="min-w-56 border-b border-dotted border-black pb-0.5">{data.client.phone || '—'}</span>
              </p>
            </>
          )}
        </div>

        {/* GOODS GRID */}
        <div className="border-b-2 border-black">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black bg-gray-50">
                <th className="w-12 border-r border-black px-2 py-2 text-left font-semibold">S.N</th>
                <th className="border-r border-black px-2 py-2 text-left font-semibold">Description of Goods</th>
                <th className="w-24 border-r border-black px-2 py-2 text-right font-semibold">Quantity</th>
                <th className="w-28 border-r border-black px-2 py-2 text-right font-semibold">Rate</th>
                <th className="w-32 px-2 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((line, index) => {
                const amount = amountFor(line);
                return (
                  <tr key={index} className="border-b border-black align-top">
                    <td className="border-r border-black px-2 py-2">{index + 1}</td>
                    <td className="border-r border-black px-2 py-2">
                      <p>{line.description}</p>
                      {line.note && <p className="mt-0.5 text-xs text-gray-600">{line.note}</p>}
                    </td>
                    <td className="border-r border-black px-2 py-2 text-right">{line.quantity}</td>
                    <td className="border-r border-black px-2 py-2 text-right">
                      {line.rate !== undefined ? formatAmount(line.rate) : '—'}
                    </td>
                    <td className="px-2 py-2 text-right">{amount !== undefined ? formatAmount(amount) : '—'}</td>
                  </tr>
                );
              })}

              {/* Empty rows so the form looks like a proper challan pad */}
              {Array.from({ length: fillerRows }).map((_, index) => (
                <tr key={`empty-${index}`} className="border-b border-black">
                  <td className="h-9 border-r border-black px-2 py-2">{data.lines.length + index + 1}</td>
                  <td className="border-r border-black px-2 py-2"></td>
                  <td className="border-r border-black px-2 py-2"></td>
                  <td className="border-r border-black px-2 py-2"></td>
                  <td className="px-2 py-2"></td>
                </tr>
              ))}

              <tr className="bg-gray-50">
                <td className="border-r border-black px-2 py-2" colSpan={2}></td>
                <td className="border-r border-black px-2 py-2 text-right font-semibold">
                  {data.totalQuantity ?? ''}
                </td>
                <td className="border-r border-black px-2 py-2 text-right font-semibold">Total</td>
                <td className="px-2 py-2 text-right font-semibold">{hasAmounts ? formatAmount(totalAmount) : '—'}</td>
              </tr>
            </tbody>
          </table>
          {data.note ? (
            <div className="border-t border-black px-4 py-2 text-sm">
              <span className="font-semibold">Note:</span> {data.note}
            </div>
          ) : null}
        </div>

        {/* AMOUNT IN WORDS */}
        <div className="border-b border-black px-4 py-2 text-sm">
          <span className="font-semibold">Amount in words:</span>{' '}
          {hasAmounts ? `Rupees ${convertToWords(Math.round(totalAmount))} Only` : ''}
        </div>

        {/* TERMS + SIGNATURE */}
        <div className="flex items-end justify-between gap-8 p-4 text-sm">
          <div className="max-w-xs">
            <p className="mb-1 font-semibold">Terms &amp; Condition</p>
            {terms.map((term, index) => (
              <p key={index} className="text-xs text-gray-700">
                {term}
              </p>
            ))}
          </div>
          <div className="w-56 text-center">
            <div className="mb-1 border-b border-black">&nbsp;</div>
            <p className="text-xs">Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
});

StockChallanTemplate.displayName = 'StockChallanTemplate';
