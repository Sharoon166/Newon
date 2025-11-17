'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import Staff from '@/models/Staff';
import { PaymentDetails, InvoiceTerms } from '../types';
import { requireAdmin } from '@/lib/auth-utils';
import { PAYMENT_DETAILS } from '@/constants';

export async function getPaymentDetails(): Promise<PaymentDetails> {
  try {
    await dbConnect();

    const settings = await Settings.findOne({ key: 'payment_details' }).lean<{ value: PaymentDetails }>();

    if (!settings) {
      // Return default values if not found
      return PAYMENT_DETAILS;
    }

    return settings.value;
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

    const settings = await Settings.findOne({ key: 'invoice_terms' }).lean<{ value: InvoiceTerms }>();

    if (!settings) {
      // Return default values if not found
      return [
        'All prices are exclusive of taxes.',
        'No shipping charges included in above prices.'
      ];
    }

    return settings.value.terms;
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

export async function updateAdminAccount(data: {
  firstName: string;
  lastName: string;
  email: string;
  currentPassword: string;
  newPassword?: string;
}): Promise<void> {
  try {
    const session = await requireAdmin();
    await dbConnect();

    // Get the current admin user with password
    const admin = await Staff.findById(session.user.id).select('+password');

    if (!admin) {
      throw new Error('Admin user not found');
    }

    // Verify current password
    const isPasswordValid = await admin.comparePassword(data.currentPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update admin details
    admin.firstName = data.firstName;
    admin.lastName = data.lastName;
    admin.email = data.email;

    // Update password if provided
    if (data.newPassword) {
      admin.password = data.newPassword;
    }

    await admin.save();

    revalidatePath('/(dashboard)/settings');
  } catch (error) {
    console.error('Error updating admin account:', error);
    throw error;
  }
}
