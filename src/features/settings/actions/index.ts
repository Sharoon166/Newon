'use server';

import { revalidatePath } from 'next/cache';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import Staff from '@/models/Staff';
import { PaymentDetails, InvoiceTerms, BrandSettings, BrandSettingsMap } from '../types';
import { requireAdmin } from '@/lib/auth-utils';
import {
  getBrandSettingsCached,
  getBrandSettingsFresh,
  getPaymentDetailsCached,
  invalidateSettingsCache
} from '../lib/brand-settings-cache';
/**
 * Brand settings for the whole app (both brands in one read). Cached on the
 * server for a short TTL - the dashboard layout calls this once per load and
 * seeds the zustand store with the result.
 */
export async function getBrandSettings(): Promise<BrandSettingsMap> {
  return getBrandSettingsCached();
}

/** Fresh read for the settings screen itself. */
export async function getBrandSettingsForEditor(): Promise<BrandSettingsMap> {
  return getBrandSettingsFresh();
}

/**
 * Save one brand's settings. Only the given brand is written (`value.<id>`),
 * the rest of the document is untouched, and the returned map is already
 * merged with defaults so the caller can push it straight into the store.
 */
export async function updateBrandSettings(
  id: string,
  data: Omit<BrandSettings, 'id'>
): Promise<BrandSettingsMap> {
  const session = await requireAdmin();
  if (!session) throw new Error('Only an admin can change brand settings.');
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Invalid brand id.');

  await dbConnect();

  // Optional fields: whitespace means "not set", so a cleared NTN / STRN /
  // invoice title stays cleared instead of falling back to the default.
  const clean: Omit<BrandSettings, 'id'> = {
    ...data,
    displayName: data.displayName?.trim() || id,
    description: data.description?.trim() ?? '',
    address: data.address?.trim() ?? '',
    city: data.city?.trim() ?? '',
    state: data.state?.trim() ?? '',
    zip: data.zip?.trim() ?? '',
    phone: data.phone?.trim() ?? '',
    email: data.email?.trim() ?? '',
    website: data.website?.trim() ?? '',
    logo: data.logo?.trim() || undefined,
    ntnNo: data.ntnNo?.trim() || undefined,
    strnNo: data.strnNo?.trim() || undefined,
    invoiceTitle: data.invoiceTitle?.trim() || undefined
  };

  await Settings.findOneAndUpdate(
    { key: 'brand_settings' },
    { $set: { [`value.${id}`]: { ...clean, id } } },
    { upsert: true }
  );

  // Next read - any process, any caller - must see the new values.
  invalidateSettingsCache();
  revalidatePath('/settings');

  return getBrandSettingsCached();
}

export async function getPaymentDetails(): Promise<PaymentDetails> {
  return getPaymentDetailsCached();
}

export async function updatePaymentDetails(data: PaymentDetails): Promise<void> {
  try {
    await dbConnect();

    await Settings.findOneAndUpdate({ key: 'payment_details' }, { $set: { value: data } }, { upsert: true, new: true });

    invalidateSettingsCache();
    revalidatePath('/settings');
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
      return ['All prices are exclusive of taxes.', 'No shipping charges included in above prices.'];
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

    invalidateSettingsCache();
    revalidatePath('/settings');
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
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireAdmin();
    await dbConnect();

    // Get the current admin user with password
    const admin = await Staff.findById(session.user.id).select('+password');

    if (!admin) {
      return { success: false, error: 'Admin user not found' };
    }

    // Verify current password
    const isPasswordValid = await admin.comparePassword(data.currentPassword);
    if (!isPasswordValid) {
      return { success: false, error: 'Current password is incorrect' };
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

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating admin account:', error);
    return { success: false, error: 'Failed to update account' };
  }
}
