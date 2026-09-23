'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck, Search, Warehouse } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { getInShopRows } from '../actions';
import type { InShopRow } from '../types';
import { QuickCountDialog, type QuickCountTarget } from './quick-count-dialog';
import { toast } from 'sonner';

interface InShopTabProps {
  enabled: boolean;
  onChanged?: () => void;
}

export function InShopTab({ enabled, onChanged }: InShopTabProps) {
  const [rows, setRows] = useState<InShopRow[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 400);
  const [isLoading, setIsLoading] = useState(true);
  const [target, setTarget] = useState<QuickCountTarget | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getInShopRows(debouncedSearch || undefined);
      setRows(data);
    } catch (error) {
      console.error('Failed to load stock snapshot:', error);
      toast.error('Failed to load stock');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const handleQuickCount = (row: InShopRow) => {
    setTarget({
      productId: row.productId,
      variantId: row.variantId,
      productName: row.productName,
      sku: row.sku,
      currentInShop: row.inShop,
      available: row.available
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search product or SKU..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-8"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          <Warehouse className="mr-1 inline h-4 w-4" />
          <span className="font-medium">{rows.length}</span> variants
        </p>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-center">Available</TableHead>
              <TableHead className="text-center">In shop</TableHead>
              <TableHead className="text-center">To arrive</TableHead>
              <TableHead className="text-right">Quick count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No products match.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => {
                const diff = row.inShop - row.available;
                return (
                  <TableRow key={`${row.productId}-${row.variantId}`} className={row.disabled ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="font-medium">{row.productName}</div>
                      {Object.keys(row.attributes).length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {Object.values(row.attributes).join(' / ')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono whitespace-nowrap">
                        {row.sku}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{row.available}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          diff > 0
                            ? 'font-semibold text-green-700'
                            : diff < 0
                              ? 'font-semibold text-amber-600'
                              : 'font-medium'
                        }
                      >
                        {row.inShop}
                      </span>
                      {diff !== 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({diff > 0 ? '+' : ''}
                          {diff})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.toArrive > 0 ? (
                        <span className="font-medium text-primary">{row.toArrive}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleQuickCount(row)}>
                        <ClipboardCheck className="mr-1 h-3.5 w-3.5" />
                        Count
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <QuickCountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        target={target}
        onSuccess={() => {
          load();
          onChanged?.();
        }}
      />
    </div>
  );
}