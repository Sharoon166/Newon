'use client';

import { useState } from 'react';
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
import { MoreHorizontal, Pencil, Trash2, Package, Ban, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { EnhancedVirtualProduct } from '../types';
import { deleteVirtualProduct, toggleVirtualProductDisabled } from '../actions';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';

interface VirtualProductsCardsProps {
  data: EnhancedVirtualProduct[];
}

export function VirtualProductsCards({ data }: VirtualProductsCardsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<EnhancedVirtualProduct | null>(null);

  const handleDelete = async () => {
    if (!selectedProduct) return;

    const result = await deleteVirtualProduct(selectedProduct.id!);
    
    if (result.success) {
      toast.success('Virtual product deleted successfully');
      router.refresh();
    } else {
      toast.error(result.error);
    }
    
    setDeleteDialogOpen(false);
    setSelectedProduct(null);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">No virtual products found</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map(product => (
          <Card key={product.id} className="p-4 hover:shadow-lg transition-shadow">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{product.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/virtual-products/${product.id}/edit`)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        const result = await toggleVirtualProductDisabled(product.id!);
                        
                        if (result.success) {
                          toast.success(result.data.disabled ? 'Product disabled' : 'Product enabled');
                          router.refresh();
                        } else {
                          toast.error(result.error);
                        }
                      }}
                    >
                      {product.disabled ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Enable
                        </>
                      ) : (
                        <>
                          <Ban className="mr-2 h-4 w-4" />
                          Disable
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedProduct(product);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-1 mb-3">
                {product.disabled && (
                  <Badge variant="destructive" className="text-xs">
                    Disabled
                  </Badge>
                )}
                <Badge variant={product.availableQuantity > 0 ? 'default' : 'destructive'} className="text-xs">
                  {product.availableQuantity} Available
                </Badge>
              </div>

              {/* Description */}
              {product.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{product.description}</p>
              )}

              {/* Components */}
              <div className="mb-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Components ({product.components.length})
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {product.components.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <Avatar className="h-6 w-6 rounded">
                        <AvatarImage src={comp.image} alt={comp.productName} className="object-contain" />
                        <AvatarFallback className="text-[10px] rounded">
                          {comp.productName?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{comp.productName}</div>
                        <div className="text-muted-foreground">
                          Qty: {comp.quantity} × Stock: {comp.availableStock}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories */}
              {product.categories.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-1">
                    {product.categories.slice(0, 3).map(cat => (
                      <Badge key={cat} variant="outline" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                    {product.categories.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{product.categories.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div className="mt-auto pt-3 border-t space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base Price:</span>
                  <span className="font-semibold">{formatCurrency(product.basePrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Cost:</span>
                  <span className="font-semibold">{formatCurrency(product.estimatedTotalCost || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Profit:</span>
                  <span className={`font-semibold ${(product.estimatedProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(product.estimatedProfit || 0)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Virtual Product"
        description={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />
    </>
  );
}
