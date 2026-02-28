'use server';

import { revalidatePath } from 'next/cache';
import type {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilters,
  PaginatedProjects,
  AddExpenseDto,
  UpdateExpenseDto,
  LeanProject
} from '../types';
import type { Invoice } from '@/features/invoices/types';
import dbConnect from '@/lib/db';
import ProjectModel from '@/models/Project';
import InvoiceModel from '@/models/Invoice';
import Staff from '@/models/Staff';
import Customer from '@/models/Customer';

// Helper function to transform lean project to Project type
function transformLeanProject(leanDoc: LeanProject): Project {
  const { _id, __v, ...rest } = leanDoc;

  const toISOString = (date: Date | string | undefined): string | undefined => {
    if (!date) return undefined;
    return date instanceof Date ? date.toISOString() : date;
  };

  return {
    ...rest,
    id: String(_id),
    totalInventoryCost: leanDoc.totalInventoryCost || 0,
    expenses: leanDoc.expenses.map(expense => {
      const { _id: expenseId, ...expenseRest } = expense;
      return {
        ...expenseRest,
        id: String(expenseId),
        date: toISOString(expense.date) as string,
        createdAt: toISOString(expense.createdAt)
      };
    }),
    startDate: toISOString(leanDoc.startDate) as string,
    endDate: toISOString(leanDoc.endDate),
    createdAt: toISOString(leanDoc.createdAt) as string,
    updatedAt: toISOString(leanDoc.updatedAt) as string
  } as Project;
}


// Helper function to calculate virtual fields for lean documents
async function calculateVirtuals(leanDoc: LeanProject): Promise<LeanProject> {
  // Get all expense IDs (both staff and admin)
  const expenseIds = leanDoc.expenses
    ?.filter(expense => expense.expenseId)
    .map(expense => expense.expenseId) || [];

  let totalExpenses = 0;

  // If there are expenses, fetch their paid amounts from Expense collection
  if (expenseIds.length > 0) {
    const ExpenseModel = (await import('@/models/Expense')).default;
    const expenses = await ExpenseModel.find({ 
      expenseId: { $in: expenseIds },
      source: 'project'
    }).lean();

    // Sum up the paid amounts (from payment transactions)
    totalExpenses = expenses.reduce((sum, expense) => {
      const transactions = expense.transactions as Array<{ amount: number }>;
      const totalPaid = transactions.reduce((tSum, t) => tSum + t.amount, 0);
      return sum + totalPaid;
    }, 0);
  }

  // Get inventory costs from invoices linked to this project
  let totalInventoryCost = 0;
  if (leanDoc.projectId) {
    console.log(`[CALCULATE VIRTUALS] Looking for invoices with projectId: ${leanDoc.projectId}`);
    const InvoiceModel = (await import('@/models/Invoice')).default;
    const invoices = await InvoiceModel.find({ projectId: leanDoc.projectId }).lean();
    
    console.log(`[CALCULATE VIRTUALS] Found ${invoices.length} invoices for project ${leanDoc.projectId}`);
    
    if (invoices && invoices.length > 0) {
      totalInventoryCost = invoices.reduce((invoiceSum, invoice) => {
        if (!invoice.items) return invoiceSum;
        
        console.log(`[CALCULATE VIRTUALS] Processing invoice ${invoice.invoiceNumber} with ${invoice.items.length} items`);
        
        const invoiceItemsCost = invoice.items.reduce((sum, item) => {
          // For virtual products, use component cost + custom expenses actual cost
          if (item.isVirtualProduct) {
            const componentCost = item.totalComponentCost || 0;
            const customExpensesCost = item.customExpenses?.reduce((expSum, exp) => expSum + exp.actualCost, 0) || 0;
            const itemCost = componentCost + customExpensesCost;
            console.log(`[CALCULATE VIRTUALS] Virtual product ${item.productName}: componentCost=${componentCost}, customExpensesCost=${customExpensesCost}, total=${itemCost}`);
            return sum + itemCost;
          }
          // For regular products, use originalRate * quantity (actual cost) instead of client price
          const actualCost = (item.originalRate || item.unitPrice) * item.quantity;
          console.log(`[CALCULATE VIRTUALS] Regular product ${item.productName}: originalRate=${item.originalRate}, unitPrice=${item.unitPrice}, quantity=${item.quantity}, actualCost=${actualCost}`);
          return sum + actualCost;
        }, 0);
        
        console.log(`[CALCULATE VIRTUALS] Invoice ${invoice.invoiceNumber} total cost: ${invoiceItemsCost}`);
        return invoiceSum + invoiceItemsCost;
      }, 0);
    }
    
    console.log(`[CALCULATE VIRTUALS] Total inventory cost: ${totalInventoryCost}`);
  } else {
    console.log(`[CALCULATE VIRTUALS] No projectId found in project document`);
  }

  const totalProjectCost = totalExpenses + totalInventoryCost;
  const remainingBudget = leanDoc.budget - totalProjectCost;

  console.log(`[CALCULATE VIRTUALS] Project ${leanDoc.projectId}: budget=${leanDoc.budget}, expenses=${totalExpenses}, inventory=${totalInventoryCost}, total=${totalProjectCost}, remaining=${remainingBudget}`);

  return {
    ...leanDoc,
    totalExpenses,
    totalInventoryCost,
    totalProjectCost,
    remainingBudget
  };
}


