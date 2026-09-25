'use client';

import { useEffect, type ReactNode } from 'react';
import useBrandStore from '@/stores/useBrandStore';
import type { BrandSettingsMap } from '../types';

/**
 * Client component that seeds the brand store with server-fetched settings.
 * Place this at the top of the dashboard layout so brands are available
 * before any child component reads from the store.
 *
 * The store starts with DEFAULT_BRAND_SETTINGS as its initial state, so the
 * first render is always correct even before the DB query completes.
 */
export function BrandProvider({ initialBrands, children }: { initialBrands: BrandSettingsMap; children: ReactNode }) {
  const setBrands = useBrandStore(state => state.setBrands);

  useEffect(() => {
    // Seed the store once on mount. The store will ignore the update if
    // settingsReady is already true (prevents redundant re-seeds).
    setBrands(initialBrands);
  }, [initialBrands, setBrands]);

  return <>{children}</>;
}
