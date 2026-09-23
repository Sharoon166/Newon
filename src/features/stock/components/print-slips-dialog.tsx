'use client';

import { useCallback, useEffect, useState } from 'react';
import { Printer, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KIND_LABELS } from '../constants';
import { getStockMovements } from '../actions';
import { useDebounce } from '@/hooks/use-debounce';
import type { StockMovement, StockMovementKind } from '../types';
import { toast } from 'sonner';

interface PrintSlipsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CHECK_LIMIT = 200;

/**
 * Pick the exact slips you want to print (search by product/slip, filter by
 * kind), then print just those. Opens a new tab with /stock/print?ids=...
 * so only the selected slips end up on the print output.
 */
export function PrintSlipsDialog({ open, onOpenChange }: PrintSlipsDialogProps) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 350);
  const [kind, setKind] = useState<StockMovementKind | 'all'>('all');
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  const load = useCallback(async () => {
    if (!open) return;
    setIsLoading(true);
    try {
      const result = await getStockMovements({ page: 1, limit: CHECK_LIMIT, search: debouncedSearch || undefined, kind });
      setMovements(result.docs);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load movements');
    } finally {
      setIsLoading(false);
    }
  }, [open, debouncedSearch, kind]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset selection when filters change.
  useEffect(() => {
    setSelected(new Set());
  }, [debouncedSearch, kind]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisible = () => {
    setSelected(prev => {
      const next = new Set(prev);
      const allChecked = movements.length > 0 && movements.every(m => next.has(m.id));
      if (allChecked) {
        movements.forEach(m => next.delete(m.id));
      } else {
        movements.forEach(m => next.add(m.id));
      }
      return next;
    });
  };

  const handlePrint = () => {
    if (selected.size === 0) {
      toast.error('Select at least one slip to print.');
      return;
    }
    const ids = Array.from(selected);
    window.open(`/stock/print?ids=${ids.join(',')}`, '_blank');
  };

  const handlePrintAllFiltered = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (kind !== 'all') params.set('kind', kind);
    window.open(`/stock/print?${params.toString()}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Print slips</DialogTitle>
          <DialogDescription>
            Pick the specific slips to print — or choose “All filtered”. The slips open in a new tab ready to print.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search product, slip no…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={kind} onValueChange={value => setKind(value as StockMovementKind | 'all')}>
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Selection list */}
        <div className="max-h-80 overflow-y-auto rounded-md border">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : movements.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No movements match.</div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 border-b px-4 py-2.5 text-sm font-medium hover:bg-muted/40">
              <Checkbox checked={movements.length > 0 && movements.every(m => selected.has(m.id))} onCheckedChange={toggleVisible} />
              Select all visible
            </label>
          )}
          {movements.map(m => (
            <label key={m.id} className="flex cursor-pointer items-center gap-3 border-b px-4 py-2.5 hover:bg-muted/40">
              <Checkbox checked={selected.has(m.id)} onCheckedChange={() => toggle(m.id)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{m.movementId}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{KIND_LABELS[m.kind]}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.productName}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {m.quantity} × {m.sku}
                </div>
              </div>
            </label>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={handlePrintAllFiltered}>
            <Printer className="mr-1 h-4 w-4" />
            All filtered
          </Button>
          <Button onClick={handlePrint} disabled={selected.size === 0}>
            <Printer className="mr-1 h-4 w-4" />
            Print {selected.size > 0 ? `${selected.size} slip${selected.size === 1 ? '' : 's'}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
