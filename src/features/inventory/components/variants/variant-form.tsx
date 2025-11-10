'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Upload, Image as ImageIcon, Trash2, Loader2, Package, MapPin } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDropzone } from 'react-dropzone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { NumberInput } from '@/components/ui/number-input';
import { ProductVariant, ProductAttribute, ProductVariantImage, LocationInventory } from '../../types';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { deleteCloudinaryImage } from '@/app/actions/cloudinary';
import { getPurchasesByProductId, getPurchasesByVariantId } from '@/features/purchases/actions';
import { AlertTriangle } from 'lucide-react';

type InventoryLocation = {
  id: string;
  name: string;
  address?: string;
  isActive: boolean;
};

interface VariantFormProps {
  variantNumber?: number;
  variant: ProductVariant;
  attributes: ProductAttribute[];
  locations: InventoryLocation[];
  onVariantChange: (updatedVariant: ProductVariant) => void;
  onRemove?: () => void;
  isSimpleProduct?: boolean;
  productId?: string;
  variantId?: string;
}

// Image upload component with preview and dropzone
function ImageUpload({
  existing,
  value,
  onChange
}: {
  existing?: string;
  value: ProductVariantImage | undefined;
  onChange: (image: ProductVariantImage | undefined) => void;
}) {
  const [preview, setPreview] = useState<string | null>(value?.dataUrl || existing || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Prevent multiple files
      if (acceptedFiles.length > 1) {
        setUploadError('Please upload only one image at a time');
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);
      setUploadError(null);

      try {
        // If there's an existing image, delete it first
        if (value?.publicId) {
          // await deleteImageFromCloudinary(value.publicId);
          // await deleteFromCloudinary(value.publicId)
          await deleteCloudinaryImage(value.publicId);
        }

        // Create a temporary preview
        const dataUrl = URL.createObjectURL(file);
        setPreview(dataUrl);

        // Upload to Cloudinary
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

        if (!cloudName) {
          throw new Error('Cloudinary is not properly configured');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'product-images');

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Cloudinary upload error:', result);
          throw new Error(result.error?.message || 'Failed to upload image to Cloudinary');
        }

        // Update image data with Cloudinary response
        const updatedImage: ProductVariantImage = {
          dataUrl,
          fileName: file.name,
          fileType: file.type,
          size: file.size,
          cloudinaryUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format
        };

        onChange(updatedImage);
      } catch (error) {
        console.error('Error handling image:', error);
        setUploadError(error instanceof Error ? error.message : 'Failed to handle image');
        setPreview(null);
        // If we failed after deleting the old image, clear the image completely
        if (value?.publicId) {
          onChange(undefined);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [onChange, value]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    maxFiles: 1,
    disabled: isUploading || !!value, // Disable if already has an image
    noClick: !!value, // Prevent click when there's an image
    noKeyboard: !!value // Prevent keyboard navigation when there's an image
  });

  const removeImage = async () => {
    if (existing) {
      const publicId = existing
        .split('/')
        .slice(-2)
        .join('/')
        .replace(/\.[^/.]+$/, '');
      await deleteCloudinaryImage(publicId);
      setPreview(null);
    }
    onChange(undefined);
  };

  return (
    <div className="space-y-2 cursor-pointer">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-md p-4 text-center transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50',
          (preview || value) && 'p-0 border-0',
          (isUploading || value) && 'opacity-50 cursor-not-allowed',
          !!existing && 'opacity-50 cursor-not-allowed border-destructive'
        )}
      >
        <input {...getInputProps()} disabled={!!existing} />
        {preview || value?.dataUrl ? (
          <div className="relative group">
            <Image
              width={400}
              height={400}
              src={preview || (value && value.dataUrl) || ' '}
              alt="Preview"
              className="w-full h-40 object-contain rounded-md"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
              <div className="bg-white p-2 rounded-full">
                <ImageIcon className="h-5 w-5 text-foreground" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2 p-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              {isDragActive ? <p>Drop the image here</p> : <p>Drag & drop an image here, or click to select</p>}
            </div>
            <p className="text-xs text-muted-foreground">Supports: JPG, PNG, WEBP</p>
          </div>
        )}
      </div>
      {existing && <p className="text-xs text-destructive">Delete the uploaded image to replace it</p>}
      {isUploading ? (
        <div className="flex items-center justify-center p-4 border rounded-md">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Uploading image...</span>
        </div>
      ) : uploadError ? (
        <div className="text-destructive text-sm p-2 bg-destructive/10 rounded-md">{uploadError}</div>
      ) : null}
      {/* if local image and existing image */}
      {preview && value?.publicId && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full mt-2"
          onClick={async e => {
            e.stopPropagation();
            try {
              if (value?.publicId) {
                await deleteCloudinaryImage(value.publicId);
              }
            } catch (error) {
              console.error('Error deleting image from Cloudinary:', error);
              // Continue with local state update even if Cloudinary deletion fails
            }
            setPreview(null);
            onChange(undefined);
          }}
        >
          <Trash2 />
          Remove Image
        </Button>
      )}
      {/* if existing image and no local image */}
      {existing && !value && (
        <Button type="button" variant="destructive" onClick={removeImage} className="w-full">
          <X className="h-4 w-4" /> <span>Remove Image</span>
        </Button>
      )}
      {value?.fileName && (
        <p className="text-xs text-muted-foreground truncate">
          {value.fileName} • {value.size ? Math.round(value.size / 1024) : 0}KB
        </p>
      )}
    </div>
  );
}

