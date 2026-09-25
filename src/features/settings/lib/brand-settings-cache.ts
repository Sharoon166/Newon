import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { PAYMENT_DETAILS } from '@/constants';
import { DEFAULT_BRAND_SETTINGS, mergeBrandSettings } from './brand-defaults';
import type { BrandSettingsMap, PaymentDetails } from '../types';

/**
 * Server-side, in-process cache for the two settings that are read on every
 * app load and on every server-rendered print page. One `findOne` per TTL per
 * process instead of one per request - the whole point of "fetch settings
 * once and read them from memory".
 *
 * Never throws: a settings read must not be able to take the app shell down,
 * so every failure falls back to the shipped defaults.
 */
const TTL_MS = 30_000;

let brandCache: { data: BrandSettingsMap; expiresAt: number } | null = null;
let brandInflight: Promise<BrandSettingsMap> | null = null;

let paymentCache: { data: PaymentDetails; expiresAt: number } | null = null;
let paymentInflight: Promise<PaymentDetails> | null = null;

/** Called by the update actions so the next read is guaranteed fresh. */
export function invalidateSettingsCache(): void {
  brandCache = null;
  paymentCache = null;
}

export async function getBrandSettingsCached(): Promise<BrandSettingsMap> {
  if (brandCache && Date.now() < brandCache.expiresAt) return brandCache.data;
  // Concurrent requests (layout + a print route) share one query.
  if (brandInflight) return brandInflight;

  brandInflight = (async () => {
    try {
      await dbConnect();
      const doc = await Settings.findOne({ key: 'brand_settings' }).lean<{ value?: BrandSettingsMap }>();
      const data = mergeBrandSettings(doc?.value ?? null);
      brandCache = { data, expiresAt: Date.now() + TTL_MS };
      return data;
    } catch (error) {
      console.error('Failed to read brand settings, using defaults:', error);
      return brandCache?.data ?? DEFAULT_BRAND_SETTINGS;
    } finally {
      brandInflight = null;
    }
  })();

  return brandInflight;
}

/** Same cache, but forces a re-read (used by the settings screen itself). */
export async function getBrandSettingsFresh(): Promise<BrandSettingsMap> {
  invalidateSettingsCache();
  return getBrandSettingsCached();
}

export async function getPaymentDetailsCached(): Promise<PaymentDetails> {
  if (paymentCache && Date.now() < paymentCache.expiresAt) return paymentCache.data;
  if (paymentInflight) return paymentInflight;

  paymentInflight = (async () => {
    try {
      await dbConnect();
      const doc = await Settings.findOne({ key: 'payment_details' }).lean<{ value?: PaymentDetails }>();
      const data = doc?.value ?? null;
      if (!data || typeof data !== 'object') throw new Error('missing');
      paymentCache = { data, expiresAt: Date.now() + TTL_MS };
      return data;
    } catch (error) {
      console.error('Failed to read payment details, using defaults:', error);
      return paymentCache?.data ?? PAYMENT_DETAILS;
    } finally {
      paymentInflight = null;
    }
  })();

  return paymentInflight;
}
