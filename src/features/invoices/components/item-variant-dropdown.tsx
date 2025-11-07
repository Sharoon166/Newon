'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Package, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getProducts } from '@/features/inventory/actions';
import type { EnhancedVariants } from '@/features/inventory/types';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

// Using real data from database - no need for custom interface

// Extend EnhancedVariants with description for dropdown display
interface ItemVariant extends EnhancedVariants {
  description: string;
}

interface ItemVariantDropdownProps {
  value: string;
  onChange: (value: string) => void;
  onVariantSelect: (variant: ItemVariant) => void;
  placeholder?: string;
  className?: string;
}

export function ItemVariantDropdown({
  value,
  onChange,
  onVariantSelect,
  placeholder = 'Start typing to search items...',
  className
}: ItemVariantDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [variants, setVariants] = useState<ItemVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch and filter variants based on search term
  useEffect(() => {
    const fetchVariants = async () => {
      if (searchTerm.length < 2) {
        setVariants([]);
        return;
      }

      setLoading(true);
      try {
        // Get all products with variants (pricing calculated from purchases)
        const products = await getProducts();
        console.log(`Fetched ${products.length} product variants from inventory`);

        // Create a map of variants with their latest purchase info
        const variantMap = new Map<string, ItemVariant>();

        // Process products to create base variants
        products.forEach(product => {
          const description = `${product.productName} - ${product.sku}`;
          const attributeText = Object.entries(product.attributes || {})
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');

          const fullDescription = attributeText ? `${description} (${attributeText})` : description;

          variantMap.set(`${product.productId}-${product.id}`, {
            ...product, // Spread all properties from EnhancedVariants
            description: fullDescription
          });
        });

        // Filter variants based on search term and exclude disabled variants
        const filteredVariants = Array.from(variantMap.values())
          .filter(variant => {
            // Exclude disabled variants (check explicitly for true to handle undefined)
            if (variant.disabled === true) return false;
            
            const searchLower = searchTerm.toLowerCase();
            return (
              variant.productName.toLowerCase().includes(searchLower) ||
              variant.sku.toLowerCase().includes(searchLower) ||
              variant.description.toLowerCase().includes(searchLower) ||
              Object.values(variant.attributes || {}).some(attr => attr.toLowerCase().includes(searchLower))
            );
          })
          .slice(0, 8); // Limit to 8 results

        console.log(`Found ${filteredVariants.length} variants matching "${searchTerm}"`);
        setVariants(filteredVariants);
      } catch (error) {
        console.error('Error fetching variants:', error);
        setVariants([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchVariants, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(newValue.length >= 2);
  };

  const handleVariantSelect = (variant: ItemVariant) => {
    onChange(variant.description);
    onVariantSelect(variant);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputFocus = () => {
    if (value.length >= 2) {
      setSearchTerm(value);
      setIsOpen(true);
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <InputGroup className={className}>
        <InputGroupInput
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
        />
        <InputGroupAddon align="inline-end">
          <Search className="h-4 w-4" />
        </InputGroupAddon>
      </InputGroup>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              Searching variants...
            </div>
          ) : variants.length > 0 ? (
            <div className="py-2">
              {variants.map(variant => (
                <button
                  key={`${variant.productId}-${variant.id}`}
                  onClick={() => handleVariantSelect(variant)}
                  className="w-full px-4 py-3 text-left hover:bg-muted/50 focus:bg-muted/50 focus:outline-none transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-sm truncate">{variant.productName}</span>
                      </div>

                      <div className="text-xs text-muted-foreground mb-1">SKU: {variant.sku}</div>

                      {Object.keys(variant.attributes).length > 0 && (
                        <div className="text-xs text-muted-foreground mb-1">
                          {Object.entries(variant.attributes)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">Stock: {variant.availableStock}</span>
                        <span className="text-muted-foreground">Supplier: {variant.supplier}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 ml-4">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <DollarSign className="h-3 w-3" />
                        {formatCurrency(variant.retailPrice || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Wholesale: {formatCurrency(variant.wholesalePrice || 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">Cost: {formatCurrency(variant.purchasePrice || 0)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No variants found for &quot;{searchTerm}&quot;</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
