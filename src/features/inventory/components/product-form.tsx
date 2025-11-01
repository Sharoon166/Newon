'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, FolderTree, Layers, Loader2, MapPin, Package, Package2, Save, Settings, ShoppingCart, Trash2, X } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AttributesManager } from './attributes/attributes-manager';
import { VariantsManager } from './variants/variants-manager';
import { LocationsManager } from './locations/locations-manager';
import { PurchasesManager } from '@/features/purchases/components/purchases-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { createProduct, updateProduct, deleteProduct } from '../actions';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { categories } from '../data';

// Attribute schema defines the structure of product attributes
const attributeSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1, 'Attribute name is required'),
    values: z.array(z.string()).min(1, 'At least one value is required'),
    isRequired: z.boolean(),
    order: z.number()
  })
  .superRefine((data, ctx) => {
    // Ensure attribute values are unique
    const values = data.values;
    if (values.length !== new Set(values).size) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Attribute values must be unique',
        path: ['values']
      });
    }
  });

// Variant schema with validation for attributes based on product attributes
const variantSchema = z.object({
  id: z.string(),
  sku: z.string().min(3, 'SKU must be at least 3 characters'),
  attributes: z.record(z.string(), z.string()),
  purchasePrice: z.number().min(0, 'Must be a positive number'),
  retailPrice: z.number().min(0, 'Must be a positive number'),
  wholesalePrice: z.number().min(0, 'Must be a positive number'),
  shippingCost: z.number().min(0, 'Must be a positive number'),
  availableStock: z.number().min(0, 'Must be a positive number'),
  stockOnBackorder: z.number().min(0, 'Must be a positive number'),
  inventory: z.array(z.object({
    locationId: z.string(),
    availableStock: z.number().min(0, 'Must be a positive number'),
    backorderStock: z.number().min(0, 'Must be a positive number')
  })),
  image: z.url('Please enter a valid URL').optional().or(z.literal(''))
});

const productFormSchema = z
  .object({
    name: z.string().min(2, {
      message: 'Product name must be at least 2 characters.'
    }),
    description: z.string().optional(),
    supplier: z.string().min(1, 'Enter supplier information'),
    locations: z.array(z.object({
      id: z.string(),
      name: z.string().min(1, 'Location name is required'),
      address: z.string().optional(),
      isActive: z.boolean(),
      order: z.number()
    })),
    categories: z.array(z.string()),
    image: z.any().optional(),
    hasVariants: z.boolean(),
    attributes: z.array(attributeSchema),
    variants: z.array(variantSchema)
  })
  .superRefine((data, ctx) => {
    // For simple products (no variants), ensure there's exactly one variant
    if (!data.hasVariants && data.variants.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Simple products must have exactly one variant',
        path: ['variants']
      });
    }

    // For products with variants, ensure attributes are defined
    if (data.hasVariants && data.attributes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Products with variants must have at least one attribute',
        path: ['attributes']
      });
    }
  });

// Form values type

type ProductFormValues = z.infer<typeof productFormSchema>;

const defaultValues: ProductFormValues = {
  name: '',
  supplier: '',
  description: '',
  hasVariants: false,
  locations: [
    {
      id: 'default_loc',
      name: 'Default Location',
      address: '',
      isActive: true,
      order: 0
    }
  ],
  categories: [],
  attributes: [],
  variants: [
    {
      id: `var_${crypto.randomUUID()}`,
      sku: '',
      attributes: {},
      purchasePrice: 0,
      retailPrice: 0,
      wholesalePrice: 0,
      shippingCost: 0,
      availableStock: 0,
      stockOnBackorder: 0,
      inventory: [
        {
          locationId: 'default_loc',
          availableStock: 0,
          backorderStock: 0
        }
      ]
    }
  ]
};

interface ProductFormProps {
  mode?: 'create' | 'edit';
  initialData?: ProductFormValues & {
    _id: string;
  };
}

