import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import type { Db } from 'mongodb';

async function syncCounter(db: Db) {
  const year = new Date().getFullYear();
  const shortYear = year.toString().slice(-2);
  const key = `pr-${year}`;

  // Find all existing purchaseIds for this year
  const purchases = await db
    .collection('purchases')
    .find({
      purchaseId: { $exists: true, $nin: [null, ''] },
    })
    .toArray();

  // Extract sequence numbers from purchaseIds like "PR-25-015"
  const sequenceNumbers = purchases
    .map((p) => {
      const match = p.purchaseId?.match(/^PR-(\d{2})-(\d+)$/);
      if (match && match[1] === shortYear) {
        return parseInt(match[2], 10);
      }
      return 0;
    })
    .filter((num) => num > 0);

  if (sequenceNumbers.length === 0) {
    return 0;
  }

  // Get the highest sequence number
  const maxSequence = Math.max(...sequenceNumbers);

  // Update counter to be at least this high
  const counter = await db.collection('counters').findOneAndUpdate(
    { key },
    { $max: { sequence: maxSequence } },
    { returnDocument: 'after', upsert: true }
  );

  return counter?.sequence ?? maxSequence;
}

async function generateId(db: Db, prefix: string) {
  const year = new Date().getFullYear();
  const shortYear = year.toString().slice(-2);
  const key = `${prefix.toLowerCase()}-${year}`;

  const counter = await db.collection('counters').findOneAndUpdate(
    { key },
    { $inc: { sequence: 1 } },
    { returnDocument: 'after', upsert: true }
  );

  const sequence = counter?.sequence ?? 1;
  const paddedSequence = sequence.toString().padStart(3, '0');
  return `${prefix}-${shortYear}-${paddedSequence}`;
}

export async function GET() {
  try {
    await dbConnect();
    const db = mongoose.connection.db as Db;

    // Step 1: Sync counter with existing IDs
    const syncedSequence = await syncCounter(db);

    // Step 2: Find purchases without IDs
    const purchasesWithoutId = await db
      .collection('purchases')
      .find({
        $or: [
          { purchaseId: { $exists: false } },
          { purchaseId: null },
          { purchaseId: '' },
        ],
      })
      .toArray();

    if (purchasesWithoutId.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No purchases need migration',
        syncedSequence,
        updated: 0,
        total: 0,
      });
    }

    // Step 3: Generate IDs
    let updated = 0;
    const errors = [];

    for (const purchase of purchasesWithoutId) {
      try {
        const purchaseId = await generateId(db, 'PR');
        await db
          .collection('purchases')
          .updateOne({ _id: purchase._id }, { $set: { purchaseId } });
        updated++;
      } catch (error) {
        errors.push({
          purchaseId: purchase._id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated purchaseId for ${updated} purchases`,
      syncedSequence,
      total: purchasesWithoutId.length,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error migrating purchase IDs:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to migrate purchase IDs',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
