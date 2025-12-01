import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Lightbulb } from 'lucide-react';
import { ComponentType } from 'react';

// Define the brand data without the icon (since it's not serializable)
interface BrandData {
  id: 'newon' | 'waymor';
  displayName: string;
  address: string;
  description: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  website: string;
  ntnNo?: string;
  strnNo?: string;
}

// Full brand type including the icon (for runtime use)
interface Brand extends BrandData {
  icon: ComponentType<{ className?: string }>;
}

// Brand data without the icon (for storage)
const brandData: BrandData[] = [
  {
    id: 'newon',
    displayName: 'Newon',
    address: 'I-9 markaz, Islamabad',
    description: 'Inventory Management System',
    city: 'Islamabad',
    state: 'Islamabad',
    zip: '44000',
    phone: '+92 343 9227883',
    email: 'info@newon.com',
    website: 'www.newon.pk'
  },
  {
    id: 'waymor',
    displayName: 'Waymor International',
    address: 'Office# 02, 1st floor, Haroon Plaza, I-9 markaz',
    description: 'Waymor Inventory System',
    city: 'Islamabad',
    state: 'Islamabad',
    zip: '44000',
    phone: '+92 343 9227883',
    email: 'info@waymor.com',
    ntnNo: '8938936-1',
    strnNo: ' 3277876217651',
    website: ''
  }
];

// Add icons to the brand data at runtime
const brands: Brand[] = brandData.map(brand => ({
  ...brand,
  icon: Lightbulb // You can customize this per brand if needed
}));

interface BrandState {
  currentBrandId: Brand['id'];
  setBrand: (id: Brand['id']) => void;
  getCurrentBrand: () => Brand;
}

const useBrandStore = create<BrandState>()(
  persist(
    (set, get) => ({
      currentBrandId: 'newon',
      setBrand: (id) => {
        if (brands.some(brand => brand.id === id)) {
          set({ currentBrandId: id });
        }
      },
      getCurrentBrand: () => {
        const { currentBrandId } = get();
        return brands.find(brand => brand.id === currentBrandId) || brands[0];
      }
    }),
    {
      name: 'brand-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist the currentBrandId
      partialize: (state) => ({ currentBrandId: state.currentBrandId })
    }
  )
);

// Export the brands array for use in components
export { brands };

export default useBrandStore;
