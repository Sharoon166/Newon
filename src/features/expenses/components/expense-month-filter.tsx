'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MonthPicker } from '@/components/ui/monthpicker';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExpenseMonthFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>(() => {
    const from = searchParams.get('dateFrom');
    if (from) {
      return new Date(from);
    }
    return undefined;
  });

  const applyFilter = (): void => {
    if (!selectedMonth) return;

    const params = new URLSearchParams(searchParams.toString());
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    
    params.set('dateFrom', format(monthStart, 'yyyy-MM-dd'));
    params.set('dateTo', format(monthEnd, 'yyyy-MM-dd'));
    params.set('page', '1');
    
    router.push(`/expenses?${params.toString()}`);
  };

  const clearFilter = (): void => {
    setSelectedMonth(undefined);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('dateFrom');
    params.delete('dateTo');
    params.set('page', '1');
    router.push(`/expenses?${params.toString()}`);
  };

  const hasFilter = selectedMonth !== undefined;

  return (
    <div className="flex items-center gap-2">
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

      <Button onClick={applyFilter} disabled={!selectedMonth}>
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
