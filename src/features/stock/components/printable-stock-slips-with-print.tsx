'use client';

import { useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { CalendarIcon, Printer, RotateCcw, Search, X } from 'lucide-react';
import { StockSlips } from './stock-slips';
import type { StockMovement, StockMovementKind } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { PageHeader } from '@/components/general/page-header';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

const KIND_LABELS: Record<StockMovementKind | 'all', string> = {
  all: 'All movements',
  receive: 'Received',
  deliver: 'Delivered',
  adjustment: 'Quick counts',
  opening: 'Starting counts',
  reversal: 'Reversals'
};

type SortOrder = 'desc' | 'asc';

interface PrintableStockSlipsWithPrintProps {
  movements: StockMovement[];
  /** Shown in the printed summary header. */
  printedBy?: string;
  /** Seeds the search box (e.g. ?search= on the URL). */
  initialSearch?: string;
  /** Seeds the type filter (e.g. ?kind= on the URL). */
  initialKind?: StockMovementKind | 'all';
}

export function PrintableStockSlipsWithPrint({
  movements,
  printedBy,
  initialSearch,
  initialKind = 'all'
}: PrintableStockSlipsWithPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // --- Filters -------------------------------------------------------------
  const [search, setSearch] = useState(initialSearch ?? '');
  const [kind, setKind] = useState<StockMovementKind | 'all'>(initialKind);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // --- Selection -----------------------------------------------------------
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const hasFilters = Boolean(search.trim() || kind !== 'all' || dateRange?.from);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // A range with only `from` set means that single day.
    const fromTime = dateRange?.from ? new Date(dateRange.from).setHours(0, 0, 0, 0) : null;
    const toTime = dateRange?.from
      ? new Date(dateRange.to ?? dateRange.from).setHours(23, 59, 59, 999)
      : null;

    const rows = movements.filter(m => {
      if (kind !== 'all' && m.kind !== kind) return false;
      const t = new Date(m.createdAt).getTime();
      if (fromTime !== null && t < fromTime) return false;
      if (toTime !== null && t > toTime) return false;
      if (q) {
        const haystack = [m.movementId, m.productName, m.sku, m.purchaseNumber, m.invoiceNumber, m.userName, m.note]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    rows.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === 'asc' ? diff : -diff;
    });
    return rows;
  }, [movements, search, kind, dateRange, sortOrder]);

  // An explicit selection wins; otherwise print everything that matches the filters.
  const printItems = useMemo(
    () => (selected.size > 0 ? movements.filter(m => selected.has(m.id)) : filtered),
    [selected, movements, filtered]
  );

  const selectedCount = selected.size;
  const allFilteredSelected = filtered.length > 0 && filtered.every(m => selected.has(m.id));
  const someFilteredSelected = filtered.some(m => selected.has(m.id));

  const toggleOne = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSelectAll = (checked: boolean | 'indeterminate') =>
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) filtered.forEach(m => next.add(m.id));
      else filtered.forEach(m => next.delete(m.id));
      return next;
    });

  const resetView = () => {
    setSearch('');
    setKind('all');
    setDateRange(undefined);
    setSelected(new Set());
  };

  // --- Printed summary -----------------------------------------------------
  const kindCounts = useMemo(() => {
    const counts = new Map<StockMovementKind, number>();
    printItems.forEach(m => counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1));
    return counts;
  }, [printItems]);

  const filterSummary = [
    KIND_LABELS[kind],
    search.trim() ? `matching “${search.trim()}”` : null,
    dateRange?.from
      ? dateRange.to
        ? `between ${format(dateRange.from, 'dd MMM yyyy')} – ${format(dateRange.to, 'dd MMM yyyy')}`
        : `on ${format(dateRange.from, 'dd MMM yyyy')}`
      : null,
    sortOrder === 'asc' ? 'oldest first' : 'newest first'
  ]
    .filter(Boolean)
    .join(' · ');

  // --- Printing ------------------------------------------------------------
  const pageStyle = `
    @page {
      size: A4;
      margin: 1cm;
    }
    @media print {
      * {
        box-sizing: border-box;
      }
      html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
      }
    }
  `;

  const handlePrint = useReactToPrint({
    documentTitle: 'Stock slips',
    contentRef: printRef,
    pageStyle
  });

  return (
    <div className="py-4 print:py-0 print:m-0 print:p-0">
      <div className="print:hidden mb-6 space-y-4">
        <PageHeader
          title="Stock slips"
          description="Print physical slips for stock movements — filter, select the ones you need, then print or save as PDF."
        />

        {/* Filter + print toolbar */}
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search slip, product, SKU, person..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8"
                aria-label="Search slips"
              />
            </div>

            <Select value={kind} onValueChange={v => setKind(v as StockMovementKind | 'all')}>
              <SelectTrigger className="w-40" aria-label="Movement type">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KIND_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-[280px] justify-start text-left font-normal', !dateRange?.from && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                      </>
                    ) : (
                      format(dateRange.from, 'LLL dd, y')
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {dateRange?.from && (
              <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)} aria-label="Clear date range">
                <X className="mr-1 h-3.5 w-3.5" />
                Clear dates
              </Button>
            )}

            <Select value={sortOrder} onValueChange={v => setSortOrder(v as SortOrder)}>
              <SelectTrigger className="w-40" aria-label="Sort order">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Newest first</SelectItem>
                <SelectItem value="asc">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                  onCheckedChange={handleSelectAll}
                  disabled={filtered.length === 0}
                  aria-label="Select all slips matching the filters"
                />
                Select all
              </label>
              <span className="text-sm text-muted-foreground">
                {selectedCount > 0
                  ? `${selectedCount} of ${movements.length} slip(s) selected`
                  : `${filtered.length} of ${movements.length} slip(s)`}
              </span>
              {selectedCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear selection
                </Button>
              )}
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={resetView}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />
                  Reset filters
                </Button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => handlePrint()} disabled={printItems.length === 0}>
                <Printer className="mr-2 h-4 w-4" />
                {selectedCount > 0 ? `Print selected (${printItems.length})` : `Print / Save PDF (${printItems.length})`}
              </Button>
            </div>
          </div>
        </div>

        {/* Selection explainer (screen only) */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-primary/50 bg-primary/5 px-3 py-2 text-sm">
            <span>
              Only the <span className="font-semibold">{selectedCount}</span> selected slip(s) will print — clear the
              selection to print everything matching the filters.
            </span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Printable area */}
      <div ref={printRef}>
        {/* Summary header - printed with the slips */}
        <div className="mb-4 rounded-lg border bg-white p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stock slips — summary
              </div>
              <div className="text-xs text-muted-foreground">{filterSummary}</div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>
                Printed by <span className="font-medium text-foreground">{printedBy || '—'}</span>
              </div>
              <div>{format(new Date(), 'dd MMM yyyy, h:mm a')}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
            {(Object.keys(KIND_LABELS) as Array<StockMovementKind | 'all'>)
              .filter(k => k !== 'all' && kindCounts.has(k as StockMovementKind))
              .map(k => (
                <span key={k}>
                  {KIND_LABELS[k]}: <span className="font-semibold text-foreground">{kindCounts.get(k as StockMovementKind)}</span>
                </span>
              ))}
            <span className="ml-auto font-semibold text-foreground">Total: {printItems.length}</span>
          </div>
        </div>

        {printItems.length > 0 ? (
          <StockSlips movements={printItems} selection={{ selected, onToggle: toggleOne }} />
        ) : (
          <div className="py-12 text-center text-muted-foreground print:hidden">
            <p className="font-medium">No slips match your filters.</p>
            <p className="mt-1 text-sm">Adjust the search, type or date range to find the movements you need.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={resetView}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Reset filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
