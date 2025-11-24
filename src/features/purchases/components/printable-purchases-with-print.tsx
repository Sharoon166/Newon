'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PrintablePurchases } from './printable-purchases';
import { Purchase } from '../types';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/general/page-header';
import { Printer, CalendarIcon, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { getAllPurchases } from '../actions';
import { toast } from 'sonner';

interface PrintablePurchasesWithPrintProps {
  initialData: Purchase[];
}

export function PrintablePurchasesWithPrint({ initialData }: PrintablePurchasesWithPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [data, setData] = useState<Purchase[]>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Get unique suppliers from data
  const suppliers = useMemo(() => {
    const uniqueSuppliers = Array.from(new Set(data.map(p => p.supplier || 'Unknown Supplier'))).sort();
    return uniqueSuppliers;
  }, [data]);

  // Fetch filtered data when date range changes
  useEffect(() => {
    const fetchFilteredData = async () => {
      if (!dateRange?.from) {
        // If no date range, use initial data
        setData(initialData);
        return;
      }

      setIsLoading(true);
      try {
        const allPurchases = await getAllPurchases();
        
        // Filter by date range
        const filtered = allPurchases.filter(purchase => {
          const purchaseDate = new Date(purchase.purchaseDate);
          const from = new Date(dateRange.from!);
          from.setHours(0, 0, 0, 0);
          const to = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from!);
          to.setHours(23, 59, 59, 999);
                    
          return purchaseDate >= from && purchaseDate <= to;
        });
        
        setData(filtered);
      } catch (error) {
        console.error('Error fetching purchases:', error);
        toast.error('Failed to fetch filtered purchases');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFilteredData();
  }, [dateRange, initialData]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Purchase-History-${new Date().toISOString().split('T')[0]}`,
    pageStyle: `
      @page {
        size: A4 landscape;
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
    `,
  });

  return (
    <>
      <div className="print:hidden">
        <PageHeader icon={<Printer className='size-8' />} title="Print Purchase History Report" backLink="/purchases" />
        
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter by Supplier:</label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier} disabled={isLoading}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier} value={supplier}>
                    {supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Date Range:</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isLoading}
                  className={cn(
                    'w-[280px] justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
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
                    </>
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
            {dateRange && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDateRange(undefined)}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <Button className="fixed bottom-4 right-8" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" /> Print as PDF
        </Button>
      </div>

      <div ref={printRef} className="print:m-0 print:p-0 print:w-full print:max-w-full">
        <PrintablePurchases data={data} selectedSupplier={selectedSupplier} />
      </div>
    </>
  );
}
