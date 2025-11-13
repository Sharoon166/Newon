import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { PAYMENT_DETAILS, INVOICE_TERMS_AND_CONDITIONS } from '@/constants';

export async function POST() {
  try {
    await dbConnect();

    // Seed payment details
    await Settings.findOneAndUpdate(
      { key: 'payment_details' },
      { $set: { value: PAYMENT_DETAILS } },
      { upsert: true, new: true }
    );

    // Seed invoice terms
    await Settings.findOneAndUpdate(
      { key: 'invoice_terms' },
      { $set: { value: { terms: INVOICE_TERMS_AND_CONDITIONS } } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Settings seeded successfully' 
    });
  } catch (error) {
    console.error('Error seeding settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed settings' },
      { status: 500 }
    );
  }
}
