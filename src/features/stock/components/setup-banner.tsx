'use client';

import { useState } from 'react';
import { CalendarClock, Lock, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { initializeStockTracking } from '../actions';
import { toast } from 'sonner';

interface SetupBannerProps {
  // 'setup' = first run, 'change' = re-declare the start date of a live baseline.
  mode?: 'setup' | 'change';
  userRole?: 'admin' | 'staff';
  // Current start date, used to pre-fill the picker in 'change' mode.
  startedAt?: string;
  onDone?: () => void;
  onCancel?: () => void;
}

export function SetupBanner({ mode = 'setup', userRole, startedAt, onDone, onCancel }: SetupBannerProps) {
  const [date, setDate] = useState<Date>(() => (startedAt ? new Date(startedAt) : new Date()));
  const [isStarting, setIsStarting] = useState(false);

  const isChange = mode === 'change';

  if (userRole !== 'admin') {
    return (
      <Alert className="mb-6">
        <Lock className="h-4 w-4" />
        <AlertTitle>Stock tracking not set up yet</AlertTitle>
        <AlertDescription>
          “In shop” counts aren’t running yet. Ask an admin to set the starting counts from the Stock page.
        </AlertDescription>
      </Alert>
    );
  }

  const handleStart = async () => {
    try {
      setIsStarting(true);
      await initializeStockTracking(date.toISOString());
      toast.success(
        isChange
          ? 'Start date updated — In shop counts recalculated. Previous starting counts were archived.'
          : 'Stock tracking started — In shop now equals Available on the start date.'
      );
      onDone?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set starting counts');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Alert className="mb-6">
      {isChange ? <CalendarClock className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
      <AlertTitle>{isChange ? 'Change the start date' : 'Set up “In shop” stock tracking'}</AlertTitle>
      <AlertDescription className="space-y-3">
        <div>
          {isChange
            ? 'Starting counts will be recalculated for the chosen date and the previous starting counts will be archived. Purchases, invoices and quick counts are kept as they are.'
            : 'On the start date, “In shop” will be set equal to the current Available numbers for every product. Existing purchases count as received and existing invoices as delivered. Afterwards you can correct any product with a quick count.'}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarClock className="mr-2 h-4 w-4" />
                {format(date, 'LLL dd, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} initialFocus />
            </PopoverContent>
          </Popover>
          <Button onClick={handleStart} disabled={isStarting}>
            {isStarting
              ? isChange
                ? 'Updating...'
                : 'Setting up...'
              : isChange
                ? 'Update starting counts'
                : 'Set starting counts'}
          </Button>
          {isChange && onCancel && (
            <Button variant="ghost" onClick={onCancel} disabled={isStarting}>
              Cancel
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
