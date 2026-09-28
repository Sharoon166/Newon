import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import StockMovementModel from '@/models/StockMovement';
import { RETURN_LABELS, type ReturnFlavor } from '@/features/stock/return-naming';

/**
 * One-off backfill for `returnKind`, the field that names a `kind: 'reversal'`
 * slip - purchase return (a receipt undone), sales return (a delivery undone)
 * or correction (a quick count undone). The name is written when a reversal is
 * created; this fills in the rows written before the field existed.
 *
 * It also rebuilds `searchText` with the tokens a new reversal gets, so
 * searching for "purchase return" finds the older rows too, and rewrites the
 * generated note ("Reversal of SM-…" -> "Sales return of SM-…").
 *
 * Default is a dry run - only `apply=1` writes anything.
 *   GET /api/setup/backfill-return-kind          -> report only
 *   GET /api/setup/backfill-return-kind?apply=1  -> apply
 */
export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const apply = searchParams.get('apply') === '1';

    const rows = await StockMovementModel.find({ kind: 'reversal' }).lean();
    const pending = rows.filter(row => !row.returnKind);
    const counts: Record<ReturnFlavor, number> = { purchase: 0, sales: 0, correction: 0 };
    const samples: Array<Record<string, unknown>> = [];

    for (const row of pending) {
      const returnKind: ReturnFlavor = row.purchaseId
        ? 'purchase'
        : row.invoiceId || (row.lines?.length ?? 0) > 0
          ? 'sales'
          : 'correction';
      counts[returnKind]++;

      if (apply) {
        const searchText = [
          row.productName,
          row.sku,
          row.movementId,
          RETURN_LABELS[returnKind].badge,
          'return'
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        // The generated note carries the old "Reversal of ..." wording.
        const note = row.note?.startsWith('Reversal of')
          ? `${RETURN_LABELS[returnKind].ofLabel}${row.note.slice('Reversal of'.length)}`
          : row.note;

        await StockMovementModel.updateOne({ _id: row._id }, { $set: { returnKind, searchText, note } });
      } else if (samples.length < 20) {
        samples.push({ movementId: row.movementId, returnKind, note: row.note });
      }
    }

    return NextResponse.json({
      success: true,
      applied: apply,
      reversals: rows.length,
      missingReturnKind: pending.length,
      alreadyNamed: rows.length - pending.length,
      counts,
      samples
    });
  } catch (error) {
    console.error('Error backfilling returnKind:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to backfill returnKind',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
