'use client';

import { useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { InShopRow } from '../types';

interface StockSummarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rows exactly as they are on screen (search / mismatch filters applied). */
  rows: InShopRow[];
  /** Total variants before any filtering, so the sheet can say "x of y". */
  totalRows: number;
  /** Human description of the filters that are applied, if any. */
  filterNote?: string;
}

function attributesOf(row: InShopRow): string {
  return Object.values(row.attributes ?? {}).filter(Boolean).join(' / ');
}

/**
 * Compact, admin-only stock summary. Prints (and saves as PDF) one dense A4
 * table and also offers a CSV of the same rows.
 */
export function StockSummarySheet({ open, onOpenChange, rows, totalRows, filterNote }: StockSummarySheetProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          available: acc.available + (row.available ?? 0),
          inShop: acc.inShop + (row.inShop ?? 0),
          toArrive: acc.toArrive + (row.toArrive ?? 0)
        }),
        { available: 0, inShop: 0, toArrive: 0 }
      ),
    [rows]
  );

  const generatedAt = useMemo(() => format(new Date(), 'dd MMM yyyy, h:mm a'), [open]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    preserveAfterPrint: true,
    documentTitle: `Stock-Summary-${format(new Date(), 'yyyy-MM-dd')}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 10mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print\\:hidden { display: none !important; }
        table { page-break-inside: auto; }
        tr { page-break-inside: avoid; }
        thead { display: table-header-group; }
      }
    `
  });

  const handleCsv = () => {
    if (rows.length === 0) {
      toast.error('Nothing to download');
      return;
    }
    const headers = ['#', 'Product', 'SKU', 'Attributes', 'Available', 'In shop', 'To arrive', 'Difference'];
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const body = rows.map((row, index) =>
      [
        index + 1,
        row.productName,
        row.sku,
        attributesOf(row),
        row.available,
        row.inShop,
        row.toArrive,
        row.inShop - row.available
      ]
        .map(escape)
        .join(',')
    );
    const csv = [headers.join(','), ...body].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-summary-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="pt-12 lg:pl-12">
          <SheetTitle className="text-lg font-semibold text-primary inline-flex items-center gap-2">
            <Printer /> Stock summary
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap justify-end gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handleCsv} disabled={rows.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Download CSV
          </Button>
          <Button size="sm" onClick={handlePrint} disabled={rows.length === 0}>
            <Printer className="mr-2 h-4 w-4" /> Print / Save as PDF
          </Button>
        </div>

        {/* Printable summary — compact on purpose so it fits a handful of pages */}
        <div ref={printRef} className="mt-4 bg-white p-4 text-black">
          <div className="mb-3 border-b pb-2">
            <div className="flex items-baseline justify-between">
              <h1 className="text-base font-bold uppercase tracking-wide">Stock summary</h1>
              <div className="text-[11px] text-gray-600">Generated {generatedAt}</div>
            </div>
            <div className="text-[11px] text-gray-600">
              {rows.length} of {totalRows} variant(s)
              {filterNote ? ` — filtered: ${filterNote}` : ''}
            </div>
          </div>

          <table className="w-full border-collapse text-[11px] leading-tight">
            <thead>
              <tr className="border-b border-black text-[10px] uppercase tracking-wide">
                <th className="py-1 pr-1 text-left font-semibold">#</th>
                <th className="py-1 pr-1 text-left font-semibold">Product</th>
                <th className="py-1 pr-1 text-left font-semibold">SKU</th>
                <th className="py-1 pr-1 text-left font-semibold">Attributes</th>
                <th className="py-1 pr-1 text-right font-semibold">Avail.</th>
                <th className="py-1 pr-1 text-right font-semibold">In shop</th>
                <th className="py-1 pr-1 text-right font-semibold">To arrive</th>
                <th className="py-1 text-right font-semibold">Diff</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const diff = (row.inShop ?? 0) - (row.available ?? 0);
                return (
                  <tr key={`${row.productId}-${row.variantId}`} className="border-b border-gray-200">
                    <td className="py-0.5 pr-1 text-gray-500">{index + 1}</td>
                    <td className="max-w-[16rem] truncate py-0.5 pr-1 font-medium">{row.productName}</td>
                    <td className="py-0.5 pr-1 font-mono text-[10px]">{row.sku}</td>
                    <td className="max-w-[12rem] truncate py-0.5 pr-1 text-gray-600">{attributesOf(row)}</td>
                    <td className="py-0.5 pr-1 text-right">{row.available}</td>
                    <td className="py-0.5 pr-1 text-right font-semibold">{row.inShop}</td>
                    <td className="py-0.5 pr-1 text-right">{row.toArrive}</td>
                    <td className={`py-0.5 text-right ${diff !== 0 ? 'font-bold' : 'text-gray-400'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-gray-500">
                    No stock matches the current filters.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black text-[11px] font-bold">
                <td colSpan={4} className="py-1 pr-1 text-right uppercase">
                  Total ({rows.length})
                </td>
                <td className="py-1 pr-1 text-right">{totals.available}</td>
                <td className="py-1 pr-1 text-right">{totals.inShop}</td>
                <td className="py-1 pr-1 text-right">{totals.toArrive}</td>
                <td className="py-1 text-right">{totals.inShop - totals.available}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-3 flex justify-between text-[10px] text-gray-500">
            <span>Avail. = units still purchasable · In shop = physical units · To arrive = on order</span>
            <span>Signature: ________________</span>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
