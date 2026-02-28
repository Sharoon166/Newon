'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Package, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { createVirtualProduct, updateVirtualProduct } from '../actions';
import type { VirtualProduct } from '../types';
import type { EnhancedVariants } from '@/features/inventory/types';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
import { formatCurrency } from '@/lib/utils';
import { EXPENSE_CATEGORIES } from '@/features/expenses/types';
import type { ExpenseCategory } from '@/features/expenses/types';

const virtualProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  components: z.array(z.object({
    productId: z.string(),
    variantId: z.string(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    productName: z.string(),
    sku: z.string(),
    image: z.string().optional(),
    availableStock: z.number().optional()
  })).min(1, 'At least one component is required'),
  customExpenses: z.array(z.object({
    name: z.string().min(1, 'Expense name is required'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    category: z.enum(['materials', 'labor', 'equipment', 'transport', 'rent', 'utilities', 'fuel', 'maintenance', 'marketing', 'office-supplies', 'professional-services', 'insurance', 'taxes', 'salary', 'other']),
    description: z.string().optional()
  })),
  basePrice: z.number().min(0.01, 'Base price must be greater than 0'),
  categories: z.array(z.string()),
  disabled: z.boolean()
});

type VirtualProductFormValues = z.infer<typeof virtualProductSchema>;

interface VirtualProductFormProps {
  initialData?: VirtualProduct;
  variants: EnhancedVariants[];
  mode: 'create' | 'edit';
}

