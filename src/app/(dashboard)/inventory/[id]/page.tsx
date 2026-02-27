import { notFound } from 'next/navigation';
import { getProductWithPricing } from '@/features/inventory/actions';
import { PageHeader } from '@/components/general/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, cn } from '@/lib/utils';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { ImageZoom } from '@/components/ui/shadcn-io/image-zoom';
import { VariantPurchaseHistoryButton } from '@/features/purchases/components/variant-purchase-history-button';
import { PricingInfo, PricingBadge } from '@/components/inventory/pricing-info';
import { VariantActions } from '@/features/inventory/components/variants/variant-actions';
import type { ProductAttribute, ProductLocation, ProductVariant } from '@/features/inventory/types';

interface ProductDetailPageProps {
  params: {
    id: string;
  };
}

interface EnhancedProductVariant extends ProductVariant {
  purchasePrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
  shippingCost?: number;
  unitPrice?: number;
}

interface ProductWithPricing {
  _id?: string;
  name: string;
  description?: string;
  supplier: string;
  categories: string[];
  locations?: ProductLocation[];
  attributes?: ProductAttribute[];
  variants?: EnhancedProductVariant[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface LocationWithStock extends ProductLocation {
  totalAvailable: number;
  totalBackorder: number;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const productData = await getProductWithPricing(id);

  if (!productData) {
    notFound();
  }

  const product = productData as unknown as ProductWithPricing;

  // Calculate total stock across all variants
  const totalStock =
    product.variants?.reduce((sum, variant) => {
      return sum + (variant.availableStock || 0);
    }, 0) || 0;

  const totalBackorder =
    product.variants?.reduce((sum, variant) => {
      return sum + (variant.stockOnBackorder || 0);
    }, 0) || 0;

  // Get all unique locations from variants
  const allLocations = new Map<string, LocationWithStock>();
  product.variants?.forEach(variant => {
    variant.inventory?.forEach(inv => {
      const location = product.locations?.find(loc => loc.id === inv.locationId);
      if (location && !allLocations.has(location.id)) {
        allLocations.set(location.id, {
          ...location,
          totalAvailable: 0,
          totalBackorder: 0
        });
      }
      if (location) {
        const locData = allLocations.get(location.id);
        if (locData) {
          locData.totalAvailable += inv.availableStock || 0;
          locData.totalBackorder += inv.backorderStock || 0;
        }
      }
    });
  });

  const locationsArray = Array.from(allLocations.values());

  // Check if product has only one variant
  const isSingleVariant = product.variants?.length === 1;
  const singleVariant: EnhancedProductVariant | null = isSingleVariant && product.variants ? product.variants[0] : null;

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto">
      <PageHeader
        title={product.name || 'Product Details'}
        backLink="/inventory"
        description="View complete product information"
      >
        <Button asChild>
          <Link href={`/inventory/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Product
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Product Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-6">
                <div className="shrink-0">
                  <ImageZoom>
                    <Avatar className="h-24 w-24 rounded-lg sm:h-32 sm:w-32">
                      <AvatarImage
                        src={product.variants?.[0]?.image || product.variants?.[0]?.imageFile?.cloudinaryUrl || ''}
                        alt={product.name}
                        className="object-contain"
                      />
                      <AvatarFallback className="text-2xl rounded-lg">{product.name?.charAt(0) || 'P'}</AvatarFallback>
                    </Avatar>
                  </ImageZoom>
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-2xl mb-2">{product.name}</CardTitle>
                  {product.description && (
                    <CardDescription className="text-base mt-2 whitespace-pre-wrap">
                      {product.description}
                    </CardDescription>
                  )}
                  {/* Only show SKU here if it's a single variant product without attributes, otherwise it's redundant */}
                  {product.variants?.[0]?.sku &&
                    isSingleVariant &&
                    (!product.attributes || product.attributes.length === 0) && (
                      <div className="mt-3 text-sm text-muted-foreground">
                        SKU: <span className="font-mono">{product.variants[0].sku}</span>
                      </div>
                    )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Categories and Supplier */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Supplier</div>
                <div className="text-sm text-muted-foreground">{product.supplier || 'Not specified'}</div>
              </div>

              {product.categories && product.categories.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {product.categories.map((category, index) => (
                      <Badge key={index}>{category}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {product.attributes && product.attributes.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Attributes</div>
                  <div className="space-y-2">
                    {product.attributes.map(attr => (
                      <div key={attr.id} className="text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{attr.name}:</span>
                          {attr.isRequired && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {attr.values.map((value, index) => (
                            <Badge key={index} variant="outline">
                              {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <PricingInfo variant="compact" />
          {/* Variants - only show if multiple variants */}
          {!isSingleVariant && product.variants && product.variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Variants ({product.variants.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {product.variants.map((variant, index) => {
                    const variantAttributes = variant.attributes || {};
                    const attributeEntries = Object.entries(variantAttributes);

                    return (
                      <div key={variant.id || index}>
                        {index > 0 && <Separator className="my-4" />}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium">Variant {index + 1}</div>
                                {variant.disabled && (
                                  <Badge variant="destructive" className="text-xs">
                                    Disabled
                                  </Badge>
                                )}
                              </div>
                              {variant.sku && (
                                <div className="text-sm text-muted-foreground font-mono">SKU: {variant.sku}</div>
                              )}
                              {attributeEntries.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {attributeEntries.map(([attrId, value]) => {
                                    const attr = product.attributes?.find(a => a.id === attrId);
                                    return (
                                      <Badge key={attrId} variant="secondary" className="text-xs">
                                        {attr?.name || attrId}: {value}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {variant.image || variant.imageFile?.cloudinaryUrl ? (
                              <ImageZoom>
                                <Avatar className="h-16 w-16 rounded-md">
                                  <AvatarImage
                                    src={variant.image || variant.imageFile?.cloudinaryUrl}
                                    alt={`Variant ${index + 1}`}
                                    className="object-contain"
                                  />
                                  <AvatarFallback className="text-xs rounded-md">{index + 1}</AvatarFallback>
                                </Avatar>
                              </ImageZoom>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Retail Price</div>
                              <div className="font-medium">{formatCurrency(variant.retailPrice || 0)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Wholesale Price</div>
                              <div className="font-medium">{formatCurrency(variant.wholesalePrice || 0)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground flex items-center gap-1">Purchase Price</div>
                              <div className="font-medium text-muted-foreground">
                                {formatCurrency(variant.purchasePrice || 0)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Shipping Cost</div>
                              <div className="font-medium text-muted-foreground">
                                {formatCurrency(variant.shippingCost || 0)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Available Stock</div>
                              <div
                                className={`font-medium ${(variant.availableStock || 0) < 10 ? 'text-amber-500' : ''}`}
                              >
                                {variant.availableStock || 0}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Backorder Stock</div>
                              <div className="font-medium">{variant.stockOnBackorder || 0}</div>
                            </div>
                          </div>
                          <VariantActions
                            productId={id}
                            variantId={variant.id}
                            disabled={variant.disabled || false}
                            variantSku={variant.sku}
                          />
                          <div className="mt-2 flex gap-2">
                            <VariantPurchaseHistoryButton
                              productId={id}
                              variantId={variant.id}
                              variantSku={variant.sku}
                              variantAttributes={variant.attributes}
                              productAttributes={product.attributes || []}
                              locations={product.locations || []}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Single Variant Details with Purchase History */}
          {isSingleVariant && singleVariant && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Product Details</CardTitle>
                  {singleVariant.disabled && (
                    <Badge variant="destructive" className="text-xs">
                      Disabled
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    {singleVariant.sku && (
                      <div className="text-sm text-muted-foreground font-mono mb-2">SKU: {singleVariant.sku}</div>
                    )}
                    {singleVariant.attributes && Object.entries(singleVariant.attributes).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(singleVariant.attributes).map(([attrId, value]) => {
                          const attr = product.attributes?.find(a => a.id === attrId);
                          return (
                            <Badge key={attrId} variant="secondary" className="text-xs">
                              {attr?.name || attrId}: {value}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {singleVariant.image || singleVariant.imageFile?.cloudinaryUrl ? (
                    <ImageZoom>
                      <Avatar className="h-16 w-16 rounded-md">
                        <AvatarImage
                          src={singleVariant.image || singleVariant.imageFile?.cloudinaryUrl}
                          alt="Variant"
                          className="object-contain"
                        />
                        <AvatarFallback className="text-xs rounded-md">V</AvatarFallback>
                      </Avatar>
                    </ImageZoom>
                  ) : null}
                </div>

                <PricingBadge />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Retail Price</div>
                    <div className="font-medium">{formatCurrency(singleVariant.retailPrice || 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Wholesale Price</div>
                    <div className="font-medium">{formatCurrency(singleVariant.wholesalePrice || 0)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1">Purchase Price</div>
                    <div className="font-medium text-muted-foreground">
                      {formatCurrency(singleVariant.purchasePrice || 0)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Shipping Cost</div>
                    <div className="font-medium text-muted-foreground">
                      {formatCurrency(singleVariant.shippingCost || 0)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Available Stock</div>
                    <div className={`font-medium ${(singleVariant.availableStock || 0) < 10 ? 'text-amber-500' : ''}`}>
                      {singleVariant.availableStock || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Backorder Stock</div>
                    <div className="font-medium">{singleVariant.stockOnBackorder || 0}</div>
                  </div>
                </div>
                <VariantActions
                  productId={id}
                  variantId={singleVariant.id}
                  disabled={singleVariant.disabled || false}
                  variantSku={singleVariant.sku}
                />

                <div className="mt-2 flex gap-2 overflow-auto">
                  <VariantPurchaseHistoryButton
                    productId={id}
                    variantId={singleVariant.id}
                    variantSku={singleVariant.sku}
                    variantAttributes={singleVariant.attributes}
                    productAttributes={product.attributes || []}
                    locations={product.locations || []}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-destructive">Maybe REMOVE THIS</div>
                <div className="text-sm font-medium mb-1">Total Available Stock</div>
                <div className={`text-2xl font-bold ${totalStock < 10 ? 'text-amber-500' : ''}`}>{totalStock}</div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Total Backorder Stock</div>
                <div className="text-2xl font-bold">{totalBackorder}</div>
              </div>
              {!isSingleVariant && (
                <div>
                  <div className="text-sm font-medium mb-1">Total Variants</div>
                  <div className="text-2xl font-bold">{product.variants?.length || 0}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pricing Summary - Only show for single variant if it's not already shown in variant details */}
          {/* Removed to avoid redundancy - pricing is already shown in variant details section */}

          {/* Pricing Information */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Information</CardTitle>
              <CardDescription>Pricing calculated using FIFO (First In, First Out) method</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSingleVariant && product.variants && product.variants.length > 0 ? (
                <>
                  <div>
                    <div className="text-sm font-medium mb-1">Lowest Retail Price</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(Math.min(...product.variants.map(v => v.retailPrice || 0)))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Highest Retail Price</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(Math.max(...product.variants.map(v => v.retailPrice || 0)))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1 flex items-center gap-1">Average Purchase Price</div>
                    <div className="text-xl font-bold text-muted-foreground">
                      {formatCurrency(
                        product.variants.reduce((sum, v) => sum + (v.purchasePrice || 0), 0) / product.variants.length
                      )}
                    </div>
                  </div>
                </>
              ) : singleVariant ? (
                <>
                  <div>
                    <div className="text-sm font-medium mb-1">Current Retail Price</div>
                    <div className="text-xl font-bold">{formatCurrency(singleVariant.retailPrice || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1 flex items-center gap-1">Current Purchase Price</div>
                    <div className="text-xl font-bold text-muted-foreground">
                      {formatCurrency(singleVariant.purchasePrice || 0)}
                    </div>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          {/* Locations */}
          {locationsArray.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Inventory by Location</CardTitle>
                <CardDescription>Stock levels across all locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {locationsArray.map(location => (
                    <div key={location.id} className="space-y-2 p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{location.name}</div>
                          {location.address && (
                            <div className="text-xs text-muted-foreground mt-1">{location.address}</div>
                          )}
                        </div>
                        <Badge variant={location.isActive ? 'default' : 'secondary'} className="ml-2">
                          {location.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="text-sm">
                          <div className="text-muted-foreground">Available</div>
                          <div
                            className={cn('text-lg font-semibold', location.totalAvailable < 10 && 'text-amber-500')}
                          >
                            {location.totalAvailable}
                          </div>
                        </div>
                        <div className="text-sm">
                          <div className="text-muted-foreground">Backorder</div>
                          <div className="text-lg font-semibold">{location.totalBackorder}</div>
                        </div>
                      </div>

                      {/* Show variant breakdown for this location if multiple variants */}
                      {!isSingleVariant && product.variants && product.variants.length > 1 && (
                        <div className="pt-2 border-t mt-2">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            Variants at this location:
                          </div>
                          <div className="space-y-1">
                            {product.variants
                              .filter(v =>
                                v.inventory?.some(inv => inv.locationId === location.id && inv.availableStock > 0)
                              )
                              .map(variant => {
                                const locationInv = variant.inventory?.find(inv => inv.locationId === location.id);
                                if (!locationInv) return null;

                                const attrString = Object.entries(variant.attributes || {})
                                  .map(([, value]) => value)
                                  .join(', ');

                                return (
                                  <div key={variant.id} className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">{attrString || variant.sku}</span>
                                    <span className="font-medium">{locationInv.availableStock} units</span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
