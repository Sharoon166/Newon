'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Upload, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ProductVariant, ProductAttribute, ProductVariantImage } from '../../types';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import { deleteCloudinaryImage } from '@/app/actions/cloudinary';

type VariantFormProps = {
  variant: ProductVariant;
  attributes: ProductAttribute[];
  onVariantChange: (updatedVariant: ProductVariant) => void;
  onRemove: () => void;
};

// Image upload component with preview and dropzone
function ImageUpload({
  value,
  onChange,
}: {
  value: ProductVariantImage | undefined;
  onChange: (image: ProductVariantImage | undefined) => void;
}) {
  const [preview, setPreview] = useState<string | null>(value?.dataUrl || null);
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
        console.log({value})
        // If there's an existing image, delete it first
        if (value?.publicId) {
          // await deleteImageFromCloudinary(value.publicId);
          // await deleteFromCloudinary(value.publicId)
          await deleteCloudinaryImage(value.publicId)
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
        
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error('Cloudinary upload error:', result);
          throw new Error(result.error?.message || 'Failed to upload image to Cloudinary');
        }
        
        console.log('Cloudinary upload successful:', result);
        
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
    noKeyboard: !!value, // Prevent keyboard navigation when there's an image
  });

  return (
    <div className="space-y-2 cursor-pointer">
      <Label>Variant Image</Label>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-md p-4 text-center transition-colors',
          isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50',
          (preview || value) && 'p-0 border-0',
          (isUploading || value) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
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
              {isDragActive ? (
                <p>Drop the image here</p>
              ) : (
                <p>Drag & drop an image here, or click to select</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Supports: JPG, PNG, WEBP, GIF</p>
          </div>
        )}
      </div>
      {isUploading ? (
        <div className="flex items-center justify-center p-4 border rounded-md">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Uploading image...</span>
        </div>
      ) : uploadError ? (
        <div className="text-destructive text-sm p-2 bg-destructive/10 rounded-md">
          {uploadError}
        </div>
      ) : null}
      {preview && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full mt-2"
          onClick={async (e) => {
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
      {value?.fileName && (
        <p className="text-xs text-muted-foreground truncate">
          {value.fileName} • {value.size ? Math.round(value.size / 1024) : 0}KB
        </p>
      )}
    </div>
  );
}

export function VariantForm({ variant, attributes, onVariantChange, onRemove }: VariantFormProps) {
  const updateVariant = (updates: Partial<ProductVariant>) => {
    onVariantChange({ ...variant, ...updates });
  };

  const updateAttribute = (attributeId: string, value: string) => {
    updateVariant({
      attributes: {
        ...variant.attributes,
        [attributeId]: value
      }
    });
  };

  return (
    <div className="space-y-4 rounded-lg pt-6 relative">
      <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 h-6 w-6" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
      {variant.image && (
        <Image height={100} width={100} src={variant.image} alt="current variant image" className="rounded-2xl" />
      )}
      <div className="grid lg:grid-cols-2 gap-4 rounded-2xl">
        <ImageUpload
          value={variant.imageFile}
          onChange={imageFile =>
            updateVariant({
              image: imageFile?.cloudinaryUrl || '',
              imageFile: imageFile
            })
          }
        />
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={variant.sku}
                onChange={e => onVariantChange({ ...variant, sku: e.target.value })}
                placeholder="SKU-001"
              />
            </div>
          </div>
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
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        <div className="space-y-2">
          <Label>Purchase Price</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={variant.purchasePrice}
            onChange={e => updateVariant({ purchasePrice: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Retail Price</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={variant.retailPrice}
            onChange={e => updateVariant({ retailPrice: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Wholesale Price</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={variant.wholesalePrice}
            onChange={e => updateVariant({ wholesalePrice: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Shipping Cost</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={variant.shippingCost}
            onChange={e => updateVariant({ shippingCost: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <Label>Available Stock</Label>
          <Input
            type="number"
            min="0"
            value={variant.availableStock}
            onChange={e => updateVariant({ availableStock: parseInt(e.target.value) || 0 })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Stock on Backorder</Label>
          <Input
            type="number"
            min="0"
            value={variant.stockOnBackorder}
            onChange={e => updateVariant({ stockOnBackorder: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
    </div>
  );
}
