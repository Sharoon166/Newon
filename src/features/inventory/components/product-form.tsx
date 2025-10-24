'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, FolderTree, Layers, Loader2, Package2, Plus, Save, Settings, Trash2, X } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AttributesManager } from './attributes/attributes-manager';
import { VariantsManager } from './variants/variants-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { createProduct, updateProduct, deleteProduct } from '../actions';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';

// type FormMode = 'create' | 'edit';

export interface ProductAttribute {
  id: string;
  name: string;
  values: string[];
  isRequired: boolean;
  order: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  purchasePrice: number;
  retailPrice: number;
  wholesalePrice: number;
  shippingCost: number;
  availableStock: number;
  stockOnBackorder: number;
  image?: string;
}

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
  // image: z.url("Please enter a valid URL").optional(),
  image: z.url('Please enter a valid URL').optional().or(z.literal(''))
});

const productFormSchema = z
  .object({
    name: z.string().min(2, {
      message: 'Product name must be at least 2 characters.'
    }),
    description: z.string().optional(),
    supplier: z.string().min(1, 'Enter supplier information'),
    location: z.string().optional(),
    categories: z.array(z.string()),
    image: z.any().optional(),
    attributes: z.array(attributeSchema),
    variants: z.array(variantSchema)
  })
  .refine(
    data => {
      // If there are no attributes, we should have exactly one variant
      if (data.attributes.length === 0 && data.variants.length !== 1) {
        return false;
      }
      return true;
    },
    {
      message: 'Products without attributes must have exactly one variant',
      path: ['variants']
    }
  );

// Form values type
type ProductFormValues = z.infer<typeof productFormSchema>;

const defaultValues: ProductFormValues = {
  name: '',
  supplier: '',
  description: '',
  location: '',
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
      stockOnBackorder: 0
    }
  ]
};

const allCategories = [
  { id: 'Lighting', name: 'Lighting' },
  { id: 'Bulbs', name: 'Bulbs' },
  { id: 'Lamps', name: 'Lamps' },
  { id: 'LED', name: 'LED' },
  { id: 'String', name: 'String' },
  { id: 'Wireless', name: 'Wireless' },
  { id: 'Indoor', name: 'Indoor' },
  { id: 'Outdoor', name: 'Outdoor' },
  { id: 'Holiday', name: 'Holiday' },
  { id: 'Seasonal', name: 'Seasonal' }
];

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

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      ...defaultValues,
      ...initialData,
      // Ensure variants is properly merged
      variants: initialData?.variants?.length ? initialData.variants : defaultValues.variants
    },
    mode: 'onChange'
  });

  // // Handle image preview
  // const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0]
  //   if (file) {
  //     const reader = new FileReader()
  //     reader.onloadend = () => {
  //       setPreviewImage(reader.result as string)
  //     }
  //     reader.readAsDataURL(file)
  //   }
  // }, [])

  // Initialize form with initialData when it changes
  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const attributes = form.watch('attributes') || [];

  const onSubmit: SubmitHandler<ProductFormValues> = async (data: ProductFormValues) => {
    setIsLoading(true);
    try {
      const formData = {
        ...data,
        // Ensure location is included
        location: data.location || '',
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
            attributes: v.attributes || {}
          }))
          : []
      };
      if (mode === 'edit' && initialData?._id) {
        await updateProduct(initialData._id, formData);
      } else {
        await createProduct(formData);
      }

      router.push('/inventory');
      router.refresh(); // Refresh the page to show updated data
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
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Product Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                  <FormField
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
                  />
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
                        {allCategories.map(category => {
                          const isSelected = field.value?.includes(category.id);
                          return (
                            <Button
                              key={category.id}
                              type="button"
                              onClick={() => {
                                const currentCategories = field.value || [];
                                const newCategories = !isSelected
                                  ? [...currentCategories, category.id]
                                  : currentCategories.filter(id => id !== category.id);
                                field.onChange(newCategories);
                              }}
                              className={`px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-2 ${isSelected ? 'bg-primary text-zinc-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                              {category.name}
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList>
                <TabsTrigger value="attributes" className="cursor-pointer">
                  <Settings />
                  Attributes
                </TabsTrigger>
                <TabsTrigger
                  value="variants"
                  disabled={!attributes || attributes.length === 0 || attributes.some(attr => attr.values.length === 0)}
                  className="cursor-pointer"
                >
                  <Layers />
                  Variants
                </TabsTrigger>
              </TabsList>

              <TabsContent value="attributes">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Product Attributes</h3>
                    <p className="text-sm text-muted-foreground">
                      Define the attributes that will be used to create product variants (e.g., Color, Size, etc.)
                    </p>
                  </div>
                </div>
                <Card className="p-6">
                  <AttributesManager
                    attributes={form.watch('attributes')}
                    onChange={updatedAttributes => {
                      form.setValue('attributes', updatedAttributes);
                    }}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="variants">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium">Product Variants</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage the different variants of your product based on the attributes you&apos;ve defined.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentVariants = form.getValues('variants');
                      const newVariant: ProductVariant = {
                        id: `var_${crypto.randomUUID()}`,
                        sku: '',
                        attributes: {},
                        purchasePrice: 0,
                        retailPrice: 0,
                        wholesalePrice: 0,
                        shippingCost: 0,
                        availableStock: 0,
                        stockOnBackorder: 0
                      };
                      form.setValue('variants', [...currentVariants, newVariant]);
                    }}
                    className="gap-1"
                    disabled={form.watch('attributes').length === 0}
                  >
                    <Plus className="h-4 w-4" />
                    Add Variant
                  </Button>
                </div>
                <Card className="p-6">
                  <div className="space-y-4">
                    <VariantsManager
                      variants={form.watch('variants')}
                      attributes={form.watch('attributes')}
                      onChange={variants => {
                        form.setValue('variants', variants);
                      }}
                    />
                  </div>
                </Card>
              </TabsContent>
            </Tabs>

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
        </form>
      </Form>
    </>
  );
}
