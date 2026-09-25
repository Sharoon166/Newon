import type { BrandSettings, BrandSettingsMap } from '../types';

/**
 * The hardcoded brand data that shipped with the app, kept as the default
 * layer: if the database has never been seeded (or a field is missing) the app
 * renders exactly what it rendered before settings moved to the database.
 *
 * NTn / STRN / invoice title are intentionally absent for Newon - they are
 * per-brand opt-ins, not requirements.
 */
export const DEFAULT_BRAND_SETTINGS: BrandSettingsMap = {
  newon: {
    id: 'newon',
    displayName: 'Newon',
    description: 'Inventory Management System',
    address: 'I-9 markaz, Islamabad',
    city: 'Islamabad',
    state: 'Islamabad',
    zip: '44000',
    phone: '+92 343 9227883',
    email: 'info@newon.pk',
    website: 'https://newon.pk/',
    logo: '/newon.png'
  },
  waymor: {
    id: 'waymor',
    displayName: 'Waymor International',
    description: 'Waymor Inventory System',
    address: 'Office# 01, Plot# 235, St# 6, near Petrol Pump I-9/2, Islamabad.',
    city: 'Islamabad',
    state: 'Islamabad',
    zip: '44000',
    phone: '+92 343 9227883',
    email: 'morway4@gmail.com',
    website: '',
    logo: '/waymor.jpg',
    ntnNo: '8938936-1',
    strnNo: '3277876217651'
  }
};

/** Known brand ids, in the order they are offered in the switcher. */
export const BRAND_IDS = Object.keys(DEFAULT_BRAND_SETTINGS);

/** Trim and treat an empty optional field as "not set". */
function optional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Stored values win over the defaults, field by field, so a brand can clear an
 * optional field (delete its NTN number) without the default creeping back in.
 * Unknown ids stored in the database are preserved as-is.
 */
export function mergeBrandSettings(stored?: BrandSettingsMap | null): BrandSettingsMap {
  const merged: BrandSettingsMap = { ...DEFAULT_BRAND_SETTINGS };

  if (stored) {
    for (const [id, value] of Object.entries(stored)) {
      if (!value || typeof value !== 'object') continue;
      const base = merged[id];
      merged[id] = {
        ...base,
        ...value,
        id,
        ntnNo: optional(value.ntnNo ?? base?.ntnNo),
        strnNo: optional(value.strnNo ?? base?.strnNo),
        invoiceTitle: optional(value.invoiceTitle ?? base?.invoiceTitle),
        // Payment details: if stored value has any payment field, use it entirely
        paymentDetails: value.paymentDetails ? {
          bankName: value.paymentDetails.bankName || '',
          accountNumber: value.paymentDetails.accountNumber || '',
          iban: value.paymentDetails.iban || ''
        } : base?.paymentDetails
      };
    }
  }

  // Keep the default ordering first so the switcher never jumps around.
  const ordered: BrandSettingsMap = {};
  for (const id of BRAND_IDS) ordered[id] = merged[id];
  for (const [id, value] of Object.entries(merged)) if (!ordered[id]) ordered[id] = value;

  return ordered;
}

/**
 * Shape used by the printed company header / `COMPANY_DETAILS` consumers.
 * Brands are dynamic now, so consumers must not rely on `typeof COMPANY_DETAILS`.
 */
export function brandToCompany(brand?: BrandSettings): {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
} {
  return {
    name: brand?.displayName ?? '',
    address: brand?.address ?? '',
    city: brand?.city ?? '',
    state: brand?.state ?? '',
    zip: brand?.zip ?? '',
    phone: brand?.phone ?? '',
    email: brand?.email ?? '',
    website: brand?.website ?? ''
  };
}

/**
 * Get payment details for a brand, with fallback to global payment details.
 * If the brand has specific payment details configured, use those; otherwise
 * fall back to the global payment details passed in.
 */
export function getPaymentDetailsForBrand(
  brand?: BrandSettings,
  globalPaymentDetails?: { bankName: string; accountNumber: string; iban: string }
): { bankName: string; accountNumber: string; iban: string } {
  // If brand has payment details and at least one field is non-empty, use brand-specific
  if (brand?.paymentDetails) {
    const { bankName, accountNumber, iban } = brand.paymentDetails;
    if (bankName || accountNumber || iban) {
      return brand.paymentDetails;
    }
  }
  
  // Otherwise fall back to global payment details
  return globalPaymentDetails ?? { bankName: '', accountNumber: '', iban: '' };
}
