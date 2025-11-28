import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import mongoose from 'mongoose';
import type { Db } from 'mongodb';

export async function GET() {
  try {
    await dbConnect();
    const db = mongoose.connection.db as Db;
    const customersCollection = db.collection('customers');

    // Get existing indexes
    const indexes = await customersCollection.indexes();
    const emailIndexExists = indexes.some(index => index.key.email === 1);

    const results = {
      currentIndexes: indexes.map(idx => ({
        name: idx.name,
        key: idx.key,
        unique: idx.unique || false,
        sparse: idx.sparse || false
      })),
      emailIndexExists,
      needsFix: false
    };

    // Check if email index needs fixing (exists but not sparse)
    const emailIndex = indexes.find(index => index.key.email === 1);
    if (emailIndex && emailIndex.unique && !emailIndex.sparse) {
      results.needsFix = true;
    }

    if (emailIndexExists) {
      // Drop old email index
      try {
        await customersCollection.dropIndex('email_1');
      } catch (error: unknown) {
        const err = error as { code?: number };
        if (err.code !== 27) { // 27 = IndexNotFound
          throw error;
        }
      }

      // Create new sparse unique index
      await customersCollection.createIndex(
        { email: 1 },
        { 
          unique: true, 
          sparse: true,
          name: 'email_1'
        }
      );
    }

    // Get updated indexes
    const updatedIndexes = await customersCollection.indexes();

    return NextResponse.json({
      success: true,
      message: 'Email index fixed successfully',
      before: results.currentIndexes,
      after: updatedIndexes.map(idx => ({
        name: idx.name,
        key: idx.key,
        unique: idx.unique || false,
        sparse: idx.sparse || false
      })),
      fixed: results.needsFix
    });
  } catch (error) {
    console.error('Error fixing email index:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fix email index',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
