'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import ExpenseModel from '@/models/Expense';
import type {
  Expense,
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseFilters,
  PaginatedExpenses,
  ExpenseKPIs,
  LeanExpense
} from '../types';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

function transformLeanExpense(leanDoc: LeanExpense): Expense {
  return {
    ...leanDoc,
    id: String(leanDoc._id),
    _id: undefined,
    __v: undefined
  } as Expense;
}

const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  category: z.enum([
    'materials',
    'labor',
    'equipment',
    'transport',
    'rent',
    'utilities',
    'fuel',
    'maintenance',
    'marketing',
    'office-supplies',
    'professional-services',
    'insurance',
    'taxes',
    'other'
  ]),
  date: z.date(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
  addedBy: z.string().min(1)
});

const updateExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z
    .enum([
      'materials',
      'labor',
      'equipment',
      'transport',
      'rent',
      'utilities',
      'fuel',
      'maintenance',
      'marketing',
      'office-supplies',
      'professional-services',
      'insurance',
      'taxes',
      'other'
    ])
    .optional(),
  date: z.date().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional()
});

export async function getExpenses(filters?: ExpenseFilters): Promise<PaginatedExpenses> {
  try {
    await dbConnect();

    const query: Record<string, unknown> = {};

    if (filters?.search) {
      query.$or = [
        { description: { $regex: filters.search, $options: 'i' } },
        { vendor: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.addedBy) {
      query.addedBy = filters.addedBy;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (filters.dateFrom) {
        dateQuery.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        dateQuery.$lte = filters.dateTo;
      }
      query.date = dateQuery;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;

    const result = await ExpenseModel.paginate(query, {
      page,
      limit,
      sort: { date: -1, createdAt: -1 },
      lean: true
    });

    const transformedExpenses = result.docs.map((expense: unknown) =>
      transformLeanExpense(expense as LeanExpense)
    );

    return {
      docs: transformedExpenses,
      totalDocs: result.totalDocs,
      limit: result.limit,
      page: result.page || 1,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage || false,
      hasPrevPage: result.hasPrevPage || false,
      nextPage: result.nextPage || null,
      prevPage: result.prevPage || null
    };
  } catch (error) {
    console.error('Error fetching expenses:', error);
    throw new Error('Failed to fetch expenses');
  }
}

export async function getExpense(id: string): Promise<ActionResult<Expense>> {
  try {
    await dbConnect();

    const expense = await ExpenseModel.findOne({ expenseId: id }).lean();

    if (!expense) {
      return { success: false, error: 'Expense not found' };
    }

    return { success: true, data: transformLeanExpense(expense as unknown as LeanExpense) };
  } catch (error) {
    console.error(`Error fetching expense ${id}:`, error);
    return { success: false, error: 'Failed to fetch expense' };
  }
}

export async function createExpense(data: CreateExpenseDto): Promise<ActionResult<Expense>> {
  try {
    await dbConnect();

    const validated = createExpenseSchema.parse(data);

    const newExpense = new ExpenseModel(validated);
    const savedExpense = await newExpense.save();

    revalidatePath('/expenses');

    return { success: true, data: transformLeanExpense(savedExpense.toObject() as LeanExpense) };
  } catch (error) {
    console.error('Error creating expense:', error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to create expense' };
  }
}

export async function updateExpense(
  id: string,
  data: UpdateExpenseDto
): Promise<ActionResult<Expense>> {
  try {
    await dbConnect();

    const existingExpense = await ExpenseModel.findOne({ expenseId: id }).lean();

    if (!existingExpense) {
      return { success: false, error: 'Expense not found' };
    }

    if (existingExpense.source === 'invoice') {
      return { success: false, error: 'Cannot edit expense from invoice. Please edit the invoice instead.' };
    }

    const validated = updateExpenseSchema.parse(data);

    const updateData = Object.fromEntries(
      Object.entries(validated).filter(([, value]) => value !== undefined)
    );

    const updatedExpense = await ExpenseModel.findOneAndUpdate(
      { expenseId: id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedExpense) {
      return { success: false, error: 'Expense not found' };
    }

    revalidatePath('/expenses');

    return { success: true, data: transformLeanExpense(updatedExpense as unknown as LeanExpense) };
  } catch (error) {
    console.error(`Error updating expense ${id}:`, error);
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    return { success: false, error: 'Failed to update expense' };
  }
}

export async function deleteExpense(id: string): Promise<ActionResult<void>> {
  try {
    await dbConnect();

    const existingExpense = await ExpenseModel.findOne({ expenseId: id }).lean();

    if (!existingExpense) {
      return { success: false, error: 'Expense not found' };
    }

    if (existingExpense.source === 'invoice') {
      return { success: false, error: 'Cannot delete expense from invoice. Please cancel or edit the invoice instead.' };
    }

    const result = await ExpenseModel.deleteOne({ expenseId: id });

    if (result.deletedCount === 0) {
      return { success: false, error: 'Expense not found' };
    }

    revalidatePath('/expenses');

    return { success: true, data: undefined };
  } catch (error) {
    console.error(`Error deleting expense ${id}:`, error);
    return { success: false, error: 'Failed to delete expense' };
  }
}

export async function getExpenseKPIs(): Promise<ExpenseKPIs> {
  try {
    await dbConnect();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalResult, dailyResult, weeklyResult, monthlyResult, categoryResult, countResult] =
      await Promise.all([
        ExpenseModel.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
        ExpenseModel.aggregate([
          { $match: { date: { $gte: startOfDay } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        ExpenseModel.aggregate([
          { $match: { date: { $gte: startOfWeek } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        ExpenseModel.aggregate([
          { $match: { date: { $gte: startOfMonth } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        ExpenseModel.aggregate([
          { $group: { _id: '$category', total: { $sum: '$amount' } } },
          { $sort: { total: -1 } },
          { $limit: 1 }
        ]),
        ExpenseModel.countDocuments()
      ]);

    return {
      totalExpenses: totalResult[0]?.total || 0,
      dailyExpenses: dailyResult[0]?.total || 0,
      weeklyExpenses: weeklyResult[0]?.total || 0,
      monthlyExpenses: monthlyResult[0]?.total || 0,
      topCategory: categoryResult[0]
        ? {
            category: categoryResult[0]._id,
            amount: categoryResult[0].total
          }
        : null,
      expenseCount: countResult
    };
  } catch (error) {
    console.error('Error fetching expense KPIs:', error);
    throw new Error('Failed to fetch expense KPIs');
  }
}

export async function getTotalExpensesForPeriod(startDate: Date, endDate: Date): Promise<number> {
  try {
    await dbConnect();

    const result = await ExpenseModel.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    return result[0]?.total || 0;
  } catch (error) {
    console.error('Error fetching total expenses:', error);
    return 0;
  }
}

// Invoice expense management
interface InvoiceExpenseItem {
  name: string;
  actualCost: number;
  clientCost: number;
  category: 'materials' | 'labor' | 'equipment' | 'transport' | 'rent' | 'utilities' | 'fuel' | 'maintenance' | 'marketing' | 'office-supplies' | 'professional-services' | 'insurance' | 'taxes' | 'other';
  description?: string;
}

export async function createInvoiceExpenses(
  invoiceId: string,
  invoiceNumber: string,
  invoiceDate: Date,
  customExpenses: InvoiceExpenseItem[],
  createdBy: string,
  projectId?: string
): Promise<ActionResult<string[]>> {
  try {
    await dbConnect();

    if (!customExpenses || customExpenses.length === 0) {
      return { success: true, data: [] };
    }

    const expenseIds: string[] = [];

    for (const item of customExpenses) {
      const expenseData = {
        description: item.description || item.name,
        amount: item.actualCost,
        actualCost: item.actualCost,
        clientCost: item.clientCost,
        category: item.category,
        date: invoiceDate,
        notes: `From invoice ${invoiceNumber}`,
        addedBy: createdBy,
        source: 'invoice' as const,
        invoiceId,
        invoiceNumber,
        ...(projectId && { projectId })
      };

      const newExpense = new ExpenseModel(expenseData);
      const savedExpense = await newExpense.save();
      expenseIds.push(savedExpense.expenseId);
    }

    revalidatePath('/expenses');
    revalidatePath('/dashboard');

    return { success: true, data: expenseIds };
  } catch (error) {
    console.error('Error creating invoice expenses:', error);
    return { success: false, error: 'Failed to create invoice expenses' };
  }
}

export async function deleteInvoiceExpenses(invoiceId: string): Promise<ActionResult<void>> {
  try {
    await dbConnect();

    await ExpenseModel.deleteMany({ invoiceId, source: 'invoice' });

    revalidatePath('/expenses');
    revalidatePath('/dashboard');

    return { success: true, data: undefined };
  } catch (error) {
    console.error(`Error deleting invoice expenses for invoice ${invoiceId}:`, error);
    return { success: false, error: 'Failed to delete invoice expenses' };
  }
}

export async function syncInvoiceExpenses(
  invoiceId: string,
  invoiceNumber: string,
  invoiceDate: Date,
  customExpenses: InvoiceExpenseItem[],
  createdBy: string,
  projectId?: string
): Promise<ActionResult<string[]>> {
  try {
    await dbConnect();

    await ExpenseModel.deleteMany({ invoiceId, source: 'invoice' });

    if (!customExpenses || customExpenses.length === 0) {
      revalidatePath('/expenses');
      revalidatePath('/dashboard');
      return { success: true, data: [] };
    }

    const result = await createInvoiceExpenses(
      invoiceId,
      invoiceNumber,
      invoiceDate,
      customExpenses,
      createdBy,
      projectId
    );

    return result;
  } catch (error) {
    console.error(`Error syncing invoice expenses for invoice ${invoiceId}:`, error);
    return { success: false, error: 'Failed to sync invoice expenses' };
  }
}

export async function getInvoiceExpenses(filters?: ExpenseFilters): Promise<PaginatedExpenses> {
  try {
    await dbConnect();

    const query: Record<string, unknown> = { source: 'invoice' };

    if (filters?.search) {
      query.$or = [
        { description: { $regex: filters.search, $options: 'i' } },
        { invoiceNumber: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (filters.dateFrom) {
        dateQuery.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        dateQuery.$lte = filters.dateTo;
      }
      query.date = dateQuery;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;

    const result = await ExpenseModel.paginate(query, {
      page,
      limit,
      sort: { date: -1, createdAt: -1 },
      lean: true
    });

    const transformedExpenses = result.docs.map((expense: unknown) =>
      transformLeanExpense(expense as LeanExpense)
    );

    return {
      docs: transformedExpenses,
      totalDocs: result.totalDocs,
      limit: result.limit,
      page: result.page || 1,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage || false,
      hasPrevPage: result.hasPrevPage || false,
      nextPage: result.nextPage || null,
      prevPage: result.prevPage || null
    };
  } catch (error) {
    console.error('Error fetching invoice expenses:', error);
    throw new Error('Failed to fetch invoice expenses');
  }
}
