'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDetails } from '@/features/projects/components/project-details';
import { ExpensesTable } from '@/features/projects/components/expenses-table';
import { AddExpenseDialog } from '@/features/projects/components/add-expense-dialog';
import { ProjectInventoryTable } from '@/features/projects/components/project-inventory-table';
import { ProjectInvoicesList } from '@/features/projects/components/project-invoices-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProjectAuditLogs } from '@/features/projects/components/project-audit-logs';
import { ConfirmationDialog } from '@/components/general/confirmation-dialog';
import { Plus, Pencil, ExternalLink, Package, Receipt, Save, X, FileText, Activity } from 'lucide-react';
import Link from 'next/link';
import { Project, InventoryItem, InventoryExpenseCategory } from '@/features/projects/types';
import type { Customer } from '@/features/customers/types';
import type { Invoice } from '@/features/invoices/types';
import type { EnhancedVirtualProduct } from '@/features/virtual-products/types';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';
import { EnhancedProductSelector } from '@/features/invoices/components/enhanced-product-selector';
import { addInventoryItem } from '@/features/projects/actions';
import { toast } from 'sonner';
import useBrandStore from '@/stores/useBrandStore';

interface ProjectPageClientProps {
  project: Project;
  customer?: Customer;
  projectId: string;
  userId: string;
  userName: string;
  userRole: string;
  canEdit: boolean;
  canAddExpense: boolean;
  canViewBudget: boolean;
  canViewInventory: boolean;
  canAddInventory: boolean;
  canGenerateInvoice: boolean;
  canViewAuditLogs: boolean;
  canViewClientFinancials: boolean;
  canViewProjectInvoices: boolean;
  projectInvoices: Invoice[];
  auditLogs: Array<{
    _id: string;
    projectId: string;
    action: 'project_created' | 'project_updated' | 'project_status_changed' | 'inventory_added' | 'inventory_updated' | 'inventory_deleted' | 'expense_added' | 'expense_updated' | 'expense_deleted' | 'staff_assigned' | 'staff_removed' | 'invoice_generated';
    userId: string;
    userName: string;
    userRole: string;
    description: string;
    metadata?: Record<string, string | number | boolean | undefined>;
    createdAt: string;
  }>;
  variants?: EnhancedVariants[];
  virtualProducts?: EnhancedVirtualProduct[];
  purchases?: Purchase[];
}