export function VariantForm({
  variantNumber,
  variant,
  attributes,
  locations = [],
  onVariantChange,
  onRemove,
  isSimpleProduct = false,
  productId,
  variantId
}: VariantFormProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [activeLocations, setActiveLocations] = useState<InventoryLocation[]>([]);
  const [purchasesAvailableStock, setPurchasesAvailableStock] = useState<number>(0);
  const [purchasesTotalQuantity, setPurchasesTotalQuantity] = useState<number>(0);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Update active locations when locations prop changes
  useEffect(() => {
    setActiveLocations(locations.filter(loc => loc.isActive));
  }, [locations]);

  // Fetch purchases and calculate available stock
  useEffect(() => {
    if (productId) {
      const fetchPurchases = async () => {
        try {
          setLoadingPurchases(true);
          // Use variant-specific purchases if variantId is available, otherwise use product purchases
          const purchases = variantId
            ? await getPurchasesByVariantId(productId, variantId)
            : await getPurchasesByProductId(productId);

          const totalAvailable = purchases.reduce((sum, p) => sum + (p.remaining || 0), 0);
          const totalQuantity = purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);

          setPurchasesAvailableStock(totalAvailable);
          setPurchasesTotalQuantity(totalQuantity);
        } catch (error) {
          console.error('Error fetching purchases:', error);
        } finally {
          setLoadingPurchases(false);
        }
      };
      fetchPurchases();
    } else {
      // Reset if no productId
      setPurchasesAvailableStock(0);
      setPurchasesTotalQuantity(0);
    }
  }, [productId, variantId]);

  // Initialize inventory if not present
  useEffect(() => {
    if (!variant.inventory) {
      onVariantChange({
        ...variant,
        inventory: []
      });
    }
  }, [variant, onVariantChange]);

  // Update inventory when locations change
  const updateInventoryForLocations = useCallback(() => {
    const activeLocations = locations.filter(loc => loc.isActive);
    const currentInventory = Array.isArray(variant.inventory) ? variant.inventory : [];
    const updatedInventory = [...currentInventory];

    let needsUpdate = false;

    // Add missing locations to inventory
    activeLocations.forEach(location => {
      if (!updatedInventory.some(item => item.locationId === location.id)) {
        updatedInventory.push({
          locationId: location.id,
          availableStock: 0,
          backorderStock: 0
        });
        needsUpdate = true;
      }
    });

    // Remove inventory for inactive locations
    const locationIds = new Set(activeLocations.map(loc => loc.id));
    const filteredInventory = updatedInventory.filter(item => locationIds.has(item.locationId));

    if (needsUpdate || filteredInventory.length !== updatedInventory.length) {
      onVariantChange({
        ...variant,
        inventory: filteredInventory
      });
    }
  }, [locations, variant, onVariantChange]);

  const updateVariant = useCallback(
    (updates: Partial<ProductVariant>) => {
      const updatedVariant = { ...variant, ...updates };

      // If inventory is being updated, ensure it has the correct structure
      if ('inventory' in updates) {
        updatedVariant.inventory = (updates.inventory || []).map(item => ({
          locationId: item.locationId,
          availableStock: Number(item.availableStock) || 0,
          backorderStock: Number(item.backorderStock) || 0
        }));

        // Update legacy fields for backward compatibility
        updatedVariant.availableStock = updatedVariant.inventory.reduce(
          (sum, item) => sum + (item.availableStock || 0),
          0
        );
        updatedVariant.stockOnBackorder = updatedVariant.inventory.reduce(
          (sum, item) => sum + (item.backorderStock || 0),
          0
        );
      }

      // Handle image updates
      if ('imageFile' in updates) {
        updatedVariant.image = updates.imageFile?.cloudinaryUrl || '';
      } else if ('image' in updates && !updates.image) {
        // If image is being cleared, also clear imageFile
        updatedVariant.imageFile = undefined;
      }

      onVariantChange(updatedVariant);
    },
    [variant, onVariantChange]
  );

  const updateInventory = useCallback(
    (locationId: string, updates: Partial<LocationInventory>) => {
      const currentInventory = Array.isArray(variant.inventory) ? variant.inventory : [];
      const updatedInventory = [...currentInventory];

      // Find the inventory item for this location
      const inventoryIndex = updatedInventory.findIndex(item => item.locationId === locationId);

      if (inventoryIndex >= 0) {
        // Update existing inventory item
        updatedInventory[inventoryIndex] = {
          ...updatedInventory[inventoryIndex],
          ...updates,
          availableStock: Number(updates.availableStock ?? updatedInventory[inventoryIndex].availableStock),
          backorderStock: Number(updates.backorderStock ?? updatedInventory[inventoryIndex].backorderStock)
        };
      } else if (updates.availableStock !== undefined || updates.backorderStock !== undefined) {
        // Add new inventory item if it doesn't exist
        updatedInventory.push({
          locationId,
          availableStock: Number(updates.availableStock ?? 0),
          backorderStock: Number(updates.backorderStock ?? 0)
        });
      }

      // Calculate totals for legacy support
      const totalAvailable = updatedInventory.reduce((sum, item) => sum + (item.availableStock || 0), 0);
      const totalBackorder = updatedInventory.reduce((sum, item) => sum + (item.backorderStock || 0), 0);

      // Update the variant with the new inventory and legacy fields
      updateVariant({
        inventory: updatedInventory,
        availableStock: totalAvailable,
        stockOnBackorder: totalBackorder
      });
    },
    [variant, updateVariant]
  );

  // Run the location update effect
  useEffect(() => {
    updateInventoryForLocations();
  }, [updateInventoryForLocations]);

  const updateAttribute = useCallback(
    (attributeId: string, value: string) => {
      updateVariant({
        attributes: {
          ...variant.attributes,
          [attributeId]: value
        }
      });
    },
    [variant.attributes, updateVariant]
  );

  return (
    <div className="space-y-4">
      {!isSimpleProduct && (
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold">Variant {variantNumber}</h4>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Remove variant</span>
            </Button>
          )}
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Details
          </TabsTrigger>
          {productId && (
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Inventory
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Image</Label>
              <ImageUpload
                existing={variant.image}
                value={variant.imageFile}
                onChange={image => {
                  updateVariant({
                    image: image?.cloudinaryUrl || '',
                    imageFile: image
                  });
                }}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`variant-sku-${variant.id}`}>{isSimpleProduct ? 'SKU' : 'Variant SKU'}</Label>
                <Input
                  id={`variant-sku-${variant.id}`}
                  value={variant.sku}
                  onChange={e => onVariantChange({ ...variant, sku: e.target.value })}
                  placeholder={isSimpleProduct ? 'PRD-001' : 'VAR-001'}
                />
              </div>
            </div>
          </div>
          {attributes.length > 0 && (
            <>
              <h2>Attributes</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attributes.map(attribute => (
                  <div key={attribute.id} className="space-y-2">
                    <Label>{attribute.name}</Label>
                    <Select
                      value={variant.attributes[attribute.name] || ''}
                      onValueChange={value => updateAttribute(attribute.name, value)}
                      required
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={`Select ${attribute.name}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {attribute.values.map(value => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="space-y-4">
            {productId && (
              <div className="space-y-2">
                {loadingPurchases ? (
                  <p className="text-sm text-muted-foreground">Calculating available stock from purchases...</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-medium">
                        Total Purchased: <span className="font-bold">{purchasesTotalQuantity}</span> units
                      </p>
                      <p className="text-sm font-medium">
                        Remaining Available: <span className="font-bold">{purchasesAvailableStock}</span> units
                      </p>
                    </div>
                    {purchasesTotalQuantity > 0 && purchasesAvailableStock !== purchasesTotalQuantity && (
                      <p className="text-xs text-muted-foreground">
                        {purchasesTotalQuantity - purchasesAvailableStock} units have been allocated/sold.
                      </p>
                    )}
                    {(() => {
                      // Calculate combined total (available + backorder) across all locations
                      const combinedTotal = (Array.isArray(variant.inventory) ? variant.inventory : []).reduce(
                        (sum, item) => sum + (item.availableStock || 0) + (item.backorderStock || 0),
                        0
                      );

                      // Show error if combined total exceeds available purchases
                      if (combinedTotal > purchasesAvailableStock) {
                        const excess = combinedTotal - purchasesAvailableStock;
                        return (
                          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-800">
                              <strong>Error:</strong> Combined inventory (available + backorder) of{' '}
                              <strong>{combinedTotal}</strong> units exceeds available purchases of{' '}
                              <strong>{purchasesAvailableStock}</strong> units by <strong>{excess}</strong>{' '}
                              {excess === 1 ? 'unit' : 'units'}.
                            </p>
                          </div>
                        );
                      }

                      // Show warning if there's untracked stock (comparing with combined total: available + backorder)
                      if (purchasesAvailableStock > 0) {
                        const untracked = purchasesAvailableStock - combinedTotal;
                        if (untracked > 0) {
                          return (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-amber-800">
                                <strong>{untracked}</strong> {untracked === 1 ? 'product is' : 'products are'}{' '}
                                untracked. Backorder will be calculated from inventory.
                              </p>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            )}
            <h2>Inventory by Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLocations.map(location => {
                const inventory = (Array.isArray(variant.inventory) ? variant.inventory : []).find(
                  item => item.locationId === location.id
                ) || { availableStock: 0, backorderStock: 0 };

                return (
                  <div key={location.id} className="border rounded-lg p-4 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium">{location.name}</h5>
                      {location.address && <p className="text-xs text-muted-foreground">{location.address}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor={`available-${variant.id}-${location.id}`} className="text-xs">
                          Available
                        </Label>
                        <NumberInput
                          value={inventory.availableStock}
                          onChange={value =>
                            updateInventory(location.id, {
                              availableStock: value
                            })
                          }
                          min={0}
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor={`backorder-${variant.id}-${location.id}`} className="text-xs">
                          Backorder
                        </Label>
                        <NumberInput
                          value={inventory.backorderStock}
                          onChange={value =>
                            updateInventory(location.id, {
                              backorderStock: value
                            })
                          }
                          min={0}
                          className="h-8"
                        />
                      </div>
                    </div>

                    <div className="pt-1 text-xs text-muted-foreground">
                      Total: {inventory.availableStock + inventory.backorderStock} units
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-xs text-muted-foreground">
              <p>Total available stock: {variant.availableStock || 0} units</p>
              <p>Total on backorder: {variant.stockOnBackorder || 0} units</p>
              <p className="font-medium mt-1">
                Combined total: {(variant.availableStock || 0) + (variant.stockOnBackorder || 0)} units
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <Label>
            Available Stock <span className="text-xs text-muted-foreground">(calculated)</span>
          </Label>
          <Input
            type="number"
            readOnly
            min="0"
            value={variant.availableStock}
            // onChange={e => updateVariant({ availableStock: parseInt(e.target.value) })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>
            Stock on Backorder <span className="text-xs text-muted-foreground">(Total)</span>
          </Label>
          <Input
            type="number"
            readOnly
            min="0"
            value={variant.stockOnBackorder}
            // onChange={e => updateVariant({ stockOnBackorder: parseInt(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
