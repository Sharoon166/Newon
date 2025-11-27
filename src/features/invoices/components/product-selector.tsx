'use client';

import { useState, useMemo, useRef } from 'react';
import { Search, Package, Plus, Minus, Info, Hash, Tag, Tags } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';
import { toast } from 'sonner';

interface ProductSelectorProps {
  label?: string;
  variants: EnhancedVariants[];
  purchases: Purchase[];
  currentItems?: Array<{
    variantId?: string;
    quantity: number;
    purchaseId?: string;
  }>;
  onAddItem: (item: {
    variantId: string;
    productName: string;
    sku: string;
    description: string;
    quantity: number;
    rate: number;
    purchaseId?: string;
  }) => void;
  skipStockValidation?: boolean; // For quotations - allow any quantity
}

export function ProductSelector({
  label = 'Add to Invoice',
  variants,
  purchases,
  currentItems = [],
  onAddItem,
  skipStockValidation = false
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // Remove selectedVariant state - cards are always expanded
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [priceType, setPriceType] = useState<'wholesale' | 'retail'>('retail');
  const gridRef = useRef<HTMLDivElement>(null);

  // Removed click outside handler - cards are always expanded

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

  const getVariantQuantity = (variantId: string) => quantities[variantId] || 1;

  const setVariantQuantity = (variantId: string, quantity: number) => {
    setQuantities(prev => ({ ...prev, [variantId]: quantity }));
  };

  const handleAddToInvoice = (variant: EnhancedVariants) => {
    // Get all purchases for this variant, sorted by FIFO
    // For quotations (skipStockValidation), include all purchases even if out of stock
    const allVariantPurchases = purchases
      .filter(p => p.productId === variant.productId && p.variantId === variant.id && (skipStockValidation || p.remaining > 0))
      .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

    // Calculate effective remaining for each purchase based on items in invoice
    const purchasesWithEffectiveRemaining = allVariantPurchases.map(purchase => {
      const quantityUsedInInvoice = currentItems
        .filter(item => item.variantId === variant.id && item.purchaseId === purchase.purchaseId)
        .reduce((sum, item) => sum + item.quantity, 0);
      return {
        ...purchase,
        effectiveRemaining: purchase.remaining - quantityUsedInInvoice
      };
    });

    // Filter to only purchases with effective remaining > 0 (or all purchases for quotations)
    const variantPurchases = skipStockValidation 
      ? purchasesWithEffectiveRemaining 
      : purchasesWithEffectiveRemaining.filter(p => p.effectiveRemaining > 0);

    const firstPurchase = variantPurchases[0];
    const quantity = getVariantQuantity(variant.id);
    // FIFO: Only use stock from the first purchase
    const available = firstPurchase?.remaining || 0;

    // Calculate quantity already in invoice for this variant from the SAME purchase
    const quantityInInvoice = currentItems
      .filter(item => item.variantId === variant.id && item.purchaseId === firstPurchase?.purchaseId)
      .reduce((sum, item) => sum + item.quantity, 0);

    // Calculate remaining available stock after accounting for items in invoice from SAME purchase
    const remainingAvailable = firstPurchase?.effectiveRemaining || 0;

    // Validation checks
    if (available === 0) {
      toast.error('Out of stock', {
        description: `${variant.productName} is currently out of stock.`
      });
      return;
    }

    if (remainingAvailable <= 0) {
      toast.error('All stock already in invoice', {
        description: `All ${available} units of ${variant.productName} are already added to the invoice.`
      });
      return;
    }

    if (quantity > remainingAvailable) {
      toast.error('Insufficient stock', {
        description: `Only ${remainingAvailable} more units available (${quantityInInvoice} already in invoice).`
      });
      return;
    }

    if (quantity <= 0) {
      toast.error('Invalid quantity', {
        description: 'Quantity must be greater than 0.'
      });
      return;
    }

    const description = `${variant.productName} - ${variant.sku}${
      Object.keys(variant.attributes || {}).length > 0 ? ` (${Object.values(variant.attributes).join(', ')})` : ''
    }`;

    const rate =
      priceType === 'retail'
        ? firstPurchase?.retailPrice || variant.retailPrice || 0
        : firstPurchase?.wholesalePrice || variant.wholesalePrice || 0;

    if (rate <= 0) {
      toast.error('Invalid price', {
        description: `No valid ${priceType} price found for ${variant.productName}.`
      });
      return;
    }

    onAddItem({
      productId: variant.productId,
      variantId: variant.id,
      productName: variant.productName,
      sku: variant.sku,
      description,
      quantity,
      rate,
      originalRate: rate, // Store original rate to detect custom pricing
      purchaseId: firstPurchase?.purchaseId
    });

    // Check if this purchase will be fully used up
    const willBeFullyUsed = quantity === remainingAvailable;
    
    // If purchase is fully used and there's a next purchase available
    if (willBeFullyUsed && variantPurchases.length > 1) {
      const nextPurchase = variantPurchases[1];
      toast.info('Purchase fully used', {
        description: `Purchase ${firstPurchase.purchaseId} is now depleted. Now using Purchase ${nextPurchase.purchaseId} (${nextPurchase.remaining} units available).`,
        duration: 5000
      });
    } else if (willBeFullyUsed && variantPurchases.length === 1) {
      toast.warning('Last purchase depleted', {
        description: `Purchase ${firstPurchase.purchaseId} is now fully used. No more stock available for this product.`,
        duration: 5000
      });
    }

    // Reset quantity for this variant
    setVariantQuantity(variant.id, 1);
  };

  return (
    <div className="space-y-2">
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

        <Select value={priceType} onValueChange={(value: 'wholesale' | 'retail') => setPriceType(value)}>
          <SelectTrigger className="w-[150px] truncate">
            <SelectValue placeholder="Price Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="retail">
              <Tag /> Retail Price
            </SelectItem>
            <SelectItem value="wholesale">
              <Tags /> Wholesale Price
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedCategory('all')}
          role="button"
          aria-label={`Select all`}
          className="px-4 py-1 rounded-full text-sm cursor-pointer"
        >
          <Hash /> All
        </Badge>
        {categories.map(category => (
          <Badge
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(category)}
            role="button"
            aria-label={`Select ${category}`}
            className="px-4 py-1 rounded-full text-sm cursor-pointer"
          >
            <Hash /> {category}
          </Badge>
        ))}
      </div>

      {/* Product Grid with Scroll Area */}
      <div
        ref={gridRef}
        className="@container grid grid-flow-dense sm:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4 @xl:grid-cols-5 gap-3 p-3 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
      >
        {filteredVariants.map(variant => {
          // Get all purchases for this variant, sorted by FIFO
          const allVariantPurchases = purchases
            .filter(p => p.productId === variant.productId && p.variantId === variant.id && p.remaining > 0)
            .sort((a, b) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime());

          // Calculate effective remaining for each purchase based on items in invoice
          const purchasesWithEffectiveRemaining = allVariantPurchases.map(purchase => {
            const quantityUsedInInvoice = currentItems
              .filter(item => item.variantId === variant.id && item.purchaseId === purchase.purchaseId)
              .reduce((sum, item) => sum + item.quantity, 0);
            return {
              ...purchase,
              effectiveRemaining: purchase.remaining - quantityUsedInInvoice
            };
          });

          // Filter to only purchases with effective remaining > 0
          const variantPurchasesForCard = purchasesWithEffectiveRemaining.filter(p => p.effectiveRemaining > 0);

          const firstPurchase = variantPurchasesForCard[0];
          // FIFO: Only show stock from the first purchase with available stock
          const available = firstPurchase?.remaining || 0;
          // Only count items from the SAME purchase when calculating remaining stock
          const quantityInInvoice = currentItems
            .filter(item => item.variantId === variant.id && item.purchaseId === firstPurchase?.purchaseId)
            .reduce((sum, item) => sum + item.quantity, 0);
          const remainingAvailable = firstPurchase?.effectiveRemaining || 0;
          const quantity = getVariantQuantity(variant.id);

          return (
            <Card key={`${variant.productId}-${variant.id}`} className="p-3 transition-all hover:shadow-md">
              <div className="flex flex-col gap-3">
                {/* Product Card Content */}
                <div className="flex flex-col gap-2">
                  {/* Product Image */}
                  {variant.image || variant.imageFile?.cloudinaryUrl ? (
                    <div
                      className="w-full h-32 overflow-clip rounded-md flex justify-center bg-cover bg-no-repeat max-sm:bg-center"
                      style={{
                        backgroundImage: `url(${variant.imageFile?.cloudinaryUrl || variant.image})`
                      }}
                    >
                      {/* <img
                          src={variant.imageFile?.cloudinaryUrl || variant.image}
                          alt={variant.productName}
                          className="object-contain object-center rounded transition group-hover:scale-125"
                        /> */}
                    </div>
                  ) : (
                    <div className="w-full h-24 bg-muted rounded flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}

                  {/* Product Info */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-medium text-xs leading-tight line-clamp-2 flex-1">{variant.productName}</h4>
                      {firstPurchase && (
                        <Popover>
                          <PopoverTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0">
                              <Info className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="end">
                            <div className="space-y-3">
                              <div>
                                <h4 className="font-semibold text-sm mb-1">FIFO - Next Purchase to Use</h4>
                                <p className="text-xs text-muted-foreground">
                                  This Purchase: {firstPurchase.remaining} units
                                  {variantPurchasesForCard.length > 1 && (
                                    <>
                                      {' '}
                                      | Total Across All:{' '}
                                      {variantPurchasesForCard.reduce((sum, p) => sum + p.remaining, 0)} units
                                    </>
                                  )}
                                </p>
                              </div>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Purchase ID:</span>
                                  <span className="font-mono">{firstPurchase.purchaseId}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Date:</span>
                                  <span>{formatDate(new Date(firstPurchase.purchaseDate))}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Remaining:</span>
                                  <span className="font-semibold">{firstPurchase.remaining} units</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Unit Price:</span>
                                  <span>{formatCurrency(firstPurchase.unitPrice)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Retail Price:</span>
                                  <span className="font-semibold">{formatCurrency(firstPurchase.retailPrice)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Wholesale Price:</span>
                                  <span className="font-semibold">{formatCurrency(firstPurchase.wholesalePrice)}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t">
                                  <span className="text-muted-foreground font-medium">Selected Price:</span>
                                  <span className="font-bold text-primary">
                                    {formatCurrency(
                                      priceType === 'retail' ? firstPurchase.retailPrice : firstPurchase.wholesalePrice
                                    )}
                                    <span className="text-xs ml-1">
                                      ({priceType === 'retail' ? 'Retail' : 'Wholesale'})
                                    </span>
                                  </span>
                                </div>
                              </div>
                              {variantPurchasesForCard.length > 1 && (
                                <p className="text-xs text-muted-foreground">
                                  + {variantPurchasesForCard.length - 1} more purchase(s) available
                                </p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{variant.sku}</p>
                    {Object.keys(variant.attributes || {}).length > 0 && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {Object.values(variant.attributes).join(', ')}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex flex-col gap-0.5">
                        <Badge
                          variant={remainingAvailable > 0 ? 'default' : 'destructive'}
                          className="text-xs px-1.5 py-0"
                        >
                          {remainingAvailable} left
                        </Badge>
                        {quantityInInvoice > 0 && (
                          <span className="text-[10px] text-muted-foreground">({quantityInInvoice} in invoice)</span>
                        )}
                      </div>
                      <span className="text-sm font-bold">
                        {formatCurrency(
                          priceType === 'retail'
                            ? firstPurchase?.retailPrice || variant.retailPrice || 0
                            : firstPurchase?.wholesalePrice || variant.wholesalePrice || 0
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls - Below Card */}
                <div className="flex flex-col gap-2 border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={e => {
                        e.stopPropagation();
                        setVariantQuantity(variant.id, Math.max(1, quantity - 1));
                      }}
                      disabled={quantity <= 1 || remainingAvailable === 0}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={remainingAvailable > 0 ? 1 : 0}
                      max={remainingAvailable > 0 ? remainingAvailable : 0}
                      value={remainingAvailable === 0 ? 0 : quantity}
                      onChange={e => {
                        e.stopPropagation();
                        const newQuantity = parseInt(e.target.value) || 1;
                        if (newQuantity > remainingAvailable) {
                          toast.error('Exceeds available stock', {
                            description: `Only ${remainingAvailable} more units available${quantityInInvoice > 0 ? ` (${quantityInInvoice} already in invoice)` : ''}.`
                          });
                          setVariantQuantity(variant.id, Math.max(1, remainingAvailable));
                        } else if (newQuantity < 1) {
                          toast.error('Invalid quantity', {
                            description: 'Quantity must be at least 1.'
                          });
                          setVariantQuantity(variant.id, 1);
                        } else {
                          setVariantQuantity(variant.id, newQuantity);
                        }
                      }}
                      onClick={e => e.stopPropagation()}
                      className="text-center h-8"
                      disabled={remainingAvailable === 0}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={e => {
                        e.stopPropagation();
                        const newQuantity = quantity + 1;
                        if (newQuantity > remainingAvailable) {
                          toast.error('Exceeds available stock', {
                            description: `Only ${remainingAvailable} more units available${quantityInInvoice > 0 ? ` (${quantityInInvoice} already in invoice)` : ''}.`
                          });
                          return;
                        }
                        setVariantQuantity(variant.id, newQuantity);
                      }}
                      disabled={quantity >= remainingAvailable || remainingAvailable === 0}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleAddToInvoice(variant);
                    }}
                    disabled={remainingAvailable === 0 || quantity > remainingAvailable}
                    className="w-full h-9"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {label}
                  </Button>
                  {quantity > remainingAvailable && (
                    <p className="text-xs text-destructive text-center">Stock was used up</p>
                  )}
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
  );
}
