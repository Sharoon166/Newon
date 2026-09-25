import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Lightbulb } from 'lucide-react';
import { ComponentType } from 'react';
import { DEFAULT_BRAND_SETTINGS } from '@/features/settings/lib/brand-defaults';
import type { BrandSettings, BrandSettingsMap } from '@/features/settings/types';

/**
 * A brand plus its runtime-only icon (not serialisable, so it is attached
 * after the settings come back from the database).
 */
export type Brand = BrandSettings & { icon: ComponentType<{ className?: string }> };

/** DB settings -> the array the UI renders. Icons are added here, once. */
export function toBrands(settings: BrandSettingsMap): Brand[] {
  return Object.values(settings).map(brand => ({ ...brand, icon: Lightbulb }));
}

interface BrandState {
  /** Which brand the UI is currently showing (persisted to localStorage). */
  currentBrandId: string;
  /** All brands, straight from `brand_settings`; starts as the shipped defaults. */
  brands: Brand[];
  /** True once the server-seeded settings have been applied. */
  settingsReady: boolean;
  setBrand: (id: string) => void;
  /** Replace the brand list (server seed on load, or right after a save). */
  setBrands: (settings: BrandSettingsMap) => void;
  getCurrentBrand: () => Brand;
  /** Lookup by the invoice `market` value; falls back to the first brand. */
  getBrandById: (id?: string | null) => Brand;
}

const useBrandStore = create<BrandState>()(
  persist(
    (set, get) => ({
      currentBrandId: 'newon',
      brands: toBrands(DEFAULT_BRAND_SETTINGS),
      settingsReady: false,
      setBrand: id => {
        if (get().brands.some(brand => brand.id === id)) {
          set({ currentBrandId: id });
        }
      },
      setBrands: settings => {
        const brands = toBrands(settings);
        if (brands.length === 0) return;
        const { currentBrandId } = get();
        // A brand can be renamed/removed in settings - never keep a dangling id.
        const nextBrandId = brands.some(brand => brand.id === currentBrandId) ? currentBrandId : brands[0].id;
        set({ brands, settingsReady: true, currentBrandId: nextBrandId });
      },
      getCurrentBrand: () => {
        const { currentBrandId, brands } = get();
        return brands.find(brand => brand.id === currentBrandId) ?? brands[0];
      },
      getBrandById: id => {
        const { brands } = get();
        return (id ? brands.find(brand => brand.id === id) : undefined) ?? brands[0];
      }
    }),
    {
      name: 'brand-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist the currentBrandId - brand settings always come from the
      // server, so a cached copy can never go stale in localStorage.
      partialize: state => ({ currentBrandId: state.currentBrandId })
    }
  )
);

export default useBrandStore;