export function VirtualProductForm({ initialData, variants, mode }: VirtualProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('other');
  const [expenseDescription, setExpenseDescription] = useState('');

  const form = useForm<VirtualProductFormValues>({
    resolver: zodResolver(virtualProductSchema),
    defaultValues: {
      name: initialData?.name || '',
      sku: initialData?.sku || '',
      description: initialData?.description || '',
      components: initialData?.components || [],
      customExpenses: initialData?.customExpenses || [],
      basePrice: initialData?.basePrice || 0,
      categories: initialData?.categories || [],
      disabled: initialData?.disabled || false
    }
  });

  // Filter variants based on search query - not needed with Combobox items prop
  const availableVariants = variants.filter(v => !v.disabled);

  const handleAddComponent = (variantKey: string) => {
    // variantKey format: "productName - sku"
    const variant = availableVariants.find(v => 
      `${v.productName} - ${v.sku}` === variantKey
    );
    
    if (!variant) return;

    const currentComponents = form.getValues('components');
    
    // Check if already added
    if (currentComponents.some(c => c.productId === variant.productId && c.variantId === variant.id)) {
      toast.error('Component already added');
      return;
    }

    form.setValue('components', [
      ...currentComponents,
      {
        productId: variant.productId,
        variantId: variant.id,
        quantity: 1,
        productName: variant.productName,
        sku: variant.sku,
        image: variant.image || variant.imageFile?.cloudinaryUrl,
        availableStock: variant.availableStock
      }
    ]);
  };

  const handleRemoveComponent = (index: number) => {
    const currentComponents = form.getValues('components');
    form.setValue('components', currentComponents.filter((_, i) => i !== index));
  };

  const handleComponentQuantityChange = (index: number, quantity: number) => {
    if (quantity < 1) return;
    
    const currentComponents = form.getValues('components');
    form.setValue('components', currentComponents.map((comp, i) =>
      i === index ? { ...comp, quantity } : comp
    ));
  };

  const handleAddCategory = () => {
    if (!categoryInput.trim()) return;
    
    const currentCategories = form.getValues('categories');
    
    if (currentCategories.includes(categoryInput.trim())) {
      toast.error('Category already added');
      return;
    }

    form.setValue('categories', [...currentCategories, categoryInput.trim()]);
    setCategoryInput('');
  };

  const handleRemoveCategory = (category: string) => {
    const currentCategories = form.getValues('categories');
    form.setValue('categories', currentCategories.filter(c => c !== category));
  };

  const handleAddExpense = () => {
    if (!expenseName.trim()) {
      toast.error('Please enter expense name');
      return;
    }
    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Expense amount must be greater than 0');
      return;
    }

    const currentExpenses = form.getValues('customExpenses');
    form.setValue('customExpenses', [
      ...currentExpenses,
      {
        name: expenseName.trim(),
        amount,
        category: expenseCategory,
        description: expenseDescription.trim()
      }
    ]);

    // Reset expense form
    setExpenseName('');
    setExpenseAmount('');
    setExpenseCategory('other');
    setExpenseDescription('');
  };

  const handleRemoveExpense = (index: number) => {
    const currentExpenses = form.getValues('customExpenses');
    form.setValue('customExpenses', currentExpenses.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: VirtualProductFormValues) => {
    setLoading(true);
    try {
      const submitData = {
        ...data,
        description: data.description || ''
      };
      
      if (mode === 'create') {
        await createVirtualProduct(submitData);
        toast.success('Virtual product created successfully');
      } else {
        await updateVirtualProduct(initialData!._id!, submitData);
        toast.success('Virtual product updated successfully');
      }
      router.push('/virtual-products');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save virtual product');
    } finally {
      setLoading(false);
    }
  };

  const components = form.watch('components');
  const customExpenses = form.watch('customExpenses');
  const categories = form.watch('categories');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Product Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter product name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    SKU <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter SKU" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter product description" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="basePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Base Price <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Categories</h3>
          <div className="flex gap-2 mb-3">
            <Input
              value={categoryInput}
              onChange={e => setCategoryInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
              placeholder="Add category"
            />
            <Button type="button" onClick={handleAddCategory}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Badge key={category} variant="secondary" className="gap-1">
                {category}
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(category)}
                  className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Components <span className="text-destructive">*</span>
          </h3>
          <div className="space-y-4">
            <Combobox
              items={availableVariants}
              itemToStringValue={(variant: EnhancedVariants) => `${variant.productName} - ${variant.sku}`}
              onInputValueChange={handleAddComponent}
              autoHighlight
            >
              <ComboboxInput
                placeholder="Search and select product variant..."
                className="w-full"
              />
              <ComboboxContent>
                <ComboboxEmpty>No variants found</ComboboxEmpty>
                <ComboboxList>
                  {(variant: EnhancedVariants) => (
                    <ComboboxItem
                      key={`${variant.productId}-${variant.id}`}
                      value={`${variant.productName} - ${variant.sku}`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Avatar className="h-8 w-8 rounded-md">
                          <AvatarImage 
                            src={variant.image || variant.imageFile?.cloudinaryUrl} 
                            alt={variant.productName}
                            className="object-contain"
                          />
                          <AvatarFallback className="rounded-md text-xs">
                            {variant.productName?.charAt(0) || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{variant.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            {variant.sku} • Stock: {variant.availableStock}
                          </div>
                        </div>
                      </div>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>

            {components.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No components added yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {components.map((component, index) => (
                  <Card key={`${component.productId}-${component.variantId}`} className="p-4">
                    <div className="flex max-xs:flex-col justify-between gap-4">
                      <div className="flex gap-2">
                        <Avatar className="h-12 w-12 rounded-md">
                          <AvatarImage src={component.image} alt={component.productName} className="object-contain" />
                          <AvatarFallback className="rounded-md">
                            {component.productName?.charAt(0) || 'P'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{component.productName}</div>
                          <div className="text-sm text-muted-foreground">SKU: {component.sku}</div>
                          <div className="text-xs text-muted-foreground">
                            Available: {component.availableStock || 0}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`qty-${index}`} className="text-sm whitespace-nowrap">
                            Qty:
                          </Label>
                          <Input
                            id={`qty-${index}`}
                            type="number"
                            min="1"
                            value={component.quantity}
                            onChange={e => handleComponentQuantityChange(index, parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveComponent(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {form.formState.errors.components && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.components.message}</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Custom Expenses</h3>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expenseName">Expense Name</Label>
                <Input
                  id="expenseName"
                  value={expenseName}
                  onChange={e => setExpenseName(e.target.value)}
                  placeholder="e.g., Assembly Labor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseAmount">Amount</Label>
                <Input
                  id="expenseAmount"
                  type="number"
                  step="0.01"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseCategory">Category</Label>
                <Select 
                  value={expenseCategory} 
                  onValueChange={(value) => setExpenseCategory(value as ExpenseCategory)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseDescription">Description (Optional)</Label>
                <Input
                  id="expenseDescription"
                  value={expenseDescription}
                  onChange={e => setExpenseDescription(e.target.value)}
                  placeholder="Additional details"
                />
              </div>
            </div>
            <Button type="button" onClick={handleAddExpense} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>

            {customExpenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No custom expenses added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customExpenses.map((expense, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{expense.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)} • {formatCurrency(expense.amount)}
                          {expense.description && ` • ${expense.description}`}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveExpense(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
                <div className="pt-2 border-t">
                  <div className="flex justify-between font-semibold">
                    <span>Total Custom Expenses:</span>
                    <span>{formatCurrency(customExpenses.reduce((sum, e) => sum + e.amount, 0))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : mode === 'create' ? 'Create Virtual Product' : 'Update Virtual Product'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
