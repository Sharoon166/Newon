import type { ExpenseCategory } from '@/features/expenses/types';

export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';

export interface Expense {
  id?: string;
  expenseId?: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date | string;
  addedBy: string;
  addedByName?: string;
  addedByRole: 'admin' | 'staff';
  receipt?: string;
  notes?: string;
  createdAt?: Date | string;
}

export interface PaymentTransaction {
  id?: string;
  amount: number;
  date: Date | string;
  source: 'cash' | 'jazzcash' | 'easypaisa' | 'bank-transfer' | 'cheque' | 'other';
  notes?: string;
  addedBy: string;
  addedByName?: string;
  createdAt?: Date | string;
}

export interface ProjectExpenseWithTransactions {
  id: string;
  expenseId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date | string;
  addedBy: string;
  addedByName?: string;
  addedByRole: 'admin' | 'staff';
  receipt?: string;
  notes?: string;
  projectId: string;
  source: 'project';
  transactions: PaymentTransaction[];
  totalPaid: number;
  remainingAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EnrichedExpense extends Expense {
  transactions: PaymentTransaction[];
  totalPaid: number;
  remainingAmount: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
}

export interface Project {
  id: string;
  projectId?: string;
  invoiceId: string;
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
  totalExpenses: number;
  totalInventoryCost: number;
  totalProjectCost: number;
  remainingBudget: number;
  createdBy: string;
  createdByName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateProjectDto {
  invoiceId: string;
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

export interface AddExpenseDto {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  addedBy: string;
  addedByRole: 'admin' | 'staff';
  receipt?: string;
  notes?: string;
}

export interface AddPaymentTransactionDto {
  amount: number;
  date: Date;
  source: 'cash' | 'jazzcash' | 'easypaisa' | 'bank-transfer' | 'cheque' | 'other';
  notes?: string;
  addedBy: string;
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

// Lean type for MongoDB project documents (used in server actions)
export interface LeanProject {
  _id: Record<string, unknown>;
  projectId?: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  budget: number;
  status: ProjectStatus;
  startDate: Date | string;
  endDate?: Date | string;
  assignedStaff: string[];
  totalExpenses: number;
  totalInventoryCost: number;
  totalProjectCost: number;
  remainingBudget: number;
  createdBy: string;
  createdByName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  __v?: number;
}
