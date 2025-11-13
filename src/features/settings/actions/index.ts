'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { PaymentDetails, InvoiceTerms } from '../types';

export async function getPaymentDetails(): Promise<PaymentDetails> {
  try {
    await dbConnect();

    const settings = await Settings.findOne({ key: 'payment_details' }).lean();

    if (!settings) {
      // Return default values if not found
      return {
        BANK_NAME: 'BAHL (Bank Al-Habib Ltd.), I-9 Markaz branch, Islamabad.',
        ACCOUNT_NUMBER: '02470095010759013',
        IBAN: 'PK62BAHL0247009501075901'
      };
    }

    return settings.value as PaymentDetails;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw new Error('Failed to fetch payment details');
  }
}

export async function updatePaymentDetails(data: PaymentDetails): Promise<void> {
  try {
    await dbConnect();

    await Settings.findOneAndUpdate(
      { key: 'payment_details' },
      { $set: { value: data } },
      { upsert: true, new: true }
    );

    revalidatePath('/(dashboard)/settings');
  } catch (error) {
    console.error('Error updating payment details:', error);
    throw new Error('Failed to update payment details');
  }
}

export async function getInvoiceTerms(): Promise<string[]> {
  try {
    await dbConnect();

    const settings = await Settings.findOne({ key: 'invoice_terms' }).lean();

    if (!settings) {
      // Return default values if not found
      return [
        'All prices are exclusive of taxes.',
        'No shipping charges included in above prices.'
      ];
    }

    return (settings.value as InvoiceTerms).terms;
  } catch (error) {
    console.error('Error fetching invoice terms:', error);
    throw new Error('Failed to fetch invoice terms');
  }
}

export async function updateInvoiceTerms(terms: string[]): Promise<void> {
  try {
    await dbConnect();

    await Settings.findOneAndUpdate(
      { key: 'invoice_terms' },
      { $set: { value: { terms } } },
      { upsert: true, new: true }
    );

    revalidatePath('/(dashboard)/settings');
  } catch (error) {
    console.error('Error updating invoice terms:', error);
    throw new Error('Failed to update invoice terms');
  }
}
