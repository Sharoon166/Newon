export type ExpenseCategory =
  | 'materials'
  | 'labor'
  | 'equipment'
  | 'transport'
  | 'rent'
  | 'utilities'
  | 'fuel'
  | 'maintenance'
  | 'marketing'
  | 'office-supplies'
  | 'professional-services'
  | 'insurance'
  | 'taxes'
  | 'other';

export const EXPENSE_CATEGORIES: ReadonlyArray<{ value: ExpenseCategory; label: string }> = [
  { value: 'materials', label: 'Materials' },
  { value: 'labor', label: 'Labor' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'transport', label: 'Transport' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'office-supplies', label: 'Office Supplies' },
  { value: 'professional-services', label: 'Professional Services' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'taxes', label: 'Taxes' },
  { value: 'other', label: 'Other' }
] as const;

export interface Expense {
  id: string;
  expenseId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date | string;
  vendor?: string;
  notes?: string;
  addedBy: string;
  addedByName?: string;
  source: 'manual' | 'invoice';
  invoiceId?: string;
  invoiceNumber?: string;
  projectId?: string;
  actualCost?: number;
  clientCost?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateExpenseDto {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  vendor?: string;
  notes?: string;
  addedBy: string;
  source?: 'manual' | 'invoice';
  invoiceId?: string;
  invoiceNumber?: string;
  actualCost?: number;
  clientCost?: number;
}

export interface UpdateExpenseDto {
  description?: string;
  amount?: number;
  category?: ExpenseCategory;
  date?: Date;
  vendor?: string;
  notes?: string;
}

export interface ExpenseFilters {
  search?: string;
  category?: ExpenseCategory;
  addedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedExpenses {
  docs: Expense[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export interface ExpenseKPIs {
  totalExpenses: number;
  dailyExpenses: number;
  dailyExpensesTrend: number;
  topCategory: {
    category: ExpenseCategory;
    amount: number;
  } | null;
  expenseCount: number;
}

export interface LeanExpense {
  _id: Record<string, unknown>;
  expenseId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date | string;
  vendor?: string;
  notes?: string;
  addedBy: string;
  addedByName?: string;
  source: 'manual' | 'invoice';
  invoiceId?: string;
  invoiceNumber?: string;
  projectId?: string;
  actualCost?: number;
  clientCost?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  __v?: number;
}