export async function getProjects(
  filters?: ProjectFilters,
  userId?: string,
  userRole?: string
): Promise<PaginatedProjects> {
  try {
    await dbConnect();

    const query: Record<string, unknown> = {};

    // Staff can only see projects they're assigned to
    if (userRole === 'staff' && userId) {
      query.assignedStaff = userId;
    }

    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { projectId: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.assignedStaff) {
      query.assignedStaff = filters.assignedStaff;
    }

    if (filters?.customerId) {
      query.customerId = filters.customerId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const dateQuery: Record<string, Date> = {};
      if (filters.dateFrom) {
        dateQuery.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        dateQuery.$lte = filters.dateTo;
      }
      query.startDate = dateQuery;
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;

    const result = await ProjectModel.paginate(query, {
      page,
      limit,
      sort: { createdAt: -1 },
      lean: true,
      leanWithId: false
    });

    // Manually calculate virtuals for each project
    const transformedProjects = await Promise.all(
      result.docs.map(async (project: unknown) => {
        const calculatedProject = await calculateVirtuals(project as LeanProject);
        return transformLeanProject(calculatedProject);
      })
    );

    // Populate staff details
    const projectsWithStaff = await Promise.all(
      transformedProjects.map(async project => {
        if (project.assignedStaff.length > 0) {
          const staffDetails = await Staff.find({ _id: { $in: project.assignedStaff } })
            .select('firstName lastName email')
            .lean();

          return {
            ...project,
            assignedStaffDetails: staffDetails.map(staff => ({
              id: String(staff._id),
              firstName: staff.firstName,
              lastName: staff.lastName,
              email: staff.email
            }))
          };
        }
        return project;
      })
    );

    return {
      docs: projectsWithStaff,
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
    console.error('Error fetching projects:', error);
    throw new Error('Failed to fetch projects');
  }
}

export async function getProject(id: string, userId?: string, userRole?: string): Promise<Project> {
  try {
    await dbConnect();

    const project = await ProjectModel.findOne({ projectId: id }).lean();

    if (!project) {
      throw new Error('Project not found');
    }

    // Staff can only view projects they're assigned to
    if (userRole === 'staff' && userId && !project.assignedStaff.includes(userId)) {
      throw new Error('You do not have permission to view this project');
    }

    const transformedProject = transformLeanProject(
      await calculateVirtuals(project as unknown as LeanProject)
    );

    // Populate staff details
    if (transformedProject.assignedStaff.length > 0) {
      const staffDetails = await Staff.find({ _id: { $in: transformedProject.assignedStaff } })
        .select('firstName lastName email')
        .lean();

      transformedProject.assignedStaffDetails = staffDetails.map(staff => ({
        id: String(staff._id),
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email
      }));
    }

    return transformedProject;
  } catch (error) {
    console.error(`Error fetching project ${id}:`, error);
    throw new Error((error as Error).message || 'Failed to fetch project');
  }
}

export async function createProject(data: CreateProjectDto): Promise<Project> {
  try {
    await dbConnect();

    // Validate customer exists
    const customer = await Customer.findOne({ 
      $or: [
        { customerId: data.customerId },
        { _id: data.customerId }
      ]
    }).lean();

    if (!customer) {
      throw new Error('Customer not found');
    }

    if (customer.disabled) {
      throw new Error('Cannot create project for disabled customer');
    }

    const newProject = new ProjectModel(data);
    const savedProject = await newProject.save();

    // Update the invoice's projectId to link it to this project
    if (data.invoiceId && savedProject.projectId) {
      await InvoiceModel.findOneAndUpdate(
        { invoiceNumber: data.invoiceId },
        { $set: { projectId: savedProject.projectId } }
      );
    }

    revalidatePath('/projects');

    return transformLeanProject(savedProject.toObject() as unknown as LeanProject);
  } catch (error: unknown) {
    console.error('Error creating project:', error);
    throw new Error((error as Error).message || 'Failed to create project');
  }
}

export async function linkInvoiceToProject(projectId: string, invoiceNumber: string): Promise<void> {
  try {
    await dbConnect();

    // Verify project exists
    const project = await ProjectModel.findOne({ projectId }).lean();
    if (!project) {
      throw new Error('Project not found');
    }

    // Find the invoice
    const invoice = await InvoiceModel.findOne({ invoiceNumber }).lean();
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Verify invoice belongs to the same customer
    if (invoice.customerId !== project.customerId) {
      throw new Error('Invoice must belong to the same customer as the project');
    }

    // Check if invoice is already linked to another project
    if (invoice.projectId && invoice.projectId !== projectId) {
      throw new Error('Invoice is already linked to another project');
    }

    // Check if invoice is already linked to this project
    if (invoice.projectId === projectId) {
      throw new Error('Invoice is already linked to this project');
    }

    // Link the invoice to the project
    await InvoiceModel.findOneAndUpdate(
      { invoiceNumber },
      { $set: { projectId } }
    );

    revalidatePath('/projects');
    revalidatePath('/invoices');
  } catch (error) {
    console.error(`Error linking invoice ${invoiceNumber} to project ${projectId}:`, error);
    throw new Error((error as Error).message || 'Failed to link invoice to project');
  }
}

export async function updateProject(
  id: string, 
  data: UpdateProjectDto,
  userRole?: string
): Promise<Project> {
  try {
    await dbConnect();

    // Get the project first to check status
    const existingProject = await ProjectModel.findOne({ projectId: id }).lean();
    
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Staff cannot edit projects with certain statuses
    if (userRole === 'staff' && ['on-hold', 'completed', 'cancelled'].includes(existingProject.status)) {
      throw new Error('Staff members cannot edit projects with status: on-hold, completed, or cancelled');
    }

    // If updating customer, validate it exists
    if (data.customerId) {
      const customer = await Customer.findOne({ 
        $or: [
          { customerId: data.customerId },
          { _id: data.customerId }
        ]
      }).lean();

      if (!customer) {
        throw new Error('Customer not found');
      }

      if (customer.disabled) {
        throw new Error('Cannot assign project to disabled customer');
      }

      // Update customer name if customer changed
      if (!data.customerName) {
        data.customerName = customer.name;
      }
    }

    const updateData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

    const updatedProject = await ProjectModel.findOneAndUpdate(
      { projectId: id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedProject) {
      throw new Error('Project not found');
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`);
    revalidatePath(`/projects/${id}/edit`);
    revalidatePath('/dashboard');
    revalidatePath('/invoices');

    return transformLeanProject(updatedProject as unknown as LeanProject);
  } catch (error) {
    console.error(`Error updating project ${id}:`, error);
    throw new Error((error as Error).message || 'Failed to update project');
  }
}

export async function updateProjectStatus(
  id: string,
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
): Promise<void> {
  try {
    await dbConnect();

    const updatedProject = await ProjectModel.findOneAndUpdate(
      { projectId: id },
      { $set: { status } },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      throw new Error('Project not found');
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`);
    revalidatePath('/dashboard');
  } catch (error) {
    console.error(`Error updating project status ${id}:`, error);
    throw new Error((error as Error).message || 'Failed to update project status');
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await dbConnect();

    console.log(`[DELETE PROJECT] Attempting to delete project: ${id}`);

    // Check if project has any non-cancelled invoices
    const InvoiceModel = (await import('@/models/Invoice')).default;
    const linkedInvoices = await InvoiceModel.find({ projectId: id }).lean();
    
    console.log(`[DELETE PROJECT] Found ${linkedInvoices.length} linked invoices`);
    console.log(`[DELETE PROJECT] Invoice statuses:`, linkedInvoices.map(inv => ({ 
      invoiceNumber: inv.invoiceNumber, 
      status: inv.status,
      projectId: inv.projectId 
    })));
    
    const nonCancelledInvoices = linkedInvoices.filter(inv => inv.status !== 'cancelled');
    
    console.log(`[DELETE PROJECT] Non-cancelled invoices: ${nonCancelledInvoices.length}`);
    
    if (nonCancelledInvoices.length > 0) {
      const invoiceNumbers = nonCancelledInvoices.map(inv => inv.invoiceNumber).join(', ');
      throw new Error(
        `Cannot delete project. It has ${nonCancelledInvoices.length} active invoice(s): ${invoiceNumbers}. Please cancel all invoices before deleting the project.`
      );
    }

    // Clear projectId from all cancelled invoices
    if (linkedInvoices.length > 0) {
      console.log(`[DELETE PROJECT] Clearing projectId from ${linkedInvoices.length} cancelled invoices`);
      const updateResult = await InvoiceModel.updateMany(
        { projectId: id, status: 'cancelled' },
        { $unset: { projectId: '' } }
      );
      console.log(`[DELETE PROJECT] Updated ${updateResult.modifiedCount} invoices`);
    }

    const result = await ProjectModel.deleteOne({ projectId: id });

    if (result.deletedCount === 0) {
      throw new Error('Project not found');
    }

    console.log(`[DELETE PROJECT] Successfully deleted project ${id}`);

    revalidatePath('/projects');
    revalidatePath('/dashboard');
    revalidatePath('/invoices');
  } catch (error) {
    console.error(`[DELETE PROJECT] Error deleting project ${id}:`, error);
    throw new Error((error as Error).message || 'Failed to delete project');
  }
}

export async function addExpense(
  projectId: string, 
  data: AddExpenseDto, 
  userRole: string
): Promise<Project> {
  try {
    await dbConnect();

    // Get staff name
    const staff = await Staff.findById(data.addedBy).select('firstName lastName').lean() as { firstName: string; lastName: string } | null;
    const addedByName = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';

    // Always create expense in Expense collection (for both staff and admin)
    const ExpenseModel = (await import('@/models/Expense')).default;
    
    const expenseData = {
      description: data.description,
      amount: data.amount,
      category: data.category,
      date: data.date,
      addedBy: data.addedBy,
      addedByName,
      source: 'project' as const,
      projectId,
      notes: data.notes,
      transactions: data.addedByRole === 'admin' ? [{
        amount: data.amount,
        date: data.date,
        source: 'cash' as const,
        notes: 'Auto-paid on creation',
        addedBy: data.addedBy,
        addedByName,
        createdAt: new Date()
      }] : []
    };

    const newExpense = new ExpenseModel(expenseData);
    const savedExpense = await newExpense.save();

    // Add reference to project with expenseId
    const updatedProject = await ProjectModel.findOneAndUpdate(
      { projectId },
      {
        $push: {
          expenses: {
            expenseId: savedExpense.expenseId,
            description: data.description,
            amount: data.amount,
            category: data.category,
            date: data.date,
            addedBy: data.addedBy,
            addedByName,
            addedByRole: data.addedByRole,
            receipt: data.receipt,
            notes: data.notes,
            createdAt: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedProject) {
      throw new Error('Project not found');
    }

    // Create audit log
    const { createAuditLog } = await import('./audit');
    const { formatCurrency } = await import('@/lib/utils');
    await createAuditLog({
      projectId,
      action: 'expense_added',
      userId: data.addedBy,
      userName: addedByName,
      userRole: data.addedByRole,
      description: `Added expense: ${data.description} (${data.category}) - ${formatCurrency(data.amount)}${data.addedByRole === 'admin' ? ' (auto-paid)' : ' (pending payment)'}`,
      metadata: {
        expenseId: savedExpense.expenseId,
        amount: data.amount,
        category: data.category,
        description: data.description
      }
    });

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/dashboard');
    revalidatePath('/expenses');

    const calculatedProject = await calculateVirtuals(updatedProject as unknown as LeanProject);
    return transformLeanProject(calculatedProject);
  } catch (error) {
    console.error(`Error adding expense to project ${projectId}:`, error);
    throw new Error('Failed to add expense');
  }
}

export async function updateExpense(
  projectId: string,
  expenseId: string,
  data: UpdateExpenseDto
): Promise<Project> {
  try {
    await dbConnect();

    const updateData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

    const updatedProject = await ProjectModel.findOneAndUpdate(
      { projectId, 'expenses._id': expenseId },
      {
        $set: Object.fromEntries(Object.entries(updateData).map(([key, value]) => [`expenses.$.${key}`, value]))
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedProject) {
      throw new Error('Project or expense not found');
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/dashboard');
    revalidatePath('/expenses');

    const calculatedProject = await calculateVirtuals(updatedProject as unknown as LeanProject);
    return transformLeanProject(calculatedProject);
  } catch (error) {
    console.error(`Error updating expense ${expenseId}:`, error);
    throw new Error('Failed to update expense');
  }
}

export async function deleteExpense(
  projectId: string, 
  expenseId: string, 
  userId: string, 
  userRole: string
): Promise<Project> {
  try {
    await dbConnect();

    // First, get the project and expense to check ownership
    const project = await ProjectModel.findOne({ projectId }).lean();
    
    if (!project) {
      throw new Error('Project not found');
    }

    const expense = (project.expenses as unknown as Array<{ _id: unknown; expenseId?: string; description: string; category: string; amount: number; addedBy: string }>).find((exp) => 
      String(exp._id) === expenseId
    );
    
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Check ownership: staff can only delete their own expenses, admin can delete any
    if (userRole === 'staff' && expense.addedBy !== userId) {
      throw new Error('You can only delete your own expenses');
    }

    // Delete from Expense collection if it has an expenseId
    if (expense.expenseId) {
      const ExpenseModel = (await import('@/models/Expense')).default;
      await ExpenseModel.deleteOne({ expenseId: expense.expenseId, source: 'project' });
    }

    // Delete the expense
    const updatedProject = await ProjectModel.findOneAndUpdate(
      { projectId },
      { $pull: { expenses: { _id: expenseId } } },
      { new: true }
    ).lean();

    if (!updatedProject) {
      throw new Error('Project not found');
    }

    // Create audit log
    const { createAuditLog } = await import('./audit');
    const { formatCurrency } = await import('@/lib/utils');
    const staff = await Staff.findById(userId).select('firstName lastName').lean() as { firstName: string; lastName: string } | null;
    const userName = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';

    await createAuditLog({
      projectId,
      action: 'expense_deleted',
      userId,
      userName,
      userRole,
      description: `Deleted expense: ${expense.description} (${expense.category}) - ${formatCurrency(expense.amount)}`,
      metadata: {
        expenseId,
        amount: expense.amount,
        category: expense.category,
        description: expense.description
      }
    });

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/dashboard');
    revalidatePath('/expenses');

    const calculatedProject = await calculateVirtuals(updatedProject as unknown as LeanProject);
    return transformLeanProject(calculatedProject);
  } catch (error) {
    console.error(`Error deleting expense ${expenseId}:`, error);
    throw error instanceof Error ? error : new Error('Failed to delete expense');
  }
}

// ============================================
// PROJECT INVOICES
// ============================================

// ============================================
// PROJECT INVOICES
// ============================================

export async function getProjectInvoice(invoiceId: string): Promise<Invoice | null> {
  try {
    await dbConnect();
    
    const { getInvoice } = await import('@/features/invoices/actions');
    const invoice = await getInvoice(invoiceId);
    
    return invoice;
  } catch (error) {
    console.error('Error fetching project invoice:', error);
    return null;
  }
}

export async function getProjectInvoices(projectId: string): Promise<Invoice[]> {
  try {
    await dbConnect();

    const invoices = await InvoiceModel.find({ projectId })
      .sort({ date: -1 })
      .lean();

    if (!invoices || invoices.length === 0) {
      return [];
    }

    // Transform invoices to match Invoice type
    return invoices.map(invoice => {
      const inv = invoice as unknown as {
        _id: unknown;
        __v?: number;
        date: Date | string;
        dueDate?: Date | string;
        validUntil?: Date | string;
        createdAt: Date | string;
        updatedAt: Date | string;
        items: Array<{ _id: unknown; [key: string]: unknown }>;
        payments?: Array<{ _id: unknown; date: Date | string; [key: string]: unknown }>;
        [key: string]: unknown;
      };
      
      const { _id, __v, ...rest } = inv;
      return {
        ...rest,
        id: String(_id),
        date: inv.date instanceof Date ? inv.date.toISOString() : inv.date,
        dueDate: inv.dueDate ? (inv.dueDate instanceof Date ? inv.dueDate.toISOString() : inv.dueDate) : undefined,
        validUntil: inv.validUntil ? (inv.validUntil instanceof Date ? inv.validUntil.toISOString() : inv.validUntil) : undefined,
        createdAt: inv.createdAt instanceof Date ? inv.createdAt.toISOString() : inv.createdAt,
        updatedAt: inv.updatedAt instanceof Date ? inv.updatedAt.toISOString() : inv.updatedAt,
        items: inv.items.map((item) => {
          const { _id: itemId, ...itemRest } = item;
          return {
            ...itemRest,
            id: String(itemId)
          };
        }),
        payments: inv.payments?.map((payment) => {
          const { _id: paymentId, ...paymentRest } = payment;
          return {
            ...paymentRest,
            id: String(paymentId),
            date: payment.date instanceof Date ? payment.date.toISOString() : payment.date
          };
        }) || []
      } as unknown as Invoice;
    });
  } catch (error) {
    console.error(`Error fetching invoices for project ${projectId}:`, error);
    return [];
  }
}

// ============================================
// PAYMENT TRANSACTIONS FOR PROJECT EXPENSES
// ============================================

export async function getProjectExpenseWithTransactions(
  expenseId: string
): Promise<import('../types').ProjectExpenseWithTransactions | null> {
  try {
    await dbConnect();
    
    const ExpenseModel = (await import('@/models/Expense')).default;
    const expense = await ExpenseModel.findOne({ 
      expenseId,
      source: 'project'
    }).lean();

    if (!expense) {
      return null;
    }

    const exp = expense as unknown as {
      _id: unknown;
      __v?: number;
      date: Date | string;
      createdAt: Date | string;
      updatedAt: Date | string;
      transactions: Array<{ _id: unknown; date: Date | string; [key: string]: unknown }>;
      totalPaid: number;
      remainingAmount: number;
      paymentStatus: 'unpaid' | 'partial' | 'paid';
      [key: string]: unknown;
    };

    const { _id, __v, ...rest } = exp;

    return {
      ...rest,
      id: String(_id),
      date: exp.date instanceof Date ? exp.date.toISOString() : exp.date,
      createdAt: exp.createdAt instanceof Date ? exp.createdAt.toISOString() : exp.createdAt,
      updatedAt: exp.updatedAt instanceof Date ? exp.updatedAt.toISOString() : exp.updatedAt,
      transactions: exp.transactions.map((transaction) => {
        const { _id: transactionId, ...transactionRest } = transaction;
        return {
          ...transactionRest,
          id: String(transactionId),
          date: transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date
        };
      })
    } as import('../types').ProjectExpenseWithTransactions;
  } catch (error) {
    console.error(`Error fetching expense ${expenseId}:`, error);
    return null;
  }
}

export async function getProjectExpensesWithTransactions(
  projectExpenses: import('../types').Expense[]
): Promise<import('../types').EnrichedExpense[]> {
  try {
    await dbConnect();
    
    const ExpenseModel = (await import('@/models/Expense')).default;
    
    // Get all expense IDs
    const expenseIds = projectExpenses
      .filter(expense => expense.expenseId)
      .map(expense => expense.expenseId);

    if (expenseIds.length === 0) {
      return projectExpenses.map(expense => ({
        ...expense,
        transactions: [],
        totalPaid: 0,
        remainingAmount: expense.amount,
        paymentStatus: 'unpaid' as const
      }));
    }

    // Fetch all expenses with transactions in one query
    const expensesWithTransactions = await ExpenseModel.find({
      expenseId: { $in: expenseIds },
      source: 'project'
    }).lean();

    // Create a map for quick lookup
    const expenseMap = new Map(
      expensesWithTransactions.map(exp => [exp.expenseId, exp])
    );

    // Enrich project expenses with transaction data
    return projectExpenses.map(expense => {
      const expenseData = expenseMap.get(expense.expenseId!);
      
      if (!expenseData) {
        return {
          ...expense,
          transactions: [],
          totalPaid: 0,
          remainingAmount: expense.amount,
          paymentStatus: 'unpaid' as const
        };
      }

      const transactions = (expenseData.transactions || []) as Array<{
        _id: unknown;
        amount: number;
        date: Date | string;
        source: 'cash' | 'jazzcash' | 'easypaisa' | 'bank-transfer' | 'cheque' | 'other';
        notes?: string;
        addedBy: string;
        addedByName?: string;
        createdAt?: Date | string;
      }>;

      const totalPaid = transactions.reduce((sum, t) => sum + t.amount, 0);
      const remainingAmount = expense.amount - totalPaid;
      const paymentStatus: 'unpaid' | 'partial' | 'paid' = 
        totalPaid === 0 ? 'unpaid' : 
        totalPaid >= expense.amount ? 'paid' : 
        'partial';

      return {
        ...expense,
        transactions: transactions.map(t => {
          const { _id, ...rest } = t;
          return {
            ...rest,
            id: String(_id),
            date: t.date instanceof Date ? t.date.toISOString() : t.date,
            createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt
          };
        }),
        totalPaid,
        remainingAmount,
        paymentStatus
      };
    });
  } catch (error) {
    console.error('Error fetching expenses with transactions:', error);
    // Return expenses with default values on error
    return projectExpenses.map(expense => ({
      ...expense,
      transactions: [],
      totalPaid: 0,
      remainingAmount: expense.amount,
      paymentStatus: 'unpaid' as const
    }));
  }
}

export async function addPaymentTransaction(
  expenseId: string,
  data: import('../types').AddPaymentTransactionDto
): Promise<import('../types').ProjectExpenseWithTransactions> {
  try {
    await dbConnect();

    const ExpenseModel = (await import('@/models/Expense')).default;
    
    // Get staff name
    const staff = await Staff.findById(data.addedBy).select('firstName lastName').lean() as { firstName: string; lastName: string } | null;
    const addedByName = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';

    // Find the expense
    const expense = await ExpenseModel.findOne({ 
      expenseId,
      source: 'project'
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    // Calculate current total paid
    const currentTotalPaid = expense.transactions.reduce((sum, t) => sum + t.amount, 0);
    const remainingAmount = expense.amount - currentTotalPaid;

    // Validate payment amount
    if (data.amount > remainingAmount) {
      throw new Error(`Payment amount (${data.amount}) exceeds remaining amount (${remainingAmount})`);
    }

    // Add transaction
    const updatedExpense = await ExpenseModel.findOneAndUpdate(
      { expenseId, source: 'project' },
      {
        $push: {
          transactions: {
            amount: data.amount,
            date: data.date,
            source: data.source,
            notes: data.notes,
            addedBy: data.addedBy,
            addedByName,
            createdAt: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedExpense) {
      throw new Error('Failed to add payment transaction');
    }

    // Create audit log
    const { createAuditLog } = await import('./audit');
    const { formatCurrency } = await import('@/lib/utils');
    await createAuditLog({
      projectId: updatedExpense.projectId as string,
      action: 'payment_added',
      userId: data.addedBy,
      userName: addedByName,
      userRole: 'admin',
      description: `Added payment: ${formatCurrency(data.amount)} via ${data.source} for expense ${updatedExpense.description}`,
      metadata: {
        expenseId,
        amount: data.amount,
        source: data.source,
        notes: data.notes
      }
    });

    revalidatePath('/projects');
    revalidatePath(`/projects/${updatedExpense.projectId}`);
    revalidatePath('/expenses');

    const exp = updatedExpense as unknown as {
      _id: unknown;
      __v?: number;
      date: Date | string;
      createdAt: Date | string;
      updatedAt: Date | string;
      transactions: Array<{ _id: unknown; date: Date | string; [key: string]: unknown }>;
      totalPaid: number;
      remainingAmount: number;
      paymentStatus: 'unpaid' | 'partial' | 'paid';
      [key: string]: unknown;
    };

    const { _id, __v, ...rest } = exp;

    return {
      ...rest,
      id: String(_id),
      date: exp.date instanceof Date ? exp.date.toISOString() : exp.date,
      createdAt: exp.createdAt instanceof Date ? exp.createdAt.toISOString() : exp.createdAt,
      updatedAt: exp.updatedAt instanceof Date ? exp.updatedAt.toISOString() : exp.updatedAt,
      transactions: exp.transactions.map((transaction) => {
        const { _id: transactionId, ...transactionRest } = transaction;
        return {
          ...transactionRest,
          id: String(transactionId),
          date: transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date
        };
      })
    } as import('../types').ProjectExpenseWithTransactions;
  } catch (error) {
    console.error(`Error adding payment transaction to expense ${expenseId}:`, error);
    throw error instanceof Error ? error : new Error('Failed to add payment transaction');
  }
}

export async function deletePaymentTransaction(
  expenseId: string,
  transactionId: string,
  userId: string
): Promise<import('../types').ProjectExpenseWithTransactions> {
  try {
    await dbConnect();

    const ExpenseModel = (await import('@/models/Expense')).default;

    const expense = await ExpenseModel.findOne({ 
      expenseId,
      source: 'project'
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    // Get transaction details before deletion for audit log
    const transactionArray = expense.transactions as unknown as Array<{
      _id: unknown;
      amount: number;
      source: string;
    }>;
    const transaction = transactionArray.find(t => String(t._id) === transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const updatedExpense = await ExpenseModel.findOneAndUpdate(
      { expenseId, source: 'project' },
      { $pull: { transactions: { _id: transactionId } } },
      { new: true }
    ).lean();

    if (!updatedExpense) {
      throw new Error('Failed to delete payment transaction');
    }

    // Create audit log
    const { createAuditLog } = await import('./audit');
    const { formatCurrency } = await import('@/lib/utils');
    const staff = await Staff.findById(userId).select('firstName lastName').lean() as { firstName: string; lastName: string } | null;
    const userName = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';

    await createAuditLog({
      projectId: updatedExpense.projectId as string,
      action: 'payment_deleted',
      userId,
      userName,
      userRole: 'admin',
      description: `Deleted payment: ${formatCurrency(transaction.amount)} via ${transaction.source}`,
      metadata: {
        expenseId,
        transactionId,
        amount: transaction.amount,
        source: transaction.source
      }
    });

    revalidatePath('/projects');
    revalidatePath(`/projects/${updatedExpense.projectId}`);
    revalidatePath('/expenses');

    const exp = updatedExpense as unknown as {
      _id: unknown;
      __v?: number;
      date: Date | string;
      createdAt: Date | string;
      updatedAt: Date | string;
      transactions: Array<{ _id: unknown; date: Date | string; [key: string]: unknown }>;
      totalPaid: number;
      remainingAmount: number;
      paymentStatus: 'unpaid' | 'partial' | 'paid';
      [key: string]: unknown;
    };

    const { _id, __v, ...rest } = exp;

    return {
      ...rest,
      id: String(_id),
      date: exp.date instanceof Date ? exp.date.toISOString() : exp.date,
      createdAt: exp.createdAt instanceof Date ? exp.createdAt.toISOString() : exp.createdAt,
      updatedAt: exp.updatedAt instanceof Date ? exp.updatedAt.toISOString() : exp.updatedAt,
      transactions: exp.transactions.map((transaction) => {
        const { _id: transactionId, ...transactionRest } = transaction;
        return {
          ...transactionRest,
          id: String(transactionId),
          date: transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date
        };
      })
    } as import('../types').ProjectExpenseWithTransactions;
  } catch (error) {
    console.error(`Error deleting payment transaction ${transactionId}:`, error);
    throw error instanceof Error ? error : new Error('Failed to delete payment transaction');
  }
}

export async function getProjectExpenses(projectId: string): Promise<import('../types').ProjectExpenseWithTransactions[]> {
  try {
    await dbConnect();
    
    const ExpenseModel = (await import('@/models/Expense')).default;
    const expenses = await ExpenseModel.find({ 
      projectId,
      source: 'project'
    })
      .sort({ date: -1 })
      .lean();

    return expenses.map(expense => {
      const exp = expense as unknown as {
        _id: unknown;
        __v?: number;
        date: Date | string;
        createdAt: Date | string;
        updatedAt: Date | string;
        transactions: Array<{ _id: unknown; date: Date | string; [key: string]: unknown }>;
        totalPaid: number;
        remainingAmount: number;
        paymentStatus: 'unpaid' | 'partial' | 'paid';
        [key: string]: unknown;
      };

      const { _id, __v, ...rest } = exp;

      return {
        ...rest,
        id: String(_id),
        date: exp.date instanceof Date ? exp.date.toISOString() : exp.date,
        createdAt: exp.createdAt instanceof Date ? exp.createdAt.toISOString() : exp.createdAt,
        updatedAt: exp.updatedAt instanceof Date ? exp.updatedAt.toISOString() : exp.updatedAt,
        transactions: exp.transactions.map((transaction) => {
          const { _id: transactionId, ...transactionRest } = transaction;
          return {
            ...transactionRest,
            id: String(transactionId),
            date: transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date
          };
        })
      } as import('../types').ProjectExpenseWithTransactions;
    });
  } catch (error) {
    console.error(`Error fetching expenses for project ${projectId}:`, error);
    return [];
  }
}
