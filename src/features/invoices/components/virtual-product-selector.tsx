'use client';

import { useState, useMemo } from 'react';
import { Search, Package, Plus, Minus, Info, Hash, Tag, Tags, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';
import type { EnhancedVirtualProduct } from '@/features/virtual-products/types';
import { toast } from 'sonner';

interface VirtualProductSelectorProps {
  label?: string;
  virtualProducts: EnhancedVirtualProduct[];
  currentItems?: Array<{
    virtualProductId?: string;
    quantity: number;
  }>;
  onAddItem: (item: {
    virtualProductId: string;
    isVirtualProduct: boolean;
    productName: string;
    sku: string;
    description: string;
    quantity: number;
    rate: number;
    saleRate: number;
  }) => void;
  skipStockValidation?: boolean;
}

export function VirtualProductSelector({
  label = 'Add to Invoice',
  virtualProducts,
  currentItems = [],
  onAddItem,
  skipStockValidation = false
}: VirtualProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [priceType, setPriceType] = useState<'wholesale' | 'retail'>('retail');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    virtualProducts.forEach(vp => vp.categories?.forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [virtualProducts]);

  // Filter virtual products
  const filteredProducts = useMemo(() => {
    return virtualProducts.filter(product => {
      if (product.disabled) return false;

      const matchesSearch =
        searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' ||
        product.categories?.includes(selectedCategory) ||
        (selectedCategory === 'uncategorized' && (!product.categories || product.categories.length === 0));

      return matchesSearch && matchesCategory;
    });
  }, [virtualProducts, searchQuery, selectedCategory]);

  const getProductQuantity = (productId: string) => quantities[productId] || 1;

  const setProductQuantity = (productId: string, quantity: number) => {
    setQuantities(prev => ({ ...prev, [productId]: quantity }));
  };

  const handleAddToInvoice = (product: EnhancedVirtualProduct) => {
    const quantity = getProductQuantity(product.id!);
    const available = product.availableQuantity;

    // Check stock availability
    if (!skipStockValidation && available < quantity) {
      toast.error(`Insufficient stock. Available: ${available}, Requested: ${quantity}`);
      return;
    }

    // Check if already added
    const alreadyAdded = currentItems.some(item => item.virtualProductId === product.id);
    if (alreadyAdded) {
      toast.error('This virtual product is already added to the invoice');
      return;
    }

    const rate = priceType === 'wholesale' ? product.wholesalePrice : product.retailPrice;

    onAddItem({
      virtualProductId: product.id!,
      isVirtualProduct: true,
      productName: product.name,
      sku: product.sku,
      description: product.name, // Use product name as description
      quantity,
      rate,
      saleRate: rate
    });

    // Reset quantity for this product
    setQuantities(prev => ({ ...prev, [product.id!]: 1 }));
    toast.success(`Added ${product.name} to invoice`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search virtual products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priceType} onValueChange={(v: 'wholesale' | 'retail') => setPriceType(v)}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="retail">Retail Price</SelectItem>
            <SelectItem value="wholesale">Wholesale Price</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No virtual products found</p>
          </div>
        ) : (
          filteredProducts.map(product => {
            const quantity = getProductQuantity(product.id!);
            const price = priceType === 'wholesale' ? product.wholesalePrice : product.retailPrice;
            const available = product.availableQuantity;
            const isLowStock = available < 5;
            const isOutOfStock = available === 0;

            return (
              <Card key={product.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{product.name}</h4>
                      <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <Info className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm">Components</h4>
                          {product.components.map((comp, idx) => (
                            <div key={idx} className="text-xs border-b pb-2 last:border-0">
                              <div className="font-medium">{comp.productName}</div>
                              <div className="text-muted-foreground">SKU: {comp.sku}</div>
                              <div className="flex justify-between mt-1">
                                <span>Qty per unit: {comp.quantity}</span>
                                <span>Stock: {comp.availableStock}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {product.categories && product.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {product.categories.slice(0, 2).map(cat => (
                        <Badge key={cat} variant="outline" className="text-xs">
                          {cat}
                        </Badge>
                      ))}
                      {product.categories.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{product.categories.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold">{formatCurrency(price)}</div>
                      <Badge variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'default'}>
                        {available} available
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-md">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setProductQuantity(product.id!, Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="px-3 text-sm font-medium min-w-[2rem] text-center">{quantity}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setProductQuantity(product.id!, quantity + 1)}
                        disabled={!skipStockValidation && quantity >= available}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleAddToInvoice(product)}
                      disabled={isOutOfStock && !skipStockValidation}
                      className="flex-1"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}