'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Package, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { EnhancedVariants } from '../types';

interface ProductsCardsProps {
  data: EnhancedVariants[];
  userRole?: string;
}

export function ProductsCards({ data, userRole }: ProductsCardsProps) {
  const router = useRouter();
  const isAdmin = userRole === 'admin';

  // Group variants by product
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, EnhancedVariants[]>();
    
    data.forEach(variant => {
      const productId = variant.productId;
      if (!groups.has(productId)) {
        groups.set(productId, []);
      }
      groups.get(productId)!.push(variant);
    });
    
    return Array.from(groups.values());
  }, [data]);

  if (groupedProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No products found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groupedProducts.map(variants => {
        const firstVariant = variants[0];
        const productId = firstVariant.productId;
        const productName = firstVariant.productName;
        const supplier = firstVariant.supplier;
        const categories = firstVariant.categories;
        const description = firstVariant.description;
        const locations = firstVariant.locations;
        
        const totalStock = variants.reduce((sum, v) => {
          const variantTotal = v.inventory?.reduce((s, inv) => s + inv.availableStock, 0) || v.availableStock || 0;
          return sum + variantTotal;
        }, 0);
        
        const hasDisabledVariants = variants.some(v => v.disabled);
        const allVariantsDisabled = variants.every(v => v.disabled);

        return (
          <Card key={productId} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{productName}</h3>
                  <p className="text-xs text-muted-foreground">{supplier}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/inventory/${productId}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => router.push(`/inventory/${productId}/edit`)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-1 mb-3">
                {allVariantsDisabled && (
                  <Badge variant="destructive" className="text-xs">
                    All Disabled
                  </Badge>
                )}
                {hasDisabledVariants && !allVariantsDisabled && (
                  <Badge variant="secondary" className="text-xs">
                    Some Disabled
                  </Badge>
                )}
                <Badge variant={totalStock > 0 ? 'default' : 'destructive'} className="text-xs">
                  {totalStock} in Stock
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {variants.length} Variant{variants.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Description */}
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p>
              )}

              {/* Variants Preview */}
              <div className="mb-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Variants ({variants.length})
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {variants.slice(0, 3).map(variant => {
                    const variantStock = variant.inventory?.reduce((s, inv) => s + inv.availableStock, 0) || variant.availableStock || 0;
                    
                    return (
                      <div key={variant.id} className="flex items-center gap-2 text-xs">
                        <Avatar className="h-6 w-6 rounded">
                          <AvatarImage 
                            src={variant.imageFile?.cloudinaryUrl || variant.image} 
                            alt={variant.sku} 
                            className="object-contain" 
                          />
                          <AvatarFallback className="text-[10px] rounded">
                            {productName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-mono">{variant.sku}</div>
                          <div className="text-muted-foreground">
                            Stock: {variantStock}
                            {variant.disabled && ' • Disabled'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {variants.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{variants.length - 3} more variant{variants.length - 3 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Categories */}
              {categories && categories.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {categories.slice(0, 3).map(cat => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                    {categories.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{categories.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Locations */}
              {locations && locations.length > 0 && (
                <div className="mt-auto pt-3 border-t">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Locations
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {locations.filter(loc => loc.isActive).slice(0, 3).map(loc => (
                      <Badge key={loc.id} variant="secondary" className="text-xs">
                        {loc.name}
                      </Badge>
                    ))}
                    {locations.filter(loc => loc.isActive).length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{locations.filter(loc => loc.isActive).length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
