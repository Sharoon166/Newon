'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, Package, Plus, Minus, Info, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { EnhancedVirtualProduct, CustomExpense } from '@/features/virtual-products/types';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/features/expenses/types';
import { toast } from 'sonner';

interface VirtualProductSelectorProps {
  label?: string;
  virtualProducts: EnhancedVirtualProduct[];
  currentItems?: Array<{
    virtualProductId?: string;
    variantId?: string;
    quantity: number;
    componentBreakdown?: Array<{
      productId: string;
      variantId: string;
      productName: string;
      sku: string;
      quantity: number;
      purchaseId: string;
      unitCost: number;
      totalCost: number;
    }>;
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
    originalRate?: number;
    componentBreakdown?: Array<{
      productId: string;
      variantId: string;
      productName: string;
      sku: string;
      quantity: number;
      purchaseId: string;
      unitCost: number;
      totalCost: number;
    }>;
    customExpenses?: Array<{
      name: string;
      amount: number;
      category: ExpenseCategory;
      description?: string;
    }>;
    totalComponentCost?: number;
    totalCustomExpenses?: number;
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
  const [selectedProduct, setSelectedProduct] = useState<EnhancedVirtualProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customPrice, setCustomPrice] = useState(0);
  const [editableExpenses, setEditableExpenses] = useState<CustomExpense[]>([]);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<ExpenseCategory>('other');
  const [newExpenseDescription, setNewExpenseDescription] = useState('');

  // Calculate adjusted available quantity for virtual products
  // considering components used in current invoice items
  const getAdjustedAvailableQuantity = useCallback(
    (product: EnhancedVirtualProduct) => {
      // Server already calculated availableQuantity correctly
      // No need for client-side adjustment
      return product.availableQuantity;
    },
    []
  );

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

  const handleOpenDialog = (product: EnhancedVirtualProduct) => {
    const quantity = getProductQuantity(product.id!);
    const available = product.availableQuantity;

    // Check stock availability
    if (!skipStockValidation && available < quantity) {
      toast.error(`Insufficient stock. Available: ${available}, Requested: ${quantity}`);
      return;
    }

    // Don't check if already added - allow updating quantity like product selector

    setSelectedProduct(product);
    setCustomPrice(product.basePrice);
    setEditableExpenses([...product.customExpenses]);
    setDialogOpen(true);
  };

  const handleAddExpense = () => {
    if (!newExpenseName.trim()) {
      toast.error('Please enter expense name');
      return;
    }
    const amount = parseFloat(newExpenseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Expense amount must be greater than 0');
      return;
    }

    setEditableExpenses(prev => [
      ...prev,
      {
        name: newExpenseName.trim(),
        amount: amount,
        category: newExpenseCategory,
        description: newExpenseDescription.trim()
      }
    ]);

    // Reset form
    setNewExpenseName('');
    setNewExpenseAmount('');
    setNewExpenseCategory('other');
    setNewExpenseDescription('');
  };