export function ProjectPageClient({
  project,
  customer,
  projectId,
  userId,
  userName,
  userRole,
  canEdit,
  canAddExpense,
  canViewBudget,
  canViewInventory,
  canAddInventory,
  canGenerateInvoice,
  canViewAuditLogs,
  canViewClientFinancials,
  canViewProjectInvoices,
  projectInvoices,
  auditLogs,
  variants = [],
  virtualProducts = [],
  purchases = []
}: ProjectPageClientProps) {
  const router = useRouter();
  const currentBrandId = useBrandStore(state => state.currentBrandId);
  const market = currentBrandId === 'waymor' ? 'waymor' : 'newon';
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [isAddingInventory, setIsAddingInventory] = useState(false);
  const [pendingInventory, setPendingInventory] = useState<InventoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleGenerateInvoice = () => {
    // Navigate to invoice form with project data
    router.push(`/invoices/new/from-project/${project.projectId}`);
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      planning: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Planning' },
      active: { bg: 'bg-green-50', text: 'text-green-700', label: 'Active' },
      'on-hold': { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'On Hold' },
      completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Completed' },
      cancelled: { bg: 'bg-red-50', text: 'text-red-700', label: 'Cancelled' }
    };
    return configs[status] || configs.planning;
  };

  const statusConfig = getStatusConfig(project.status);

  // Combine existing and pending inventory for display
  const allInventory = [...project.inventory, ...pendingInventory];

  // Convert inventory to format expected by selector
  const currentItems = allInventory.reduce(
    (acc, item) => {
      const existing = acc.find(i => {
        if (item.isVirtualProduct && item.virtualProductId) {
          return i.virtualProductId === item.virtualProductId;
        } else if (item.variantId) {
          return i.variantId === item.variantId && i.purchaseId === item.purchaseId;
        }
        return false;
      });

      if (existing) {
        existing.quantity += item.quantity;
      } else {
        acc.push({
          variantId: item.variantId,
          virtualProductId: item.virtualProductId,
          quantity: item.quantity,
          purchaseId: item.purchaseId,
          componentBreakdown: item.componentBreakdown
        });
      }

      return acc;
    },
    [] as Array<{
      variantId?: string;
      virtualProductId?: string;
      quantity: number;
      purchaseId?: string;
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
    }>
  );

  const handleAddInventoryItem = (item: {
    productId?: string;
    variantId?: string;
    virtualProductId?: string;
    isVirtualProduct?: boolean;
    productName: string;
    sku: string;
    description: string;
    quantity: number;
    rate: number;
    saleRate: number;
    originalRate?: number;
    purchaseId?: string;
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
      category: string;
      description?: string;
    }>;
    totalComponentCost?: number;
    totalCustomExpenses?: number;
  }) => {
    const pendingIndex = pendingInventory.findIndex(inv => {
      if (item.isVirtualProduct && item.virtualProductId) {
        return inv.virtualProductId === item.virtualProductId;
      } else if (item.variantId && item.purchaseId) {
        return inv.variantId === item.variantId && inv.purchaseId === item.purchaseId;
      }
      return false;
    });

    const savedIndex = project.inventory.findIndex(inv => {
      if (item.isVirtualProduct && item.virtualProductId) {
        return inv.virtualProductId === item.virtualProductId;
      } else if (item.variantId && item.purchaseId) {
        return inv.variantId === item.variantId && inv.purchaseId === item.purchaseId;
      }
      return false;
    });

    if (pendingIndex !== -1) {
      const updated = [...pendingInventory];
      updated[pendingIndex] = {
        ...updated[pendingIndex],
        quantity: item.quantity,
        totalCost: item.quantity * item.rate
      };
      setPendingInventory(updated);
      toast.success(`Updated ${item.productName} quantity to ${item.quantity}`);
    } else if (savedIndex !== -1) {
      const savedItem = project.inventory[savedIndex];
      const newTotalQuantity = item.quantity;

      if (newTotalQuantity > savedItem.quantity) {
        const additionalQuantity = newTotalQuantity - savedItem.quantity;

        const newItem: InventoryItem = {
          id: `temp-${Date.now()}`,
          productId: item.productId,
          variantId: item.variantId,
          virtualProductId: item.virtualProductId,
          isVirtualProduct: item.isVirtualProduct || false,
          productName: item.productName,
          sku: item.sku,
          description: item.description,
          quantity: additionalQuantity,
          rate: item.rate,
          totalCost: additionalQuantity * item.rate,
          purchaseId: item.purchaseId,
          componentBreakdown: item.componentBreakdown,
          customExpenses: item.customExpenses as Array<{
            name: string;
            amount: number;
            category: InventoryExpenseCategory;
            description?: string;
          }>,
          totalComponentCost: item.totalComponentCost,
          totalCustomExpenses: item.totalCustomExpenses,
          addedBy: userId,
          addedByName: 'You',
          addedAt: new Date().toISOString()
        };
        setPendingInventory([...pendingInventory, newItem]);
        toast.success(`Added ${additionalQuantity} more ${item.productName}`);
      }
    } else {
      const newItem: InventoryItem = {
        id: `temp-${Date.now()}`,
        productId: item.productId,
        variantId: item.variantId,
        virtualProductId: item.virtualProductId,
        isVirtualProduct: item.isVirtualProduct || false,
        productName: item.productName,
        sku: item.sku,
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        totalCost: item.quantity * item.rate,
        purchaseId: item.purchaseId,
        componentBreakdown: item.componentBreakdown,
        customExpenses: item.customExpenses as Array<{
          name: string;
          amount: number;
          category: InventoryExpenseCategory;
          description?: string;
        }>,
        totalComponentCost: item.totalComponentCost,
        totalCustomExpenses: item.totalCustomExpenses,
        addedBy: userId,
        addedByName: 'You',
        addedAt: new Date().toISOString()
      };
      setPendingInventory([...pendingInventory, newItem]);
      toast.success(`Added ${item.productName} to pending inventory`);
    }
  };

  const handleRemovePendingItem = (itemId: string) => {
    setPendingInventory(pendingInventory.filter(item => item.id !== itemId));
    toast.success('Item removed from pending inventory');
  };

  const handleSaveInventory = async () => {
    if (pendingInventory.length === 0) {
      toast.error('No pending inventory items to save');
      return;
    }

    setIsSaving(true);
    try {
      for (const item of pendingInventory) {
        await addInventoryItem(projectId, {
          productId: item.productId,
          variantId: item.variantId,
          virtualProductId: item.virtualProductId,
          isVirtualProduct: item.isVirtualProduct,
          productName: item.productName,
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          purchaseId: item.purchaseId,
          componentBreakdown: item.componentBreakdown,
          customExpenses: item.customExpenses,
          totalComponentCost: item.totalComponentCost,
          totalCustomExpenses: item.totalCustomExpenses,
          addedBy: userId
        });
      }

      toast.success(`Successfully saved ${pendingInventory.length} inventory item(s)`);
      setPendingInventory([]);
      setIsAddingInventory(false);
      handleRefresh();
    } catch (error) {
      console.error('Error saving inventory:', error);
      toast.error((error as Error).message || 'Failed to save inventory items');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelInventory = () => {
    if (pendingInventory.length > 0) {
      setCancelDialogOpen(true);
    } else {
      setIsAddingInventory(false);
    }
  };

  const handleConfirmCancel = () => {
    setPendingInventory([]);
    setIsAddingInventory(false);
    setCancelDialogOpen(false);
  };

  return (
    <>
      <div className="space-y-8">
        {/* Executive Header */}
        <div className="bg-white pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{project.title}</h1>
                <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0 px-3 py-1`}>
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Project ID: {project.projectId}</p>
              <p className="text-base text-gray-600 max-w-3xl">{project.description}</p>
            </div>
            <div className="flex items-center gap-3">
              {customer && (
                <Button variant="outline" asChild>
                  <Link href={`/ledger/${customer.customerId || customer.id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Ledger
                  </Link>
                </Button>
              )}
              {canGenerateInvoice && (
                <Button variant="outline" onClick={handleGenerateInvoice}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>
              )}
              {canEdit && (
                <Button asChild>
                  <Link href={`/projects/${projectId}/edit`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Project
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Project Details Grid */}
        <ProjectDetails project={project} customer={customer} canViewBudget={canViewBudget} />

        {/* Project Invoices - Admin Only */}
        {canViewProjectInvoices && projectInvoices.length > 0 && (
          <ProjectInvoicesList invoices={projectInvoices} />
        )}

        {/* Inventory & Expenses & Activity Section */}
        <Tabs defaultValue={canViewInventory ? 'inventory' : 'expenses'} className="space-y-4">
          <TabsList>
            {canViewInventory && (
              <TabsTrigger value="inventory" className="gap-2">
                <Package className="h-4 w-4" />
                Inventory ({allInventory.length})
                {pendingInventory.length > 0 && (
                  <Badge className="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0">{pendingInventory.length}</Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="expenses" className="gap-2">
              <Receipt className="h-4 w-4" />
              Expenses ({project.expenses.length})
            </TabsTrigger>
            {canViewAuditLogs && (
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                Activity ({auditLogs.length})
              </TabsTrigger>
            )}
          </TabsList>

          {canViewInventory && (
            <TabsContent value="inventory">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Project Inventory</h3>
                      {canAddInventory && !isAddingInventory && (
                        <Button onClick={() => setIsAddingInventory(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Inventory
                        </Button>
                      )}
                      {isAddingInventory && (
                        <div className="flex gap-2">
                          <Button onClick={handleSaveInventory} disabled={isSaving || pendingInventory.length === 0}>
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : `Save ${pendingInventory.length} Item(s)`}
                          </Button>
                          <Button variant="outline" onClick={handleCancelInventory} disabled={isSaving}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    {isAddingInventory && canAddInventory && (
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <EnhancedProductSelector
                          label="Add to Project"
                          variants={variants}
                          virtualProducts={virtualProducts}
                          purchases={purchases}
                          currentItems={currentItems}
                          onAddItem={handleAddInventoryItem}
                          skipStockValidation={false}
                        />
                      </div>
                    )}

                    {allInventory.length === 0 ? (
                      <div className="text-center py-16">
                        <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p className="text-sm text-muted-foreground mb-4">No inventory items added yet</p>
                        {canAddInventory && !isAddingInventory && (
                          <Button onClick={() => setIsAddingInventory(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Item
                          </Button>
                        )}
                      </div>
                    ) : (
                      <ProjectInventoryTable
                        data={allInventory}
                        projectId={projectId}
                        userId={userId}
                        userName={userName}
                        canDelete={canEdit}
                        onRefresh={handleRefresh}
                        pendingItems={pendingInventory.map(item => item.id!)}
                        onRemovePending={handleRemovePendingItem}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="expenses">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Project Expenses</h3>
                    {canAddExpense && (project.status === 'planning' || project.status === 'active' || project.status === 'on-hold') && (
                      <Button onClick={() => setExpenseDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Expense
                      </Button>
                    )}
                  </div>
                  {project.expenses.length === 0 ? (
                    <div className="text-center py-16">
                      <Receipt className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-sm text-muted-foreground mb-4">No expenses recorded yet</p>
                      {canAddExpense && (project.status === 'planning' || project.status === 'active' || project.status === 'on-hold') && (
                        <Button onClick={() => setExpenseDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Expense
                        </Button>
                      )}
                    </div>
                  ) : (
                    <ExpensesTable
                      data={project.expenses}
                      projectId={projectId}
                      userId={userId}
                      userRole={userRole}
                      canDelete={canEdit}
                      onRefresh={handleRefresh}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canViewAuditLogs && (
            <TabsContent value="activity">
              <ProjectAuditLogs 
                logs={auditLogs} 
                users={[
                  ...project.assignedStaff.map(staffId => ({
                    id: staffId,
                    name: project.expenses.find(e => e.addedBy === staffId)?.addedByName || 
                          project.inventory.find(i => i.addedBy === staffId)?.addedByName || 
                          'Unknown'
                  })),
                  { id: userId, name: userName }
                ].filter((user, index, self) => 
                  index === self.findIndex(u => u.id === user.id)
                )}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {canAddExpense && (project.status === 'planning' || project.status === 'active' || project.status === 'on-hold') && (
        <AddExpenseDialog
          open={expenseDialogOpen}
          onOpenChange={setExpenseDialogOpen}
          projectId={projectId}
          userId={userId}
          onSuccess={handleRefresh}
        />
      )}

      <ConfirmationDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={handleConfirmCancel}
        title="Discard Unsaved Changes?"
        description={`You have ${pendingInventory.length} unsaved inventory item${pendingInventory.length > 1 ? 's' : ''}. Are you sure you want to cancel? This action cannot be undone.`}
        confirmText="Discard Changes"
        variant="destructive"
      />
    </>
  );
}
