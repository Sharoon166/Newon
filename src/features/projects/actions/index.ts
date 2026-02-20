'use server';

import { revalidatePath } from 'next/cache';
import type {
  Project,
  CreateProjectDto,
  UpdateProjectDto,
  ProjectFilters,
  PaginatedProjects,
  AddExpenseDto,
  UpdateExpenseDto
} from '../types';
import dbConnect from '@/lib/db';
import ProjectModel from '@/models/Project';
import Staff from '@/models/Staff';

// Type for lean Mongoose document
interface LeanProject {
  _id: Record<string, unknown>;
  projectId?: string;
  title: string;
  description: string;
  budget: number;
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled';
  startDate: Date | string;
  endDate?: Date | string;
  assignedStaff: string[];
  expenses: Array<{
    _id: Record<string, unknown>;
    expenseId?: string;
    description: string;
    amount: number;
    category: string;
    date: Date | string;
    addedBy: string;
    addedByName?: string;
    receipt?: string;
    notes?: string;
    createdAt: Date | string;
  }>;
  totalExpenses: number;
  remainingBudget: number;
  createdBy: string;
  createdByName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  __v?: number;
}

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
      lean: true
    });

    const transformedProjects = result.docs.map((project: unknown) =>
      transformLeanProject(project as LeanProject)
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

    const transformedProject = transformLeanProject(project as unknown as LeanProject);

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
    throw new Error('Failed to update project');
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

    // Recalculate totals
    await ProjectModel.findOneAndUpdate(
      { projectId },
      {
        $set: {
          totalExpenses: updatedProject.expenses.reduce((sum, exp) => sum + exp.amount, 0),
          remainingBudget: updatedProject.budget - updatedProject.expenses.reduce((sum, exp) => sum + exp.amount, 0)
        }
      }
    );

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);

    return transformLeanProject(updatedProject as unknown as LeanProject);
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

    // Recalculate totals
    await ProjectModel.findOneAndUpdate(
      { projectId },
      {
        $set: {
          totalExpenses: updatedProject.expenses.reduce((sum, exp) => sum + exp.amount, 0),
          remainingBudget: updatedProject.budget - updatedProject.expenses.reduce((sum, exp) => sum + exp.amount, 0)
        }
      }
    );

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);

    return transformLeanProject(updatedProject as unknown as LeanProject);
  } catch (error) {
    console.error(`Error updating expense ${expenseId}:`, error);
    throw new Error('Failed to update expense');
  }
}

export async function deleteExpense(projectId: string, expenseId: string): Promise<Project> {
  try {
    await dbConnect();

    const updatedProject = await ProjectModel.findOneAndUpdate(
      { projectId },
      { $pull: { expenses: { _id: expenseId } } },
      { new: true }
    ).lean();

    if (!updatedProject) {
      throw new Error('Project not found');
    }

    // Recalculate totals
    await ProjectModel.findOneAndUpdate(
      { projectId },
      {
        $set: {
          totalExpenses: updatedProject.expenses.reduce((sum, exp) => sum + exp.amount, 0),
          remainingBudget: updatedProject.budget - updatedProject.expenses.reduce((sum, exp) => sum + exp.amount, 0)
        }
      }
    );

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);

    return transformLeanProject(updatedProject as unknown as LeanProject);
  } catch (error) {
    console.error(`Error deleting expense ${expenseId}:`, error);
    throw new Error('Failed to delete expense');
  }
}