  const handleRemoveExpense = (index: number) => {
    setEditableExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmAdd = async () => {
    if (!selectedProduct) return;

    const quantity = getProductQuantity(selectedProduct.id!);

    if (customPrice <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    // Calculate FIFO costs for components
    try {
      const { calculateVirtualProductFIFOCost } = await import('@/features/virtual-products/utils/calculate-fifo-cost');

      const costBreakdown = await calculateVirtualProductFIFOCost(selectedProduct.id!, quantity, currentItems);

      if (!costBreakdown.canFulfill) {
        toast.error('Insufficient stock for components', {
          description: costBreakdown.errors.join(', ')
        });
        return;
      }

      // Populate component names and SKUs
      const componentBreakdownWithDetails = costBreakdown.componentBreakdown.map(comp => {
        const componentInfo = selectedProduct.components.find(
          c => c.productId === comp.productId && c.variantId === comp.variantId
        );
        return {
          ...comp,
          productName: componentInfo?.productName || 'Unknown',
          sku: componentInfo?.sku || 'N/A'
        };
      });

      const totalComponentCost = costBreakdown.totalComponentCost;
      const totalCustomExpenses = editableExpenses.reduce((sum, exp) => sum + exp.amount, 0) * quantity;

      onAddItem({
        virtualProductId: selectedProduct.id!,
        isVirtualProduct: true,
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        description: selectedProduct.name,
        quantity,
        rate: customPrice,
        saleRate: customPrice,
        originalRate: totalComponentCost + totalCustomExpenses,
        // Add breakdown data
        componentBreakdown: componentBreakdownWithDetails,
        customExpenses: editableExpenses.map(exp => ({
          ...exp,
          amount: exp.amount * quantity // Multiply by quantity
        })),
        totalComponentCost,
        totalCustomExpenses
      });

      // Reset and close
      setQuantities(prev => ({ ...prev, [selectedProduct.id!]: 1 }));
      setDialogOpen(false);
      setSelectedProduct(null);

      // Check if product already exists in invoice to show appropriate message
      const existingItem = currentItems.find(item => item.virtualProductId === selectedProduct.id);
      if (existingItem) {
        toast.success(`Updated ${selectedProduct.name} quantity in invoice`);
      } else {
        toast.success(`Added ${selectedProduct.name} to invoice`);
      }
    } catch (error) {
      console.error('Error calculating FIFO cost:', error);
      toast.error('Failed to calculate component costs');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 bg-background">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search virtual products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px] bg-background">
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
      </div>

      <div className="@container">
        <div className="grid lg:@xl:grid-cols-2 xl:@xl:grid-cols-2 gap-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No virtual products found</p>
            </div>
          ) : (
            filteredProducts.map(product => {
              const quantity = getProductQuantity(product.id!);
              const available = getAdjustedAvailableQuantity(product);
              const isLowStock = available < 5;
              const isOutOfStock = available === 0;
              const inInvoice = currentItems.find(item => item.virtualProductId === product.id);
              const quantityInInvoice = inInvoice?.quantity || 0;
              return (
                <Card key={product.id} className="p-4 hover:shadow-md transition-shadow justify-between">
                  <div className="flex gap-4">
                    {/* Left side - Product info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex  items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base truncate">{product.name}</h4>
                          <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
                          {quantityInInvoice > 0 && (
                            <Badge variant="outline" className="mt-1 text-xs text-blue-600 border-blue-600">
                              {quantityInInvoice} in invoice
                            </Badge>
                          )}
                        </div>
                      </div>
                      {product.categories && product.categories.length > 0 && (
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
                      )}
                    </div>
                    {/* Right side - Price, stock, and actions */}
                    <div className="flex gap-2">
                      <div className="text-right">
                        <div className=" sm:text-lg font-bold">{formatCurrency(product.basePrice)}</div>
                        <Badge
                          variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'default'}
                          className="mt-1"
                        >
                          {available} available
                        </Badge>
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
                            {product.components.map((comp, idx) => {
                              // Calculate component usage in current invoice
                              const componentUsage = currentItems.reduce((total, item) => {
                                if (item.variantId === comp.variantId) {
                                  return total + (item.quantity || 0);
                                }
                                if (item.virtualProductId && item.componentBreakdown) {
                                  const breakdown = item.componentBreakdown;
                                  const matchingComponent = breakdown.find(b => b.variantId === comp.variantId);
                                  if (matchingComponent) {
                                    return total + matchingComponent.quantity;
                                  }
                                }
                                return total;
                              }, 0);
                              const remainingStock = comp.availableStock - componentUsage;
                              // Check if this virtual product itself is in the invoice
                              const thisVPInInvoice = currentItems.find(item => item.virtualProductId === product.id);
                              const thisVPUsage = thisVPInInvoice ? (thisVPInInvoice.quantity || 0) * comp.quantity : 0;
                              return (
                                <div key={idx} className="text-xs border-b pb-2 last:border-0">
                                  <div className="font-medium">{comp.productName}</div>
                                  <div className="text-muted-foreground">SKU: {comp.sku}</div>
                                  <div className="flex justify-between mt-1">
                                    <span>Qty per unit: {comp.quantity}</span>
                                    <span>
                                      Stock: {remainingStock}
                                      {componentUsage > 0 && (
                                        <span className="text-orange-600">
                                          {' '}
                                          ({componentUsage} in invoice
                                          {thisVPUsage > 0 && `, ${thisVPUsage} from this VP`})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                            {product.customExpenses && product.customExpenses.length > 0 && (
                              <>
                                <h4 className="font-semibold text-sm mt-3">Custom Expenses</h4>
                                {product.customExpenses.map((exp, idx) => (
                                  <div key={idx} className="text-xs border-b pb-2 last:border-0">
                                    <div className="font-medium">{exp.name}</div>
                                    <div className="flex justify-between mt-1">
                                      <span className="text-muted-foreground capitalize">{exp.category}</span>
                                      <span>{formatCurrency(exp.amount)}</span>
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                            <div className="pt-2 border-t space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Est. Component Cost:</span>
                                <span>{formatCurrency(product.estimatedComponentCost || 0)}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Custom Expenses:</span>
                                <span>{formatCurrency(product.totalCustomExpenses || 0)}</span>
                              </div>
                              <div className="flex justify-between text-xs font-semibold">
                                <span>Est. Total Cost:</span>
                                <span>{formatCurrency(product.estimatedTotalCost || 0)}</span>
                              </div>
                              <div className="flex justify-between text-xs font-semibold text-green-600">
                                <span>Est. Profit:</span>
                                <span>{formatCurrency(product.estimatedProfit || 0)}</span>
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full">
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
                      <span className="px-3 text-sm font-medium min-w-8 text-center">{quantity}</span>
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
                      onClick={() => handleOpenDialog(product)}
                      disabled={isOutOfStock && !skipStockValidation}
                      className="grow"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {label}
                    </Button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Dialog for adding virtual product with editable expenses */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {label.replace('Add to', 'Add')} {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              {/* Component Breakdown */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Components (FIFO)</h4>
                <div className="space-y-2">
                  {selectedProduct.components.map((comp, idx) => (
                    <div key={idx} className="text-sm border rounded p-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{comp.productName}</span>
                        <span className="text-muted-foreground">SKU: {comp.sku}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>
                          Qty: {comp.quantity} × {getProductQuantity(selectedProduct.id!)}
                        </span>
                        <span>Stock: {comp.availableStock}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Expenses */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Custom Expenses</h4>
                <div className="space-y-2 mb-3">
                  {editableExpenses.map((expense, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{expense.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)} •{' '}
                            {formatCurrency(expense.amount)}
                            {expense.description && ` • ${expense.description}`}
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleRemoveExpense(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Add New Expense */}
                <div className="border rounded p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="expenseName" className="text-xs">
                        Name
                      </Label>
                      <Input
                        id="expenseName"
                        value={newExpenseName}
                        onChange={e => setNewExpenseName(e.target.value)}
                        placeholder="e.g., Extra Labor"
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expenseAmount" className="text-xs">
                        Amount
                      </Label>
                      <Input
                        id="expenseAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newExpenseAmount}
                        onChange={e => setNewExpenseAmount(e.target.value)}
                        className="h-8"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expenseCategory" className="text-xs">
                        Category
                      </Label>
                      <Select 
                        value={newExpenseCategory} 
                        onValueChange={(value) => setNewExpenseCategory(value as ExpenseCategory)}
                      >
                        <SelectTrigger className="h-8 w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="expenseDesc" className="text-xs">
                        Description
                      </Label>
                      <Input
                        id="expenseDesc"
                        value={newExpenseDescription}
                        onChange={e => setNewExpenseDescription(e.target.value)}
                        placeholder="Optional"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <Button type="button" onClick={handleAddExpense} variant="outline" size="sm" className="w-full">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Expense
                  </Button>
                </div>
              </div>

              {/* Cost Summary */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Component Cost:</span>
                  <span className="font-medium">{formatCurrency(selectedProduct.estimatedComponentCost)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Custom Expenses:</span>
                  <span className="font-medium">
                    {formatCurrency(editableExpenses.reduce((sum, e) => sum + e.amount, 0))}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span>Est. Total Cost:</span>
                  <span>
                    {formatCurrency(
                      selectedProduct.estimatedComponentCost + editableExpenses.reduce((sum, e) => sum + e.amount, 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Pricing */}
              <div className="border-t pt-3 space-y-3">
                <div>
                  <Label htmlFor="basePrice" className="text-sm">
                    Base Price (Reference)
                  </Label>
                  <Input
                    id="basePrice"
                    type="number"
                    value={selectedProduct.basePrice}
                    disabled
                    className="font-semibold"
                  />
                </div>
                <div>
                  <Label htmlFor="customPrice" className="text-sm">
                    Selling Price *
                  </Label>
                  <Input
                    id="customPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={customPrice}
                    onChange={e => setCustomPrice(parseFloat(e.target.value) || 0)}
                    placeholder="Enter selling price"
                  />
                </div>
                <div className="flex justify-between text-sm font-semibold text-green-600">
                  <span>Est. Profit:</span>
                  <span>
                    {formatCurrency(
                      customPrice -
                        (selectedProduct.estimatedComponentCost +
                          editableExpenses.reduce((sum, e) => sum + e.amount, 0))
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmAdd}>
              {label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
