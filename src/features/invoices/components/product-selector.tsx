'use client';

import { useState, useMemo } from 'react';
import { Search, Package, X, Plus, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';

interface ProductSelectorProps {
  variants: EnhancedVariants[];
  purchases: Purchase[];
  onAddItem: (item: {
    variantId: string;
    productName: string;
    sku: string;
    description: string;
    quantity: number;
    rate: number;
    purchaseId?: string;
  }) => void;
}

export function ProductSelector({ variants, purchases, onAddItem }: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVariant, setSelectedVariant] = useState<EnhancedVariants | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [priceType, setPriceType] = useState<'wholesale' | 'retail'>('retail');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    variants.forEach(v => v.categories?.forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [variants]);

  // Filter variants
  const filteredVariants = useMemo(() => {
    return variants.filter(variant => {
      const matchesSearch =
        searchQuery === '' ||
        variant.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        variant.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || variant.categories?.includes(selectedCategory);

      return matchesSearch && matchesCategory && !variant.disabled;
    });
  }, [variants, searchQuery, selectedCategory]);

  // Get FIFO purchases for selected variant
  const variantPurchases = useMemo(() => {
    if (!selectedVariant) return [];

    return purchases
      .filter(p => p.productId === selectedVariant.productId && p.variantId === selectedVariant.id && p.remaining > 0)
      .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());
  }, [selectedVariant, purchases]);

  const handleSelectVariant = (variant: EnhancedVariants) => {
    setSelectedVariant(variant);
    setSelectedQuantity(1);
  };

  const handleAddToInvoice = () => {
    if (!selectedVariant) return;

    // Get the first available purchase (FIFO)
    const firstPurchase = variantPurchases[0];

    const description = `${selectedVariant.productName} - ${selectedVariant.sku}${
      Object.keys(selectedVariant.attributes || {}).length > 0
        ? ` (${Object.values(selectedVariant.attributes).join(', ')})`
        : ''
    }`;

    // Use selected price type (wholesale or retail)
    const rate =
      priceType === 'retail'
        ? firstPurchase?.retailPrice || selectedVariant.retailPrice || 0
        : firstPurchase?.wholesalePrice || selectedVariant.wholesalePrice || 0;

    onAddItem({
      variantId: selectedVariant.id,
      productName: selectedVariant.productName,
      sku: selectedVariant.sku,
      description,
      quantity: selectedQuantity,
      rate,
      purchaseId: firstPurchase?.id || firstPurchase?._id
    });

    // Reset selection
    setSelectedVariant(null);
    setSelectedQuantity(1);
  };

  const totalAvailable = variantPurchases.reduce((sum, p) => sum + p.remaining, 0);

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priceType} onValueChange={(value: 'wholesale' | 'retail') => setPriceType(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Price Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="retail">Retail Price</SelectItem>
            <SelectItem value="wholesale">Wholesale Price</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid with Scroll Area */}
      <div className="border rounded-lg bg-muted/30">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
          {filteredVariants.map(variant => {
            const variantPurchasesForCard = purchases
              .filter(p => p.productId === variant.productId && p.variantId === variant.id && p.remaining > 0)
              .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

            const available = variantPurchasesForCard.reduce((sum, p) => sum + p.remaining, 0);

            return (
              <Card
                key={`${variant.productId}-${variant.id}`}
                className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedVariant?.id === variant.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleSelectVariant(variant)}
              >
                <div className="flex items-start gap-3">
                  {variant.image || variant.imageFile?.cloudinaryUrl ? (
                    <img
                      src={variant.imageFile?.cloudinaryUrl || variant.image}
                      alt={variant.productName}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{variant.productName}</h4>
                    <p className="text-xs text-muted-foreground">{variant.sku}</p>
                    {Object.keys(variant.attributes || {}).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Object.values(variant.attributes).join(', ')}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={available > 0 ? 'default' : 'destructive'} className="text-xs">
                        Stock: {available}
                      </Badge>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                          {formatCurrency(
                            priceType === 'retail' ? variant.retailPrice || 0 : variant.wholesalePrice || 0
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {priceType === 'retail' ? 'Retail' : 'Wholesale'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
          {filteredVariants.length === 0 && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected Variant Details with FIFO */}
      {selectedVariant && (
        <Card className="p-4 bg-muted/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold">{selectedVariant.productName}</h3>
              <p className="text-sm text-muted-foreground">{selectedVariant.sku}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedVariant(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 items-start">
            {/* FIFO Purchase Details */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total Available:</span>
                <Badge variant={totalAvailable > 0 ? 'default' : 'destructive'}>{totalAvailable} units</Badge>
              </div>
              {variantPurchases.length > 0 && (
                <div className="border rounded-lg p-3 bg-background">
                  <p className="text-xs font-medium mb-2">FIFO - Next Purchase to Use:</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purchase ID:</span>
                      <span className="font-mono">{variantPurchases[0].purchaseId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span>{formatDate(new Date(variantPurchases[0].purchaseDate))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining:</span>
                      <span className="font-semibold">{variantPurchases[0].remaining} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unit Price:</span>
                      <span>{formatCurrency(variantPurchases[0].unitPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Retail Price:</span>
                      <span className="font-semibold">{formatCurrency(variantPurchases[0].retailPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wholesale Price:</span>
                      <span className="font-semibold">{formatCurrency(variantPurchases[0].wholesalePrice)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t mt-2">
                      <span className="text-muted-foreground font-medium">Selected Price:</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(
                          priceType === 'retail' ? variantPurchases[0].retailPrice : variantPurchases[0].wholesalePrice
                        )}
                        <span className="text-xs ml-1">({priceType === 'retail' ? 'Retail' : 'Wholesale'})</span>
                      </span>
                    </div>
                  </div>
                  {variantPurchases.length > 1 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      + {variantPurchases.length - 1} more purchase(s) available
                    </p>
                  )}
                </div>
              )}
              {variantPurchases.length === 0 && (
                <div className="border border-destructive/50 rounded-lg p-3 bg-destructive/5">
                  <p className="text-xs text-destructive">No purchases available for this variant</p>
                </div>
              )}
            </div>
            {/* Quantity Selection */}
            <div className="flex flex-col gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Quantity</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => setSelectedQuantity(prev => Math.max(1, prev - 1))}
                    disabled={selectedQuantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={totalAvailable}
                    value={selectedQuantity}
                    onChange={e => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-center max-w-40"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => setSelectedQuantity(prev => Math.min(totalAvailable, prev + 1))}
                    disabled={selectedQuantity >= totalAvailable}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleAddToInvoice}
                disabled={totalAvailable === 0 || selectedQuantity > totalAvailable}
                className="flex-1"
              >
                <Plus />
                Add to Invoice
              </Button>
            </div>
          </div>

          {selectedQuantity > totalAvailable && (
            <p className="text-xs text-destructive mt-2">Quantity exceeds available stock ({totalAvailable} units)</p>
          )}
        </Card>
      )}
    </div>
  );
}
