'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MonthPicker } from '@/components/ui/monthpicker';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CalendarIcon, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

type FilterMode = 'range' | 'month';

export function InvoiceFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [mode, setMode] = useState<FilterMode>('month');
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const from = searchParams.get('dateFrom');
    const to = searchParams.get('dateTo');
    
    if (from || to) {
      return {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined
      };
    }
    return undefined;
  });

  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(() => {
    const from = searchParams.get('dateFrom');
    if (from) {
      return new Date(from);
    }
    return undefined;
  });

  const applyFilter = (): void => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (mode === 'month' && selectedMonth) {
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      params.set('dateFrom', format(monthStart, 'yyyy-MM-dd'));
      params.set('dateTo', format(monthEnd, 'yyyy-MM-dd'));
    } else if (mode === 'range') {
      if (dateRange?.from) {
        params.set('dateFrom', format(dateRange.from, 'yyyy-MM-dd'));
      } else {
        params.delete('dateFrom');
      }
      
      if (dateRange?.to) {
        params.set('dateTo', format(dateRange.to, 'yyyy-MM-dd'));
      } else {
        params.delete('dateTo');
      }
    }
    
    router.push(`/invoices?${params.toString()}`, { scroll: false });
  };

  const clearFilter = (): void => {
    setDateRange(undefined);
    setSelectedMonth(undefined);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('dateFrom');
    params.delete('dateTo');
    router.push(`/invoices?${params.toString()}`, { scroll: false });
  };

  const hasFilter = mode === 'month' ? selectedMonth !== undefined : (dateRange?.from || dateRange?.to);
  const isApplyDisabled = mode === 'month' ? !selectedMonth : (!dateRange?.from && !dateRange?.to);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup type="single" value={mode} onValueChange={(value) => value && setMode(value as FilterMode)} className='*:grow max-md:w-full border'>
        <ToggleGroupItem value="month" aria-label="Month filter">
          Month
        </ToggleGroupItem>
        <ToggleGroupItem value="range" aria-label="Date range filter">
          Range
        </ToggleGroupItem>
      </ToggleGroup>

      {mode === 'month' ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal w-[200px]',
                !selectedMonth && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedMonth ? format(selectedMonth, 'MMMM yyyy') : 'Pick a month'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <MonthPicker
              selectedMonth={selectedMonth}
              onMonthSelect={setSelectedMonth}
            />
          </PopoverContent>
        </Popover>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal w-[200px] truncate',
                !dateRange && 'text-muted-foreground'
              )}
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
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      )}

      <Button onClick={applyFilter} disabled={isApplyDisabled}>
        Apply <Filter className='size-4' />
      </Button>

      {hasFilter && (
        <Button variant="destructive" size="icon" onClick={clearFilter}>
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
