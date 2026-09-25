import type { StockMovement } from '../types';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

const KIND_NAME: Record<StockMovement['kind'], string> = {
  receive: 'Stock received',
  deliver: 'Stock delivered',
  adjustment: 'Quick count',
  opening: 'Starting count',
  reversal: 'Reversal'
};

interface StockSlipsProps {
  movements: StockMovement[];
  /** When provided, each slip gets a screen-only (print:hidden) select checkbox. */
  selection?: {
    selected: Set<string>;
    onToggle: (id: string) => void;
  };
}

function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
}

/** "194 → 191" for a line, or null when it was never recorded (old slips). */
function inShopPair(before?: number, after?: number): string | null {
  if (before === undefined || after === undefined) return null;
  if (before === 0 && after === 0) return null;
  return `${formatQty(before)} → ${formatQty(after)}`;
}

export function StockSlips({ movements, selection }: StockSlipsProps) {
  if (movements.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="font-medium">No stock movements yet.</p>
        <p className="text-sm mt-1">Receive, deliver or quick-count items to create slips.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {movements.map(movement => {
        const lines = movement.lines ?? [];
        const isMultiLine = lines.length > 1;
        const totalUnits = lines.reduce((sum, line) => sum + (line.quantity ?? 0), 0);

        return (
        <div
          key={movement.id}
          className="rounded-lg border bg-white p-5 shadow-sm space-y-3 break-inside-avoid"
        >
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
            <div className="flex items-start gap-2">
              {selection && (
                <Checkbox
                  checked={selection.selected.has(movement.id)}
                  onCheckedChange={() => selection.onToggle(movement.id)}
                  className="mt-0.5 print:hidden"
                  aria-label={`Select slip ${movement.movementId}`}
                />
              )}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock slip</div>
                <div className="font-mono text-sm font-bold text-primary">{movement.movementId}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{KIND_NAME[movement.kind]}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(movement.createdAt), 'dd MMM yyyy, h:mm a')}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">{isMultiLine ? 'Products' : 'Product'}</div>
              {isMultiLine ? (
                <>
                  <div className="font-medium">{lines.length} products</div>
                  <div className="text-xs text-muted-foreground">
                    {formatQty(totalUnits)} units in total — see breakdown below
                  </div>
                </>
              ) : (
                <>
                  <div className="font-medium">{movement.productName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{movement.sku}</div>
                </>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{isMultiLine ? 'Total units' : 'Quantity'}</div>
              <div className="font-semibold">
                {movement.kind === 'adjustment' && movement.quantity >= 0 ? '+' : ''}
                {formatQty(movement.quantity)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">In shop</div>
              <div className="font-medium">
                {movement.inShopBefore || movement.inShopAfter
                  ? `${formatQty(movement.inShopBefore)} → ${formatQty(movement.inShopAfter)}`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Reference</div>
              <div className="font-medium">
                {movement.purchaseNumber ?? movement.invoiceNumber ?? '—'}
                {movement.reversalOf ? ` (reversal of ${movement.reversalOf})` : ''}
              </div>
              {movement.customerName ? (
                <div className="text-xs text-muted-foreground">{movement.customerName}</div>
              ) : null}
            </div>
          </div>

          {/* Line-item breakdown (deliveries / reversals) */}
          {movement.lines && movement.lines.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {movement.lines.length} {movement.lines.length === 1 ? 'line item' : 'line items'}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-1 font-medium">Item</th>
                    <th className="pb-1 font-medium">SKU</th>
                    <th className="pb-1 text-right font-medium">Qty</th>
                    <th className="pb-1 text-right font-medium">In shop</th>
                  </tr>
                </thead>
                <tbody>
                  {movement.lines.map((line, i) => (
                    <tr key={i}>
                      <td className="py-0.5 pr-3">
                        {line.productName}
                        {line.components?.length ? (
                          <div className="text-xs text-muted-foreground">
                            ={' '}
                            {line.components
                              .map(component => {
                                const pair = inShopPair(component.inShopBefore, component.inShopAfter);
                                return `${component.quantity} × ${component.productName}${pair ? ` (${pair})` : ''}`;
                              })
                              .join(', ')}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-0.5 pr-3 font-mono text-xs text-muted-foreground">{line.sku || '—'}</td>
                      <td className="py-0.5 pr-3 text-right font-medium">{formatQty(line.quantity)}</td>
                      <td className="py-0.5 text-right font-medium">
                        {inShopPair(line.inShopBefore, line.inShopAfter) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
            <div>{movement.note || '—'}</div>
            <div className="flex flex-wrap items-center gap-4">
              <span>By: {movement.userName || '—'}</span>
              <span>Signature: ________________</span>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}
