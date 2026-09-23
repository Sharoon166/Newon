'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from 'next/navigation';
import { SetupBanner } from './setup-banner';
import { InShopTab } from './in-shop-tab';
import { AwaitingArrivalTab } from './awaiting-arrival-tab';
import { AwaitingDeliveryTab } from './awaiting-delivery-tab';
import { HistoryTab } from './history-tab';

interface StockViewProps {
  initialized: boolean;
  startedAt?: string;
  userRole?: 'admin' | 'staff';
}

export function StockView({ initialized, startedAt, userRole }: StockViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('in-shop');
  const [enabled, setEnabled] = useState(true);
  const [isChangingDate, setIsChangingDate] = useState(false);

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
            <TabsTrigger value="awaiting-arrival">Awaiting arrival</TabsTrigger>
            <TabsTrigger value="awaiting-delivery">Awaiting delivery</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="in-shop" className=" focus-visible:outline-none">
            <InShopTab enabled={enabled} onChanged={handleChanged} />
          </TabsContent>
          <TabsContent value="awaiting-arrival" className="mt-4 focus-visible:outline-none">
            <AwaitingArrivalTab enabled={enabled} onChanged={handleChanged} />
          </TabsContent>
          <TabsContent value="awaiting-delivery" className="mt-4 focus-visible:outline-none">
            <AwaitingDeliveryTab enabled={enabled} onChanged={handleChanged} />
          </TabsContent>
          <TabsContent value="history" className="mt-4 focus-visible:outline-none">
            <HistoryTab enabled={enabled} userRole={userRole} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}