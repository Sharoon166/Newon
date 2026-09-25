import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import PurchaseModel from '@/models/Purchase';
import StockMovementModel from '@/models/StockMovement';

/**
 * One-off repair for purchase rows damaged by the old edit logic:
 *
 * 1. `receivedQuantity > quantity`  -> renders impossible values like "100 / 10".
 *    Safe to clamp to `quantity`.
 * 2. `remaining` outside [0, quantity] -> impossible state, clamp into range.
 * 3. `remaining` inflated by the old "reduce proportionally" formula, e.g.
 *    50 bought / 40 remaining (10 used) edited down to 40 became 32 instead of
 *    30. Detected by comparing the implied used (quantity - remaining) against
 *    the units that actually left in recorded stock movements. Only repaired
 *    when `fixRemaining=1` is passed, since movement records can be incomplete
 *    for very old purchases.
 *
 * Default is a dry run - only `apply=1` writes anything.
 *   GET /api/setup/repair-purchases               -> report only
 *   GET /api/setup/repair-purchases?apply=1       -> apply the safe fixes
 *   GET /api/setup/repair-purchases?apply=1&fixRemaining=1
 *                                                 -> also repair remaining
 */
export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const apply = searchParams.get('apply') === '1';
    const fixRemaining = searchParams.get('fixRemaining') === '1';

    const purchases = await PurchaseModel.find({}).lean();

    // Units that actually left the shop per purchase (lower bound on "used" -
    // deductions made before stock tracking exists have no movement record).
    const usedAgg = await StockMovementModel.aggregate<{ _id: string; used: number }>([
      { $match: { kind: 'deliver', purchaseId: { $ne: null }, reversed: { $ne: true } } },
      { $group: { _id: '$purchaseId', used: { $sum: '$quantity' } } }
    ]);
    const usedByPurchase = new Map(usedAgg.map(row => [row._id, row.used]));

    const invalidReceived: Array<Record<string, unknown>> = [];
    const invalidRemaining: Array<Record<string, unknown>> = [];
    const suspects: Array<Record<string, unknown>> = [];
    let fixedReceived = 0;
    let fixedRemaining = 0;
    let repairedRemaining = 0;

    for (const purchase of purchases) {
      const quantity = purchase.quantity;
      const remaining = purchase.remaining;
      const id = purchase._id;
      const summary = {
        _id: String(id),
        purchaseId: purchase.purchaseId,
        quantity,
        remaining,
        receivedQuantity: purchase.receivedQuantity
      };

      const updates: Record<string, number> = {};
      let repairedThisRow = false;

      // 1. Received can never exceed the ordered quantity.
      if (purchase.receivedQuantity !== undefined && purchase.receivedQuantity !== null && purchase.receivedQuantity > quantity) {
        invalidReceived.push({ ...summary, clampedTo: quantity });
        updates.receivedQuantity = quantity;
      }

      // 2. Remaining must live within [0, quantity].
      if (remaining < 0 || remaining > quantity) {
        const clamped = Math.min(Math.max(remaining, 0), quantity);
        invalidRemaining.push({ ...summary, clampedTo: clamped });
        updates.remaining = clamped;
      }

      // 3. Remaining that disagrees with what actually left the shop.
      const movementUsed = usedByPurchase.get(purchase.purchaseId) ?? 0;
      const impliedUsed = quantity - remaining;
      if (movementUsed > impliedUsed) {
        const suggested = Math.max(0, quantity - movementUsed);
        suspects.push({
          ...summary,
          movementUsed,
          impliedUsed,
          suggestedRemaining: suggested
        });
        if (apply && fixRemaining) {
          updates.remaining = suggested;
          repairedThisRow = true;
        }
      }

      if (apply && Object.keys(updates).length > 0) {
        await PurchaseModel.updateOne({ _id: id }, { $set: updates });
        if (updates.receivedQuantity !== undefined) fixedReceived++;
        if (updates.remaining !== undefined) {
          if (repairedThisRow) repairedRemaining++;
          else fixedRemaining++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      applied: apply,
      fixRemaining: apply && fixRemaining,
      total: purchases.length,
      counts: {
        invalidReceived: invalidReceived.length,
        invalidRemaining: invalidRemaining.length,
        suspects: suspects.length
      },
      fixed: { received: fixedReceived, remaining: fixedRemaining, repairedRemaining },
      invalidReceived: invalidReceived.slice(0, 50),
      invalidRemaining: invalidRemaining.slice(0, 50),
      // Rows worth a human look - capped so the payload stays readable.
      suspects: suspects.slice(0, 100),
      suspectsCapped: suspects.length > 100
    });
  } catch (error) {
    console.error('Error repairing purchases:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to repair purchases',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
