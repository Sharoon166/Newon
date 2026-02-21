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
  AddInventoryDto,
  UpdateInventoryDto,
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
    inventory: leanDoc?.inventory?.map(item => {
      const { _id: itemId, ...itemRest } = item;
      return {
        ...itemRest,
        id: String(itemId),
        addedAt: toISOString(item.addedAt) as string
      };
    }),
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
function calculateVirtuals(leanDoc: LeanProject): LeanProject {
  const totalInventoryCost = leanDoc.inventory?.reduce((sum, item) => sum + (item.totalCost || 0), 0) || 0;
  const totalExpenses = leanDoc.expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
  const totalProjectCost = totalInventoryCost + totalExpenses;
  const remainingBudget = leanDoc.budget - totalProjectCost;
  
  return {
    ...leanDoc,
    totalInventoryCost,
    totalExpenses,
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
    const transformedProjects = result.docs.map((project: unknown) => 
      transformLeanProject(calculateVirtuals(project as LeanProject))
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
      calculateVirtuals(project as unknown as LeanProject)
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

    revalidatePath('/projects');

    return transformLeanProject(savedProject.toObject() as unknown as LeanProject);
  } catch (error: unknown) {
    console.error('Error creating project:', error);
    throw new Error((error as Error).message || 'Failed to create project');
  }
}

export async function updateProject(id: string, data: UpdateProjectDto): Promise<Project> {
  try {
    await dbConnect();

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

    return transformLeanProject(updatedProject as unknown as LeanProject);
  } catch (error) {
    console.error(`Error updating project ${id}:`, error);
    throw new Error((error as Error).message || 'Failed to update project');
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await dbConnect();

    const result = await ProjectModel.deleteOne({ projectId: id });

    if (result.deletedCount === 0) {
      throw new Error('Project not found');
    }

    revalidatePath('/projects');
  } catch (error) {
    console.error(`Error deleting project ${id}:`, error);
    throw new Error('Failed to delete project');
  }
}

export async function addExpense(projectId: string, data: AddExpenseDto): Promise<Project> {
  try {
    await dbConnect();

    // Get staff name
    const staff = await Staff.findById(data.addedBy).select('firstName lastName').lean() as { firstName: string; lastName: string } | null;
    const addedByName = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';

    const updatedProject = await ProjectModel.findOneAndUpdate(
      { projectId },
      {
        $push: {
          expenses: {
            ...data,
            addedByName,
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
      userRole: staff ? 'staff' : 'admin',
      description: `Added expense: ${data.description} (${data.category}) - ${formatCurrency(data.amount)}`,
      metadata: {
        amount: data.amount,
        category: data.category,
        description: data.description
      }
    });

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);

    return transformLeanProject(calculateVirtuals(updatedProject as unknown as LeanProject));
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

    return transformLeanProject(calculateVirtuals(updatedProject as unknown as LeanProject));
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

    const expense = (project.expenses as unknown as Array<{ _id: unknown; description: string; category: string; amount: number; addedBy: string }>).find((exp) => 
      String(exp._id) === expenseId
    );
    
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Check ownership: staff can only delete their own expenses, admin can delete any
    if (userRole === 'staff' && expense.addedBy !== userId) {
      throw new Error('You can only delete your own expenses');
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

    return transformLeanProject(calculateVirtuals(updatedProject as unknown as LeanProject));
  } catch (error) {
    console.error(`Error deleting expense ${expenseId}:`, error);
    throw error instanceof Error ? error : new Error('Failed to delete expense');
  }
}

// ============================================
// INVENTORY ACTIONS
// ============================================

export async function addInventoryItem(projectId: string, data: AddInventoryDto): Promise<Project> {
  try {
    await dbConnect();

    // Get staff name
    const staff = await Staff.findById(data.addedBy).select('firstName lastName').lean() as { firstName: string; lastName: string } | null;
    const addedByName = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';

    // Calculate total cost
    const totalCost = data.quantity * data.rate;

    const updatedProject = await ProjectModel.findOneAndUpdate(
      { projectId },
      {
        $push: {
          inventory: {
            ...data,
            addedByName,
            totalCost,
            addedAt: new Date()
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
      action: 'inventory_added',
      userId: data.addedBy,
      userName: addedByName,
      userRole: 'admin', // Only admins can add inventory
      description: `Added inventory: ${data.productName} (Qty: ${data.quantity}) - ${formatCurrency(totalCost)}`,
      metadata: {
        productName: data.productName,
        sku: data.sku,
        quantity: data.quantity,
        rate: data.rate,
        totalCost
      }
    });

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);

    return transformLeanProject(calculateVirtuals(updatedProject as unknown as LeanProject));
  } catch (error) {
    console.error(`Error adding inventory to project ${projectId}:`, error);
    throw new Error((error as Error).message || 'Failed to add inventory item');
  }
}

export async function updateInventoryItem(
  projectId: string,
  inventoryItemId: string,
  data: UpdateInventoryDto
): Promise<Project> {
  try {
    await dbConnect();

    // First, get the project to find the inventory item
    const project = await ProjectModel.findOne({ projectId });
    
    if (!project) {
      throw new Error('Project not found');
    }

    // Find the inventory item - use type assertion for Mongoose subdocument
    const inventoryItem = (project.inventory as unknown as Array<{ _id: unknown; quantity: number; rate: number }>)
      .find((item) => String(item._id) === inventoryItemId);
    
    if (!inventoryItem) {
      throw new Error('Inventory item not found');
    }

    // Calculate new total cost if quantity or rate changed
    const newQuantity = data.quantity ?? inventoryItem.quantity;
    const newRate = data.rate ?? inventoryItem.rate;
    const newTotalCost = newQuantity * newRate;

    const updateFields: Record<string, unknown> = {};
    if (data.quantity !== undefined) updateFields['inventory.$.quantity'] = data.quantity;
    if (data.rate !== undefined) updateFields['inventory.$.rate'] = data.rate;
    if (data.notes !== undefined) updateFields['inventory.$.notes'] = data.notes;
    updateFields['inventory.$.totalCost'] = newTotalCost;

    // Update the inventory item
    const updatedProject = await ProjectModel.findOneAndUpdate(
      { projectId, 'inventory._id': inventoryItemId },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedProject) {
      throw new Error('Failed to update inventory item');
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);

    return transformLeanProject(calculateVirtuals(updatedProject as unknown as LeanProject));
  } catch (error) {
    console.error(`Error updating inventory item ${inventoryItemId}:`, error);
    throw new Error((error as Error).message || 'Failed to update inventory item');
  }
}

export async function deleteInventoryItem(
  projectId: string, 
  inventoryItemId: string,
  userId: string,
  userName: string
): Promise<Project> {
  try {
    await dbConnect();

    // Get the inventory item before deleting for audit log
    const project = await ProjectModel.findOne({ projectId }).lean();
    if (!project) {
      throw new Error('Project not found');
    }

    const inventoryItem = (project.inventory as unknown as Array<{ _id: unknown; productName: string; sku: string; quantity: number; totalCost: number }>).find((item) => 
      String(item._id) === inventoryItemId
    );

    const updatedProject = await ProjectModel.findOneAndUpdate(
      { projectId },
      { $pull: { inventory: { _id: inventoryItemId } } },
      { new: true }
    ).lean();

    if (!updatedProject) {
      throw new Error('Project not found');
    }

    // Create audit log
    if (inventoryItem) {
      const { createAuditLog } = await import('./audit');
      const { formatCurrency } = await import('@/lib/utils');
      await createAuditLog({
        projectId,
        action: 'inventory_deleted',
        userId,
        userName,
        userRole: 'admin',
        description: `Deleted inventory: ${inventoryItem.productName} (Qty: ${inventoryItem.quantity}) - ${formatCurrency(inventoryItem.totalCost)}`,
        metadata: {
          inventoryItemId,
          productName: inventoryItem.productName,
          sku: inventoryItem.sku,
          quantity: inventoryItem.quantity,
          totalCost: inventoryItem.totalCost
        }
      });
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);

    return transformLeanProject(calculateVirtuals(updatedProject as unknown as LeanProject));
  } catch (error) {
    console.error(`Error deleting inventory item ${inventoryItemId}:`, error);
    throw new Error('Failed to delete inventory item');
  }
}

// ============================================
// PROJECT INVOICES
// ============================================

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
