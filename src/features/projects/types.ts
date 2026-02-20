export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';

export type ExpenseCategory = 'materials' | 'labor' | 'equipment' | 'transport' | 'other';

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

export interface Project {
  id: string;
  projectId?: string;
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
  expenses: Expense[];
  totalExpenses: number;
  remainingBudget: number;
  createdBy: string;
  createdByName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateProjectDto {
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
