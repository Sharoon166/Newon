'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
      <span className="sr-only">
        {count} {srLabel}
      </span>
    </>
  );
}

const TAB_VALUES = ['in-shop', 'awaiting-arrival', 'awaiting-delivery', 'history'] as const;

export function StockView({ initialized, startedAt, counts: initialCounts, userRole }: StockViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Deep links: /stock?tab=history&q=INV-0042 lands straight on the matching tab
  // with the search pre-filled (used by the invoice/purchase pages).
  //
  // Applied in an effect rather than in useState initializers: useSearchParams()
  // can be empty (or still holding the previous route) on the very first render -
  // during hydration / prerender / a navigation that hasn't committed yet - and an
  // initializer would freeze that empty value forever. The URL itself is already
  // committed by then, so it is the reliable source.
  const [activeTab, setActiveTab] = useState('in-shop');
  const [initialSearch, setInitialSearch] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [isChangingDate, setIsChangingDate] = useState(false);
  const [counts, setCounts] = useState<StockWorkCounts | undefined>(initialCounts);

  // Hand each ?q= to the tabs only once: searchParams gets a fresh identity on
  // every router refresh, and re-applying it would stomp a query the user has
  // since typed themselves.
  const appliedQueryRef = useRef<string | null>(null);

  useEffect(() => {
    const fromWindow =
      typeof window !== 'undefined' && window.location.search
        ? new URLSearchParams(window.location.search)
        : null;
    const params = fromWindow ?? searchParams;

    const requestedTab = params.get('tab');
    if (requestedTab && (TAB_VALUES as readonly string[]).includes(requestedTab)) {
      setActiveTab(requestedTab);
    }

    const requestedQuery = params.get('q');
    if (requestedQuery && appliedQueryRef.current !== requestedQuery) {
      appliedQueryRef.current = requestedQuery;
      setInitialSearch(requestedQuery);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // The deep-link search belongs to the tab it was aimed at - don't re-apply
    // it every time the user comes back to that tab.
    setInitialSearch('');
    // Keep the URL shareable; drop `q` since the tab has now consumed it.
    const params = new URLSearchParams(window.location.search || searchParams.toString());
    params.set('tab', value);
    params.delete('q');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
          <TabsList className='overflow-x-auto overflow-y-hidden'>
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
            <AwaitingArrivalTab enabled={enabled} initialSearch={initialSearch} onChanged={handleChanged} />
          </TabsContent>
          <TabsContent value="awaiting-delivery" className="mt-4 focus-visible:outline-none">
            <AwaitingDeliveryTab enabled={enabled} initialSearch={initialSearch} onChanged={handleChanged} />
          </TabsContent>
          <TabsContent value="history" className="mt-4 focus-visible:outline-none">
            <HistoryTab enabled={enabled} userRole={userRole} initialSearch={initialSearch} onChanged={handleChanged} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