export function ProductForm({ mode = 'create', initialData }: ProductFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('attributes');

  const [showDeleteConfirmationDialog, setShowDeleteConfirmationDialog] = useState(false);
  const [createMoreThanOne, setCreateMoreThanOne] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      ...defaultValues,
      ...initialData,
      hasVariants: initialData?.hasVariants ?? defaultValues.hasVariants ?? false
    },

    mode: 'onChange'
  });

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const attributes = form.watch('attributes') || [];

  const { formState, reset, setValue, watch } = form;

  // Watch locations to update variants when locations change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const locations = watch('locations') || [];

  // Update variants when locations change to ensure all variants have inventory for all locations
  useEffect(() => {
    const currentVariants = [...(watch('variants') || [])];
    const updatedVariants = currentVariants.map(variant => {
      const currentInventory = variant.inventory || [];
      const updatedInventory = locations.map(location => {
        const existing = currentInventory.find(i => i.locationId === location.id);
        return existing || {
          locationId: location.id,
          availableStock: 0,
          backorderStock: 0
        };
      });

      return {
        ...variant,
        inventory: updatedInventory
      };
    });

    if (JSON.stringify(updatedVariants) !== JSON.stringify(currentVariants)) {
      setValue('variants', updatedVariants);
    }
  }, [locations, setValue, watch]);

  // const hasVariants = useWatch({ control: form.control, name: 'hasVariants' });
  const hasVariants = watch('hasVariants');

  useEffect(() => {
    // If switching to simple product and no variant exists, add a default variant
    if (!hasVariants && form.getValues('variants').length === 0) {
      form.setValue('variants', [{
        id: `var_${Date.now()}`,
        sku: '',
        attributes: {},
        purchasePrice: 0,
        retailPrice: 0,
        wholesalePrice: 0,
        shippingCost: 0,
        availableStock: 0,
        stockOnBackorder: 0,
        inventory: []
      }]);
    }
  }, [hasVariants, form]);

  const onSubmit: SubmitHandler<ProductFormValues> = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      const formData = {
        ...data,
        // Ensure variants is always an array
        variants: Array.isArray(data.variants)
          ? data.variants.map(v => ({
            ...v,
            // Ensure required fields have default values
            purchasePrice: v.purchasePrice || 0,
            retailPrice: v.retailPrice || 0,
            wholesalePrice: v.wholesalePrice || 0,
            shippingCost: v.shippingCost || 0,
            availableStock: v.availableStock || 0,
            stockOnBackorder: v.stockOnBackorder || 0,
            // Clean up attributes
            attributes: v.attributes || {},
          }))
          : []
      };
      if (mode === 'edit' && initialData?._id) {
        await updateProduct(initialData._id, formData);
      } else {
        await createProduct(formData);
      }

      if (!createMoreThanOne) {
        if (mode === 'edit' && initialData?._id) {
          router.push(`/inventory/${initialData._id}`);
        } else {
          router.push('/inventory');
        }
        router.refresh(); // Refresh the page to show updated data
      } else {
        reset()
      }
    } catch (error) {
      console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} product:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCurrentProduct = async () => {
    if (!initialData?._id) return;
    await deleteProduct(initialData._id);
    router.push('/inventory');
    // router.refresh();
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-8">
            <div className="flex justify-end">
              <FormField
                control={form.control}
                name="hasVariants"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormLabel className="text-sm font-medium">Product with Variants</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          const currentVariants = form.getValues('variants');
                          field.onChange(checked);
                          
                          if (checked && currentVariants.length === 0 && mode === 'edit' && initialData && initialData?.variants?.length > 0) {
                            // When enabling variants in edit mode, use the existing variant data
                            form.setValue('variants', initialData.variants);
                          } else if (!checked) {
                            // Reset attributes when switching to simple product
                            form.setValue('attributes', []);
                            
                            // If no variants exist, add a default one for simple product
                            if (currentVariants.length === 0) {
                              form.setValue('variants', [{
                                id: `var_${Date.now()}`,
                                sku: '',
                                attributes: {},
                                purchasePrice: 0,
                                retailPrice: 0,
                                wholesalePrice: 0,
                                shippingCost: 0,
                                availableStock: 0,
                                stockOnBackorder: 0,
                                inventory: []
                              }]);
                            }
                          }
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="flex flex-wrap justify-between items-center gap-6">
                <div className="space-y-2">
                  <h1 className="text-4xl lg:text-8xl font-extrabold tracking-tight text-balance text-primary">
                    {mode === 'edit' ? 'Edit' : 'Add'} Product
                  </h1>
                  <p className="text-muted-foreground">
                    {mode === 'edit' ? 'Update the product details' : 'Add a new product to your inventory'}
                  </p>
                </div>
                {mode == "edit" && <Button type="button" variant="destructive" className='w-full lg:max-w-sm lg:mx-auto' onClick={() => setShowDeleteConfirmationDialog(true)}> <Trash2 /> Delete Product</Button>}
                <ConfirmationDialog
                  open={showDeleteConfirmationDialog}
                  onOpenChange={setShowDeleteConfirmationDialog}
                  title="Are you sure you want to delete this product?"
                  description="This product will be deleted from your inventory and all its variants will be removed. This action cannot be undone."
                  confirmText="Delete"
                  variant="destructive"
                  onConfirm={async () => {
                    await deleteCurrentProduct();
                    toast.success("Product deleted successfully")
                  }}
                  icon={<AlertCircle className="h-12 w-12 text-destructive" />}
                />
              </div>
              {/* Product Information */}
              <Card className="p-6 lg:w-1/2">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Package2 />
                  Product Information
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Product Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter product name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter product description" className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Supplier <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter supplier info" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Warehouse A, Shelf 2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  /> */}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <CardTitle className="flex items-center gap-2">
                <FolderTree size={16} />
                <span>Categories</span>
              </CardTitle>
              <CardDescription>Choose the categories for this product</CardDescription>
              <FormField
                control={form.control}
                name="categories"
                render={({ field }) => (
                  <FormItem>
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2 mt-2">
                        {categories.map(category => {
                          const isSelected = field.value?.includes(category);
                          return (
                            <Button
                              key={category}
                              type="button"
                              onClick={() => {
                                const currentCategories = field.value || [];
                                const newCategories = !isSelected
                                  ? [...currentCategories, category]
                                  : currentCategories.filter(id => id !== category);
                                field.onChange(newCategories);
                              }}
                              className={`px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-2 ${isSelected ? 'bg-primary text-zinc-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                              {category}
                              {isSelected && <X className="h-3.5 w-3.5" />}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
              <TabsList className='h-max'>
                <TabsTrigger value="attributes" >
                  <Layers className="h-4 w-4 max-sm:size-5" />
                  <span className="max-sm:hidden">Attributes</span>
                </TabsTrigger>
                <TabsTrigger value="locations">
                  <MapPin className="h-4 w-4 max-sm:size-5" />
                  <span className="max-sm:hidden">Locations</span>
                </TabsTrigger>
                <TabsTrigger value="variants">
                  {hasVariants ? <>
                    <Package className="h-4 w-4 max-sm:size-5" />
                    <span className="max-sm:hidden">Variants</span>
                  </> : <>
                    <Package2 className="h-4 w-4 max-sm:size-5" />
                    <span className="max-sm:hidden">Product info</span>
                  </>}
                </TabsTrigger>
                {mode === 'edit' && (
                  <TabsTrigger value="purchases" disabled={formState.isSubmitting}>
                    <ShoppingCart className="h-4 w-4 max-sm:size-5" />
                    <span className="max-sm:hidden">Purchases</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="settings" disabled={formState.isSubmitting}>
                  <Settings className="h-4 w-4 max-sm:size-5" />
                  <span className="max-sm:hidden">Settings</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="attributes" className="space-y-4">
                <Card className="p-6">
                  <CardTitle>Product Attributes</CardTitle>
                  <CardDescription>
                    Define the attributes that will be used to create product variants.
                  </CardDescription>
                  <AttributesManager
                    attributes={attributes}
                    onChange={(updatedAttributes) => setValue('attributes', updatedAttributes)}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="locations" className="space-y-4">
                <Card className="p-6">
                  <CardTitle>Inventory Locations</CardTitle>
                  <CardDescription>
                    Manage the locations where this product will be stocked.
                  </CardDescription>
                  <LocationsManager
                    locations={watch('locations') || []}
                    onChange={(updatedLocations) => setValue('locations', updatedLocations)}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="variants">
                <div className="flex items-center justify-between mb-4">
                  {hasVariants ? <div>
                    <h3>Product Variants</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure different variants of this product with their own pricing and stock.
                    </p>
                  </div> : <div>
                    <h3>Product Information</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Configure the product information.
                    </p>
                  </div>}
                </div>
                <VariantsManager
                  attributes={form.watch('attributes')}
                  variants={form.watch('variants')}
                  locations={form.watch('locations')}
                  onChange={(variants) => form.setValue('variants', variants)}
                  isSimpleProduct={!hasVariants}
                  productId={mode === 'edit' ? initialData?._id : undefined}
                />
              </TabsContent>

              {mode === 'edit' && initialData?._id && (
                <TabsContent value="purchases" className="space-y-4">
                  <Card className="p-6">
                    <CardTitle>Purchase Management</CardTitle>
                    <CardDescription>
                      Track and manage purchase history for product variants. Purchases are tracked per variant and help track incoming stock and costs.
                    </CardDescription>
                    <PurchasesManager
                      productId={initialData._id}
                      variants={watch('variants') || []}
                      locations={watch('locations') || []}
                      suppliers={watch('supplier') ? [watch('supplier')] : []}
                    />
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="settings">
                <Card className="p-6">
                  It&apos;s a work in progress.
                </Card>
              </TabsContent>
            </Tabs>

            <div className={cn("flex justify-between gap-4", {
              "justify-end": mode == "edit"
            })}>
              {mode == "create" && <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Switch id='create-more' checked={createMoreThanOne} onCheckedChange={setCreateMoreThanOne} />
                    <Label htmlFor='create-more'>Create more than one </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent className='max-w-48'>
                  <p>When enabled, you can create multiple products at once</p>
                </TooltipContent>
              </Tooltip>}

              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push('/inventory')} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {mode === 'edit' ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {mode === 'edit' ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
          
        </form>
      </Form>
    </>
  );
}
