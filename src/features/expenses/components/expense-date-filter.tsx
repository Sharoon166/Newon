'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

export function ExpenseDateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [date, setDate] = useState<DateRange | undefined>(() => {
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

  const applyFilter = (): void => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (date?.from) {
      params.set('dateFrom', format(date.from, 'yyyy-MM-dd'));
    } else {
      params.delete('dateFrom');
    }
    
    if (date?.to) {
      params.set('dateTo', format(date.to, 'yyyy-MM-dd'));
    } else {
      params.delete('dateTo');
    }
    
    params.set('page', '1');
    router.push(`/expenses?${params.toString()}`);
  };

  const clearFilter = (): void => {
    setDate(undefined);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('dateFrom');
    params.delete('dateTo');
    params.set('page', '1');
    router.push(`/expenses?${params.toString()}`);
  };

  const hasFilter = date?.from || date?.to;

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn('justify-start text-left font-normal w-[280px]', !date && 'text-muted-foreground')}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
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
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      <Button onClick={applyFilter} disabled={!date?.from && !date?.to}>
        Apply
      </Button>

      {hasFilter && (
        <Button variant="ghost" size="icon" onClick={clearFilter}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
