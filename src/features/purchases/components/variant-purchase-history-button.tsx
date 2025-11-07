'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { PurchasesTable } from './purchases-table';
import { Purchase } from '../types';
import { getPurchasesByVariantId } from '../actions';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface VariantPurchaseHistoryButtonProps {
  productId: string;
  variantId: string;
  variantSku?: string;
  variantAttributes?: Record<string, string>;
  productAttributes?: Array<{ id: string; name: string }>;
  locations?: Array<{ id: string; name: string; address?: string; isActive: boolean }>;
}

export function VariantPurchaseHistoryButton({
  productId,
  variantId,
  locations = []
}: VariantPurchaseHistoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  const loadPurchases = useCallback(async () => {
    if (!productId || !variantId) return;

    try {
      setLoading(true);
      const data = await getPurchasesByVariantId(productId, variantId);
      setPurchases(data as unknown as Purchase[]);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  }, [productId, variantId]);

  useEffect(() => {
    if (isOpen && productId && variantId) {
      loadPurchases();
    }
  }, [isOpen, productId, variantId, loadPurchases]);

  // Filter purchases by location
  const filteredPurchases = useMemo(() => {
    if (selectedLocation === 'all') return purchases;
    return purchases.filter(p => p.locationId === selectedLocation);
  }, [purchases, selectedLocation]);

  // Calculate summary stats for filtered purchases
  const totalPurchased = filteredPurchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = filteredPurchases.reduce((sum, p) => sum + p.totalCost, 0);
  const averageUnitPrice =
    filteredPurchases.length > 0
      ? filteredPurchases.reduce((sum, p) => sum + p.unitPrice, 0) / filteredPurchases.length
      : 0;

  // Calculate location-based statistics
  const locationStats = useMemo(() => {
    const stats = new Map<string, { quantity: number; cost: number; count: number }>();

    purchases.forEach(p => {
      const locationId = p.locationId || 'unassigned';
      const current = stats.get(locationId) || { quantity: 0, cost: 0, count: 0 };
      stats.set(locationId, {
        quantity: current.quantity + p.quantity,
        cost: current.cost + p.totalCost,
        count: current.count + 1
      });
    });

    return stats;
  }, [purchases]);

  return (
    <div className="space-y-4">
      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} className="w-full sm:w-auto">
        <History className="mr-2 h-4 w-4" />
        View Purchase History
        {isOpen ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
      </Button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {isOpen && (
          <div className="space-y-6 pt-4 border-t">
            {/* Location Filter */}
            {locations.length > 0 && (
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Filter by Location:</label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Purchased
                  {selectedLocation !== 'all' && ' (Filtered)'}
                </CardTitle>
                <CardContent className="p-0 text-2xl font-semibold mt-2">{totalPurchased.toLocaleString()}</CardContent>
              </Card>
              <Card className="p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Cost
                  {selectedLocation !== 'all' && ' (Filtered)'}
                </CardTitle>
                <CardContent className="p-0 text-2xl font-semibold mt-2">{formatCurrency(totalCost)}</CardContent>
              </Card>
              <Card className="p-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Unit Price
                  {selectedLocation !== 'all' && ' (Filtered)'}
                </CardTitle>
                <CardContent className="p-0 text-2xl font-semibold mt-2">
                  {formatCurrency(averageUnitPrice)}
                </CardContent>
              </Card>
            </div>

            {/* Location Breakdown - Only show when viewing all locations */}
            {selectedLocation === 'all' && locationStats.size > 0 && (
              <Card>
                <CardTitle className="text-base font-semibold p-4 pb-0">Purchases by Location</CardTitle>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {Array.from(locationStats.entries()).map(([locationId, stats]) => {
                      const location = locations.find(loc => loc.id === locationId);
                      const locationName = location?.name || (locationId === 'unassigned' ? 'Unassigned' : locationId);

                      return (
                        <div key={locationId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <div className="font-medium">{locationName}</div>
                            <div className="text-sm text-muted-foreground">
                              {stats.count} purchase{stats.count !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{stats.quantity.toLocaleString()} units</div>
                            <div className="text-sm text-muted-foreground">{formatCurrency(stats.cost)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Purchases Table */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading purchases...</div>
            ) : (
              <div className='border-2 border-red-500 w-full'>
                <PurchasesTable
                  purchases={filteredPurchases}
                  locations={locations}
                  onEdit={() => {
                    // Purchase editing should be done from the product edit page
                    // This section is read-only for viewing purchase history
                  }}
                  onRefresh={loadPurchases}
                  readOnly={true}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
