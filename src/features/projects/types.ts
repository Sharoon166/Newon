export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';

export type ExpenseCategory = 'materials' | 'labor' | 'equipment' | 'transport' | 'other';

export type InventoryExpenseCategory = 'labor' | 'materials' | 'overhead' | 'packaging' | 'shipping' | 'other';

export interface Expense {
  id?: string;
  expenseId?: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date | string;
  addedBy: string;
  addedByName?: string;
  receipt?: string;
  notes?: string;
  createdAt?: Date | string;
}

export interface InventoryItem {
  id?: string;
  inventoryId?: string;
  productId?: string;
  variantId?: string;
  virtualProductId?: string;
  isVirtualProduct: boolean;
  productName: string;
  sku: string;
  description: string;
  quantity: number;
  rate: number;
  totalCost: number;
  purchaseId?: string; // For regular products
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
    category: InventoryExpenseCategory;
    description?: string;
  }>;
  totalComponentCost?: number;
  totalCustomExpenses?: number;
  addedBy: string;
  addedByName?: string;
  addedAt: Date | string;
  notes?: string;
}

export interface Project {
  id: string;
  projectId?: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  budget: number;
  status: ProjectStatus;
  startDate: Date | string;
  endDate?: Date | string;
  assignedStaff: string[];
  assignedStaffDetails?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  inventory: InventoryItem[];
  expenses: Expense[];
  totalInventoryCost: number;
  totalExpenses: number;
  totalProjectCost: number;
  remainingBudget: number;
  createdBy: string;
  createdByName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateProjectDto {
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  budget: number;
  status?: ProjectStatus;
  startDate: Date;
  endDate?: Date;
  assignedStaff: string[];
  createdBy: string;
}

export interface UpdateProjectDto {
  customerId?: string;
  customerName?: string;
  title?: string;
  description?: string;
  budget?: number;
  status?: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  assignedStaff?: string[];
}

export interface AddInventoryDto {
  productId?: string;
  variantId?: string;
  virtualProductId?: string;
  isVirtualProduct: boolean;
  productName: string;
  sku: string;
  description: string;
  quantity: number;
  rate: number;
  purchaseId?: string; // For regular products
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
    category: InventoryExpenseCategory;
    description?: string;
  }>;
  totalComponentCost?: number;
  totalCustomExpenses?: number;
  addedBy: string;
  notes?: string;
}

export interface UpdateInventoryDto {
  quantity?: number;
  rate?: number;
  notes?: string;
}

export interface AddExpenseDto {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  addedBy: string;
  receipt?: string;
  notes?: string;
}

export interface UpdateExpenseDto {
  description?: string;
  amount?: number;
  category?: ExpenseCategory;
  date?: Date;
  receipt?: string;
  notes?: string;
}

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus;
  assignedStaff?: string;
  customerId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface ExpenseFilters {
  category?: ExpenseCategory;
  addedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface InventoryFilters {
  category?: InventoryExpenseCategory;
  addedBy?: string;
  search?: string;
  isVirtualProduct?: boolean;
}

export interface PaginatedProjects {
  docs: Project[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}
