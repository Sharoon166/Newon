'use client';

import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { getStockWorkCounts } from '../actions';
import type { StockWorkCounts } from '../types';
import { SetupBanner } from './setup-banner';
import { InShopTab } from './in-shop-tab';
import { AwaitingArrivalTab } from './awaiting-arrival-tab';
import { AwaitingDeliveryTab } from './awaiting-delivery-tab';
import { HistoryTab } from './history-tab';

interface StockViewProps {
  initialized: boolean;
  startedAt?: string;
  counts?: StockWorkCounts;
  userRole?: 'admin' | 'staff';
}

/**
 * Badge on a tab trigger. Hidden when the count is 0. The visual number is
 * aria-hidden and replaced by a verbose sr-only sentence so screen readers
 * announce "7 purchases awaiting arrival", not a bare "7".
 */
function CountBadge({ count, srLabel }: { count?: number; srLabel: string }) {
  if (!count) return null;
  return (
    <>
      <Badge variant="secondary" className="ml-2 h-5 min-w-5 justify-center px-1.5 tabular-nums" aria-hidden>
        {count}
      </Badge>
      <span className="sr-only">{count} {srLabel}</span>
    </>
  );
}

export function StockView({ initialized, startedAt, counts: initialCounts, userRole }: StockViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('in-shop');
  const [enabled, setEnabled] = useState(true);
  const [isChangingDate, setIsChangingDate] = useState(false);
  const [counts, setCounts] = useState<StockWorkCounts | undefined>(initialCounts);

  // Server refreshes (router.refresh after an action) hand us fresh counts.
  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  // Keep badges honest when the user comes back to this tab/window - cheap
  // event-driven refetch, no polling interval.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      getStockWorkCounts()
        .then(setCounts)
        .catch(() => {
          // Badges are a hint - never surface a failure for a background refresh.
        });
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  // Force remount of tab content (fresh fetch) after setup completes.
  const handleSetupDone = () => {
    setEnabled(false);
    router.refresh();
    setTimeout(() => setEnabled(true), 50);
  };

  const handleChanged = () => {
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {!initialized && <SetupBanner mode="setup" userRole={userRole} onDone={handleSetupDone} />}

      {initialized && isChangingDate && (
        <SetupBanner
          mode="change"
          userRole={userRole}
          startedAt={startedAt}
          onDone={() => {
            setIsChangingDate(false);
            handleSetupDone();
          }}
          onCancel={() => setIsChangingDate(false)}
        />
      )}

      {initialized && userRole === 'admin' && !isChangingDate && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setIsChangingDate(true)}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Change start date
          </Button>
        </div>
      )}

      {!initialized && userRole !== 'admin' ? (
        <p className="text-sm text-muted-foreground">
          Once set up, this page shows In shop counts, awaiting arrival, awaiting delivery and history.
        </p>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="in-shop">In shop</TabsTrigger>
            <TabsTrigger value="awaiting-arrival">
              Awaiting arrival
              <CountBadge count={counts?.arrival} srLabel="purchases awaiting arrival" />
            </TabsTrigger>
            <TabsTrigger value="awaiting-delivery">
              Awaiting delivery
              <CountBadge count={counts?.delivery} srLabel="invoices with items to deliver" />
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="in-shop" className="mt-4 focus-visible:outline-none">
            <InShopTab enabled={enabled} onChanged={handleChanged} />
          </TabsContent>
          <TabsContent value="awaiting-arrival" className="mt-4 focus-visible:outline-none">
            <AwaitingArrivalTab enabled={enabled} onChanged={handleChanged} />
          </TabsContent>
          <TabsContent value="awaiting-delivery" className="mt-4 focus-visible:outline-none">
            <AwaitingDeliveryTab enabled={enabled} onChanged={handleChanged} />
          </TabsContent>
          <TabsContent value="history" className="mt-4 focus-visible:outline-none">
            <HistoryTab enabled={enabled} userRole={userRole} onChanged={handleChanged} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
