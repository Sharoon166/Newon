'use server';

import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
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
    startDate: toISOString(leanDoc.startDate) as string,
    endDate: toISOString(leanDoc.endDate),
    createdAt: toISOString(leanDoc.createdAt) as string,
    updatedAt: toISOString(leanDoc.updatedAt) as string
  } as Project;
}

// Helper function to calculate virtual fields for lean documents
async function calculateVirtuals(leanDoc: LeanProject): Promise<LeanProject> {
  let totalExpenses = 0;

  // Fetch their paid amounts from Expense collection by projectId
  if (leanDoc.projectId) {
    const ExpenseModel = (await import('@/models/Expense')).default;
    const expenses = await ExpenseModel.find({
      projectId: leanDoc.projectId,
      source: 'project'
    }).lean();

    // Sum up the total amounts (original amounts, not just what's paid)
    totalExpenses = expenses.reduce((sum, expense) => {
      return sum + (expense.amount || 0);
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

        console.log(
          `[CALCULATE VIRTUALS] Processing invoice ${invoice.invoiceNumber} with ${invoice.items.length} items`
        );

        const invoiceItemsCost = invoice.items.reduce((sum, item) => {
          // For virtual products, use component cost + custom expenses actual cost
          if (item.isVirtualProduct) {
            const componentCost = item.totalComponentCost || 0;
            const customExpensesCost = item.customExpenses?.reduce((expSum, exp) => expSum + exp.actualCost, 0) || 0;
            const itemCost = componentCost + customExpensesCost;
            console.log(
              `[CALCULATE VIRTUALS] Virtual product ${item.productName}: componentCost=${componentCost}, customExpensesCost=${customExpensesCost}, total=${itemCost}`
            );
            return sum + itemCost;
          }
          // For regular products, use originalRate * quantity (actual cost) instead of client price
          const actualCost = (item.originalRate || item.unitPrice) * item.quantity;
          console.log(
            `[CALCULATE VIRTUALS] Regular product ${item.productName}: originalRate=${item.originalRate}, unitPrice=${item.unitPrice}, quantity=${item.quantity}, actualCost=${actualCost}`
          );
          return sum + actualCost;
        }, 0);

        console.log(`[CALCULATE VIRTUALS] Invoice ${invoice.invoiceNumber} total cost: ${invoiceItemsCost}`);
        return invoiceSum + invoiceItemsCost;
      }, 0);
    }

    console.log(`[CALCULATE VIRTUALS] Total inventory cost: ${totalInventoryCost}`);
  }

  const totalProjectCost = totalExpenses + totalInventoryCost;
  const remainingBudget = leanDoc.budget - totalProjectCost;

  console.log(
    `[CALCULATE VIRTUALS] Project ${leanDoc.projectId}: budget=${leanDoc.budget}, expenses=${totalExpenses}, inventory=${totalInventoryCost}, total=${totalProjectCost}, remaining=${remainingBudget}`
  );

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
    const skip = (page - 1) * limit;

    // Build Aggregation Pipeline for performance (fixing N+1 issue)
    const pipeline: any[] = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          docs: [
            { $skip: skip },
            { $limit: limit },
            // Join with Expenses
            {
              $lookup: {
                from: 'expenses',
                localField: 'projectId',
                foreignField: 'projectId',
                as: 'projectExpenses',
                pipeline: [{ $match: { source: 'project' } }]
              }
            },
            // Join with Invoices
            {
              $lookup: {
                from: 'invoices',
                localField: 'projectId',
                foreignField: 'projectId',
                as: 'projectInvoices'
              }
            },
            // Join with Staff for assignedStaffDetails
            {
              $lookup: {
                from: 'staffs',
                let: { staffIds: '$assignedStaff' },
                pipeline: [
                  { $match: { $expr: { $in: [{ $toString: '$_id' }, '$$staffIds'] } } },
                  { $project: { firstName: 1, lastName: 1, email: 1 } }
                ],
                as: 'assignedStaffDetails'
              }
            },
            // Calculate Virtuals
            {
              $addFields: {
                totalExpenses: {
                  $reduce: {
                    input: '$projectExpenses',
                    initialValue: 0,
                    in: { $add: ['$$value', { $ifNull: ['$$this.amount', 0] }] }
                  }
                },
                totalInventoryCost: {
                  $reduce: {
                    input: '$projectInvoices',
                    initialValue: 0,
                    in: {
                      $add: [
                        '$$value',
                        {
                          $reduce: {
                            input: '$$this.items',
                            initialValue: 0,
                            in: {
                              $add: [
                                '$$value',
                                {
                                  $cond: [
                                    '$$this.isVirtualProduct',
                                    {
                                      $add: [
                                        { $ifNull: ['$$this.totalComponentCost', 0] },
                                        {
                                          $reduce: {
                                            input: { $ifNull: ['$$this.customExpenses', []] },
                                            initialValue: 0,
                                            in: { $add: ['$$value', { $ifNull: ['$$this.actualCost', 0] }] }
                                          }
                                        }
                                      ]
                                    },
                                    {
                                      $multiply: [
                                        { $ifNull: ['$$this.originalRate', { $ifNull: ['$$this.unitPrice', 0] }] },
                                        { $ifNull: ['$$this.quantity', 0] }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            },
            {
              $addFields: {
                totalProjectCost: { $add: ['$totalExpenses', '$totalInventoryCost'] }
              }
            },
            {
              $addFields: {
                remainingBudget: { $subtract: ['$budget', '$totalProjectCost'] }
              }
            },
            {
              $project: {
                projectExpenses: 0,
                projectInvoices: 0
              }
            }
          ]
        }
      }
    ];

    const [aggregateResult] = await ProjectModel.aggregate(pipeline);

    const totalDocs = aggregateResult.metadata[0]?.total || 0;
    const totalPages = Math.ceil(totalDocs / limit);

    const docs = aggregateResult.docs.map((doc: any) => {
      const { _id, assignedStaffDetails, startDate, endDate, createdAt, updatedAt, ...rest } = doc;
      return {
        ...rest,
        id: String(_id),
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
        updatedAt: updatedAt ? new Date(updatedAt).toISOString() : undefined,
        assignedStaffDetails: assignedStaffDetails?.map((staff: any) => {
          const { _id: staffId, ...staffRest } = staff;
          return {
            ...staffRest,
            id: String(staffId)
          };
        })
      };
    });

    return {
      docs,
      totalDocs,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
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

    const transformedProject = transformLeanProject(await calculateVirtuals(project as unknown as LeanProject));

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();

    // Validate customer exists
    const customer = await Customer.findOne({
      $or: [{ customerId: data.customerId }, { _id: data.customerId }]
    })
      .session(session)
      .lean();

    if (!customer) {
      throw new Error('Customer not found');
    }

    if (customer.disabled) {
      throw new Error('Cannot create project for disabled customer');
    }

    const newProject = new ProjectModel(data);
    const savedProject = await newProject.save({ session });

    // Update the invoice's projectId to link it to this project and clean up expenses
    if (data.invoiceId && savedProject.projectId) {
      await linkInvoiceToProject(savedProject.projectId, data.invoiceId, session);
    }

    // Create audit log
    const { createAuditLog } = await import('./audit');
    const staff = (await Staff.findById(savedProject.createdBy).select('firstName lastName').session(session).lean()) as {
      firstName: string;
      lastName: string;
    } | null;
    const userName = staff ? `${staff.firstName} ${staff.lastName}` : 'System';

    if (savedProject.projectId) {
      await createAuditLog({
        projectId: savedProject.projectId,
        action: 'project_updated', // Using project_updated since there is no project_created
        userId: savedProject.createdBy,
        userName,
        userRole: 'admin',
        description: `Project created: ${savedProject.title}`,
        metadata: {
          title: savedProject.title,
          budget: savedProject.budget,
          customerId: savedProject.customerId
        }
      });
    }

    await session.commitTransaction();

    revalidatePath('/projects');

    return transformLeanProject(savedProject.toObject() as unknown as LeanProject);
  } catch (error: unknown) {
    await session.abortTransaction();
    console.error('Error creating project:', error);
    throw new Error((error as Error).message || 'Failed to create project');
  } finally {
    session.endSession();
  }
}

export async function linkInvoiceToProject(
  projectId: string,
  invoiceNumberOrId: string,
  parentSession?: mongoose.ClientSession
): Promise<void> {
  const session = parentSession || (await mongoose.startSession());
  if (!parentSession) session.startTransaction();

  try {
    await dbConnect();

    // Find by either invoiceNumber or _id
    const invoiceQuery = mongoose.isValidObjectId(invoiceNumberOrId)
      ? { _id: invoiceNumberOrId }
      : { invoiceNumber: invoiceNumberOrId };

    // Parallel fetch for project and invoice
    const [project, invoice] = await Promise.all([
      ProjectModel.findOne({ projectId }).session(session).lean(),
      InvoiceModel.findOne(invoiceQuery).session(session).lean()
    ]);

    if (!project) throw new Error('Project not found');
    if (!invoice) throw new Error('Invoice not found');

    if (invoice.status === 'cancelled') {
      throw new Error('Cannot link cancelled invoice to project');
    }

    if (invoice.customerId !== project.customerId) {
      throw new Error('Invoice must belong to the same customer as the project');
    }

    if (invoice.projectId && invoice.projectId !== projectId) {
      throw new Error('Invoice is already linked to another project');
    }

    if (invoice.projectId === projectId) {
      throw new Error('Invoice is already linked to this project');
    }

    // Find any previously linked invoice to this project
    const previouslyLinkedInvoice = await InvoiceModel.findOne({
      projectId,
      invoiceNumber: { $ne: invoice.invoiceNumber }
    })
      .session(session)
      .lean();

    if (previouslyLinkedInvoice) {
      console.log(
        `[LINK INVOICE] Found previously linked invoice ${previouslyLinkedInvoice.invoiceNumber}, recreating its expenses`
      );

      const customExpensesToRecreate = previouslyLinkedInvoice.items.flatMap((item) =>
        (item.customExpenses || []).map((expense) => ({
          name: expense.name,
          actualCost: expense.actualCost,
          clientCost: expense.clientCost,
          category: expense.category,
          description: expense.description
        }))
      );

      if (customExpensesToRecreate.length > 0) {
        const { createInvoiceExpenses } = await import('@/features/expenses/actions');
        await createInvoiceExpenses(
          previouslyLinkedInvoice._id.toString(),
          previouslyLinkedInvoice.invoiceNumber,
          previouslyLinkedInvoice.date instanceof Date
            ? previouslyLinkedInvoice.date
            : new Date(previouslyLinkedInvoice.date),
          customExpensesToRecreate,
          previouslyLinkedInvoice.createdBy,
          undefined,
          session
        );
      }

      await InvoiceModel.findOneAndUpdate(
        { invoiceNumber: previouslyLinkedInvoice.invoiceNumber },
        { $unset: { projectId: '' } },
        { session }
      );
    }

    const ExpenseModel = (await import('@/models/Expense')).default;

    // Execute updates sequentially to avoid concurrent session usage issues
    await ExpenseModel.deleteMany({ invoiceId: invoice._id.toString(), source: 'invoice' }, { session });
    await InvoiceModel.findOneAndUpdate({ invoiceNumber: invoice.invoiceNumber }, { $set: { projectId } }, { session });
    await ProjectModel.findOneAndUpdate({ projectId }, { $set: { invoiceId: invoice._id.toString() } }, { session });

    if (!parentSession) await session.commitTransaction();

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoice._id.toString()}`);
    revalidatePath('/expenses');
  } catch (error) {
    if (!parentSession) await session.abortTransaction();
    console.error(`Error linking invoice ${invoiceNumberOrId} to project ${projectId}:`, error);
    throw new Error((error as Error).message || 'Failed to link invoice to project');
  } finally {
    if (!parentSession) session.endSession();
  }
}

export async function unlinkInvoiceFromProject(projectId: string, invoiceNumberOrId: string): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();

    // Find by either invoiceNumber or _id
    const invoiceQuery = mongoose.isValidObjectId(invoiceNumberOrId)
      ? { _id: invoiceNumberOrId }
      : { invoiceNumber: invoiceNumberOrId };

    const [project, invoice] = await Promise.all([
      ProjectModel.findOne({ projectId }).session(session).lean(),
      InvoiceModel.findOne(invoiceQuery).session(session).lean()
    ]);

    if (!project) throw new Error('Project not found');
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.projectId !== projectId) throw new Error('Invoice is not linked to this project');

    console.log(`[UNLINK INVOICE] Unlinking invoice ${invoice.invoiceNumber} from project ${projectId}`);

    const customExpensesToRecreate = invoice.items.flatMap((item) =>
      (item.customExpenses || []).map((expense) => ({
        name: expense.name,
        actualCost: expense.actualCost,
        clientCost: expense.clientCost,
        category: expense.category,
        description: expense.description
      }))
    );

    if (customExpensesToRecreate.length > 0) {
      const { createInvoiceExpenses } = await import('@/features/expenses/actions');
      await createInvoiceExpenses(
        invoice._id.toString(),
        invoice.invoiceNumber,
        invoice.date instanceof Date ? invoice.date : new Date(invoice.date),
        customExpensesToRecreate,
        invoice.createdBy,
        undefined,
        session
      );
    }

    // Execute updates sequentially
    await InvoiceModel.findOneAndUpdate({ invoiceNumber: invoice.invoiceNumber }, { $unset: { projectId: '' } }, { session });
    await ProjectModel.findOneAndUpdate({ projectId }, { $unset: { invoiceId: '' } }, { session });

    await session.commitTransaction();

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoice._id.toString()}`);
    revalidatePath('/expenses');
  } catch (error) {
    await session.abortTransaction();
    console.error(`Error unlinking invoice ${invoiceNumberOrId} from project ${projectId}:`, error);
    throw new Error((error as Error).message || 'Failed to unlink invoice from project');
  } finally {
    session.endSession();
  }
}

export async function updateProject(id: string, data: UpdateProjectDto, userRole?: string): Promise<Project> {
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
        $or: [{ customerId: data.customerId }, { _id: data.customerId }]
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

    // Create audit log
    const { createAuditLog } = await import('./audit');
    const staff = (await Staff.findById(updatedProject.createdBy).select('firstName lastName').lean()) as {
      firstName: string;
      lastName: string;
    } | null;
    const userName = staff ? `${staff.firstName} ${staff.lastName}` : 'System';
    if (updatedProject.projectId) {
      await createAuditLog({
        projectId: updatedProject.projectId,
        action: 'project_updated',
        userId: updatedProject.createdBy, // We might want to pass the actual user performing the update here
        userName,
        userRole: userRole || 'admin',
        description: `Project updated: ${updatedProject.title}`,
        metadata: Object.keys(updateData).reduce(
          (acc, key) => {
            if (key !== 'updatedAt') {
              acc[key] = updateData[key];
            }
            return acc;
          },
          {} as Record<string, any>
        )
      });
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

export async function cancelProject(id: string, reason?: string): Promise<Project> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();

    const project = await ProjectModel.findOne({ projectId: id }).session(session).lean();

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.status === 'cancelled') {
      throw new Error('Project is already cancelled');
    }

    console.log(`[CANCEL PROJECT] Cancelling project ${id}`);

    const tasks: Promise<any>[] = [];

    // Step 1: Delete all project expenses from Expense collection
    const ExpenseModel = (await import('@/models/Expense')).default;
    tasks.push(
      ExpenseModel.deleteMany(
        {
          projectId: id,
          source: 'project'
        },
        { session }
      )
    );

    // Step 2: Unlink invoice if one is linked
    const InvoiceModel = (await import('@/models/Invoice')).default;
    const linkedInvoice = await InvoiceModel.findOne({ projectId: id }).session(session).lean();

    if (linkedInvoice) {
      console.log(`[CANCEL PROJECT] Found linked invoice ${linkedInvoice.invoiceNumber}, unlinking and recreating expenses`);

      const customExpensesToRecreate = linkedInvoice.items.flatMap((item) =>
        (item.customExpenses || []).map((expense) => ({
          name: expense.name,
          actualCost: expense.actualCost,
          clientCost: expense.clientCost,
          category: expense.category,
          description: expense.description
        }))
      );

      // Recreate these expenses in the Expense collection (without projectId)
      if (customExpensesToRecreate.length > 0) {
        const { createInvoiceExpenses } = await import('@/features/expenses/actions');
        tasks.push(
          createInvoiceExpenses(
            linkedInvoice._id.toString(),
            linkedInvoice.invoiceNumber,
            linkedInvoice.date instanceof Date ? linkedInvoice.date : new Date(linkedInvoice.date),
            customExpensesToRecreate,
            linkedInvoice.createdBy,
            undefined,
            session
          )
        );
      }

      // Remove projectId from the invoice
      tasks.push(
        InvoiceModel.findOneAndUpdate({ invoiceNumber: linkedInvoice.invoiceNumber }, { $unset: { projectId: '' } }, { session })
      );

      // Also remove invoiceId from the project
      tasks.push(ProjectModel.findOneAndUpdate({ projectId: id }, { $unset: { invoiceId: '' } }, { session }));
    }

    // Step 3: Update project status to cancelled
    tasks.push(
      ProjectModel.findOneAndUpdate(
        { projectId: id },
        {
          $set: {
            status: 'cancelled',
            ...(reason && {
              description: project.description
                ? `${project.description}\n\nCancellation Reason: ${reason}`
                : `Cancellation Reason: ${reason}`
            })
          }
        },
        { new: true, runValidators: true, session }
      ).lean()
    );

    const results = await Promise.all(tasks);
    const updatedProject = results[results.length - 1];

    if (!updatedProject) {
      throw new Error('Failed to cancel project');
    }

    // Create audit log
    const { createAuditLog } = await import('./audit');
    const staff = (await Staff.findById(project.createdBy).select('firstName lastName').session(session).lean()) as {
      firstName: string;
      lastName: string;
    } | null;
    const userName = staff ? `${staff.firstName} ${staff.lastName}` : 'System';

    await createAuditLog({
      projectId: id,
      action: 'project_cancelled',
      userId: project.createdBy,
      userName,
      userRole: 'admin',
      description: `Project cancelled${reason ? `: ${reason}` : ''}`,
      metadata: {
        reason
      }
    });

    await session.commitTransaction();

    console.log(`[CANCEL PROJECT] Successfully cancelled project ${id}`);

    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`);
    revalidatePath('/dashboard');
    revalidatePath('/invoices');
    revalidatePath('/expenses');

    return transformLeanProject(await calculateVirtuals(updatedProject as unknown as LeanProject));
  } catch (error) {
    await session.abortTransaction();
    console.error(`[CANCEL PROJECT] Error cancelling project ${id}:`, error);
    throw new Error((error as Error).message || 'Failed to cancel project');
  } finally {
    session.endSession();
  }
}

export async function addExpense(
  projectId: string,
  data: AddExpenseDto,
  userRole: string
): Promise<Project> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();

    // Get staff name
    const staff = (await Staff.findById(data.addedBy).select('firstName lastName').session(session).lean()) as {
      firstName: string;
      lastName: string;
    } | null;
    const addedByName = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';

    // Create expense in Expense collection only
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
      transactions: userRole === 'admin' ? [{
        amount: data.amount,
        date: data.date,
        source: 'cash', // Default source for auto-pay
        notes: 'Automatically paid (Admin addition)',
        addedBy: data.addedBy,
        addedByName,
        createdAt: new Date()
      }] : []
    };

    const newExpense = new ExpenseModel(expenseData);
    const savedExpense = await newExpense.save({ session });

    // Verify project exists
    const project = await ProjectModel.findOne({ projectId }).session(session).lean();
    if (!project) {
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
      description: `Added expense: ${data.description} (${data.category}) - ${formatCurrency(data.amount)} (pending payment)`,
      metadata: {
        expenseId: savedExpense.expenseId,
        amount: data.amount,
        category: data.category,
        description: data.description
      }
    });

    await session.commitTransaction();

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/dashboard');
    revalidatePath('/expenses');

    const calculatedProject = await calculateVirtuals(project as unknown as LeanProject);
    return transformLeanProject(calculatedProject);
  } catch (error) {
    await session.abortTransaction();
    console.error(`Error adding expense to project ${projectId}:`, error);
    throw new Error((error as Error).message || 'Failed to add expense');
  } finally {
    session.endSession();
  }
}

export async function updateExpense(
  projectId: string,
  expenseIdOrId: string,
  data: UpdateExpenseDto
): Promise<Project> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();

    const ExpenseModel = (await import('@/models/Expense')).default;
    const updateData = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));

    // Find by either expenseId (custom) or _id (mongo)
    const expenseQuery = mongoose.isValidObjectId(expenseIdOrId)
      ? { _id: expenseIdOrId, projectId, source: 'project' }
      : { expenseId: expenseIdOrId, projectId, source: 'project' };

    const updatedExpense = await ExpenseModel.findOneAndUpdate(
      expenseQuery,
      { $set: updateData },
      { new: true, session, runValidators: true }
    ).lean();

    if (!updatedExpense) {
      throw new Error('Expense not found');
    }

    const project = await ProjectModel.findOne({ projectId }).session(session).lean();
    if (!project) {
      throw new Error('Project not found');
    }

    await session.commitTransaction();

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/dashboard');
    revalidatePath('/expenses');

    const calculatedProject = await calculateVirtuals(project as unknown as LeanProject);
    return transformLeanProject(calculatedProject);
  } catch (error) {
    await session.abortTransaction();
    console.error(`Error updating expense ${expenseIdOrId}:`, error);
    throw new Error((error as Error).message || 'Failed to update expense');
  } finally {
    session.endSession();
  }
}

export async function deleteExpense(
  projectId: string,
  expenseIdOrId: string,
  userId: string,
  userRole: string
): Promise<Project> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();

    // First, get the project to check status
    const project = await ProjectModel.findOne({ projectId }).session(session).lean();
    if (!project) {
      throw new Error('Project not found');
    }

    // Check project status
    if (userRole === 'staff' && ['on-hold', 'completed', 'cancelled'].includes(project.status)) {
      throw new Error(`Cannot delete expenses from ${project.status} projects`);
    }

    const ExpenseModel = (await import('@/models/Expense')).default;

    // Find by either expenseId (custom) or _id (mongo)
    const expenseQuery = mongoose.isValidObjectId(expenseIdOrId)
      ? { _id: expenseIdOrId, projectId, source: 'project' }
      : { expenseId: expenseIdOrId, projectId, source: 'project' };

    const expense = await ExpenseModel.findOne(expenseQuery).session(session).lean();

    if (!expense) {
      throw new Error('Expense not found');
    }

    // Check ownership: staff can only delete their own expenses, admin can delete any
    if (userRole === 'staff' && expense.addedBy !== userId) {
      throw new Error('You can only delete your own expenses');
    }

    // Delete from Expense collection using its internal _id for precision
    await ExpenseModel.deleteOne({ _id: expense._id }, { session });

    // Create audit log
    const { createAuditLog } = await import('./audit');
    const { formatCurrency } = await import('@/lib/utils');
    const staff = (await Staff.findById(userId).select('firstName lastName').session(session).lean()) as {
      firstName: string;
      lastName: string;
    } | null;
    const userName = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';

    await createAuditLog({
      projectId,
      action: 'expense_deleted',
      userId,
      userName,
      userRole,
      description: `Deleted expense: ${expense.description} (${expense.category}) - ${formatCurrency(expense.amount)}`,
      metadata: {
        expenseId: expense.expenseId,
        id: String(expense._id),
        amount: expense.amount,
        category: expense.category,
        description: expense.description
      }
    });

    await session.commitTransaction();

    revalidatePath('/projects');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath('/dashboard');
    revalidatePath('/expenses');

    const calculatedProject = await calculateVirtuals(project as unknown as LeanProject);
    return transformLeanProject(calculatedProject);
  } catch (error) {
    await session.abortTransaction();
    console.error(`Error deleting expense ${expenseIdOrId}:`, error);
    throw error instanceof Error ? error : new Error('Failed to delete expense');
  } finally {
    session.endSession();
  }
}
// ============================================
// PROJECT INVOICES
// ============================================

export async function getProjectInvoice(projectId: string): Promise<Invoice | null> {
  if (!projectId) return null;
  try {
    await dbConnect();

    // Find the invoice currently linked to this project
    const invoice = await InvoiceModel.findOne({ projectId }).lean();
    if (!invoice) return null;

    // Transform to Invoice type
    const { getInvoice } = await import('@/features/invoices/actions');
    return await getInvoice(invoice._id.toString());

    // return invoice;
  } catch (error) {
    console.error('Error fetching project invoice:', error);
    return null;
  }
}

export async function getProjectInvoices(projectId: string): Promise<Invoice[]> {
  try {
    await dbConnect();

    const invoices = await InvoiceModel.find({ projectId }).sort({ date: -1 }).lean();

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
        validUntil: inv.validUntil
          ? inv.validUntil instanceof Date
            ? inv.validUntil.toISOString()
            : inv.validUntil
          : undefined,
        createdAt: inv.createdAt instanceof Date ? inv.createdAt.toISOString() : inv.createdAt,
        updatedAt: inv.updatedAt instanceof Date ? inv.updatedAt.toISOString() : inv.updatedAt,
        items: inv.items.map(item => {
          const { _id: itemId, ...itemRest } = item;
          return {
            ...itemRest,
            id: String(itemId)
          };
        }),
        payments:
          inv.payments?.map(payment => {
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
  expenseIdOrId: string
): Promise<import('../types').ProjectExpenseWithTransactions | null> {
  try {
    await dbConnect();

    const ExpenseModel = (await import('@/models/Expense')).default;

    // Find by either expenseId (custom) or _id (mongo)
    const expenseQuery = mongoose.isValidObjectId(expenseIdOrId)
      ? { _id: expenseIdOrId, source: 'project' }
      : { expenseId: expenseIdOrId, source: 'project' };

    const expense = await ExpenseModel.findOne(expenseQuery).lean();

    if (!expense) {
      return null;
    }

    const exp = expense as unknown as {
      _id: unknown;
      expenseId: string;
      description: string;
      amount: number;
      category: any;
      date: Date | string;
      addedBy: string;
      addedByName?: string;
      addedByRole: 'admin' | 'staff';
      receipt?: string;
      notes?: string;
      createdAt: Date | string;
      updatedAt: Date | string;
      transactions: Array<{
        _id: unknown;
        amount: number;
        date: Date | string;
        source: string;
        notes?: string;
        addedBy: string;
        addedByName?: string;
        createdAt?: Date | string;
      }>;
    };

    const totalPaid = exp.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const remainingAmount = (exp.amount || 0) - totalPaid;
    const paymentStatus: 'unpaid' | 'partial' | 'paid' =
      totalPaid === 0 ? 'unpaid' : totalPaid >= (exp.amount || 0) ? 'paid' : 'partial';

    return {
      id: String(exp._id),
      expenseId: exp.expenseId,
      description: exp.description,
      amount: exp.amount,
      category: exp.category,
      date: exp.date instanceof Date ? exp.date.toISOString() : exp.date,
      addedBy: exp.addedBy,
      addedByName: exp.addedByName,
      addedByRole: exp.addedByRole,
      receipt: exp.receipt,
      notes: exp.notes,
      createdAt: exp.createdAt instanceof Date ? exp.createdAt.toISOString() : exp.createdAt,
      updatedAt: exp.updatedAt instanceof Date ? exp.updatedAt.toISOString() : exp.updatedAt,
      transactions: exp.transactions.map((transaction) => {
        const { _id: transactionId, ...transactionRest } = transaction;
        return {
          ...transactionRest,
          id: String(transactionId),
          date: transaction.date instanceof Date ? transaction.date.toISOString() : transaction.date,
          createdAt:
            transaction.createdAt instanceof Date ? transaction.createdAt.toISOString() : transaction.createdAt
        };
      }),
      totalPaid,
      remainingAmount,
      paymentStatus
    } as import('../types').ProjectExpenseWithTransactions;
  } catch (error) {
    console.error(`Error fetching expense ${expenseIdOrId}:`, error);
    return null;
  }
}

export async function getProjectExpensesWithTransactions(
  projectId: string
): Promise<import('../types').EnrichedExpense[]> {
  try {
    await dbConnect();

    const ExpenseModel = (await import('@/models/Expense')).default;

    // Fetch all expenses for this project from the Expense collection
    const projectExpenses = await ExpenseModel.find({
      projectId,
      source: 'project'
    }).lean();

    if (projectExpenses.length === 0) {
      return [];
    }

    // Transform and enrich with transaction data
    return projectExpenses.map((expense) => {
      const exp = expense as unknown as {
        _id: unknown;
        expenseId: string;
        description: string;
        amount: number;
        category: any;
        date: Date | string;
        addedBy: string;
        addedByName?: string;
        addedByRole: 'admin' | 'staff';
        receipt?: string;
        notes?: string;
        transactions: Array<{
          _id: unknown;
          amount: number;
          date: Date | string;
          source: string;
          notes?: string;
          addedBy: string;
          addedByName?: string;
          createdAt?: Date | string;
        }>;
      };

      const totalPaid = exp.transactions.reduce((sum, t) => sum + t.amount, 0);
      const remainingAmount = exp.amount - totalPaid;
      const paymentStatus: 'unpaid' | 'partial' | 'paid' =
        totalPaid === 0 ? 'unpaid' : totalPaid >= exp.amount ? 'paid' : 'partial';

      return {
        id: String(exp._id),
        expenseId: exp.expenseId,
        description: exp.description,
        amount: exp.amount,
        category: exp.category,
        date: exp.date instanceof Date ? exp.date.toISOString() : exp.date,
        addedBy: exp.addedBy,
        addedByName: exp.addedByName,
        addedByRole: exp.addedByRole,
        receipt: exp.receipt,
        notes: exp.notes,
        transactions: exp.transactions.map((t) => {
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
      } as unknown as import('../types').EnrichedExpense;
    });
  } catch (error) {
    console.error('Error fetching expenses with transactions:', error);
    return [];
  }
}

export async function addPaymentTransaction(
  expenseIdOrId: string,
  data: import('../types').AddPaymentTransactionDto
): Promise<import('../types').ProjectExpenseWithTransactions> {
  try {
    await dbConnect();

    const ExpenseModel = (await import('@/models/Expense')).default;

    // Get staff name
    const staff = (await Staff.findById(data.addedBy).select('firstName lastName').lean()) as {
      firstName: string;
      lastName: string;
    } | null;
    const addedByName = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';

    // Find by either expenseId (custom) or _id (mongo)
    const expenseQuery = mongoose.isValidObjectId(expenseIdOrId)
      ? { _id: expenseIdOrId, source: 'project' }
      : { expenseId: expenseIdOrId, source: 'project' };

    // Find the expense
    const expense = await ExpenseModel.findOne(expenseQuery);

    if (!expense) {
      throw new Error('Expense not found');
    }

    // Calculate current total paid
    const currentTotalPaid = expense.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const remainingAmount = (expense.amount || 0) - currentTotalPaid;

    // Validate payment amount
    if (data.amount > remainingAmount) {
      throw new Error(`Payment amount (${data.amount}) exceeds remaining amount (${remainingAmount})`);
    }

    // Add transaction
    const updatedExpense = await ExpenseModel.findOneAndUpdate(
      expenseQuery,
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
        expenseId: updatedExpense.expenseId,
        id: String(updatedExpense._id),
        amount: data.amount,
        source: data.source,
        notes: data.notes
      }
    });

    revalidatePath('/projects');
    revalidatePath(`/projects/${updatedExpense.projectId}`);
    revalidatePath('/expenses');

    return (await getProjectExpenseWithTransactions(String(updatedExpense._id)))!;
  } catch (error) {
    console.error(`Error adding payment transaction to expense ${expenseIdOrId}:`, error);
    throw error instanceof Error ? error : new Error('Failed to add payment transaction');
  }
}

export async function deletePaymentTransaction(
  expenseIdOrId: string,
  transactionId: string,
  userId: string
): Promise<import('../types').ProjectExpenseWithTransactions> {
  try {
    await dbConnect();

    const ExpenseModel = (await import('@/models/Expense')).default;

    // Find by either expenseId (custom) or _id (mongo)
    const expenseQuery = mongoose.isValidObjectId(expenseIdOrId)
      ? { _id: expenseIdOrId, source: 'project' }
      : { expenseId: expenseIdOrId, source: 'project' };

    const expense = await ExpenseModel.findOne(expenseQuery);

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
      expenseQuery,
      { $pull: { transactions: { _id: transactionId } } },
      { new: true }
    ).lean();

    if (!updatedExpense) {
      throw new Error('Failed to delete payment transaction');
    }

    // Create audit log
    const { createAuditLog } = await import('./audit');
    const { formatCurrency } = await import('@/lib/utils');
    const staff = (await Staff.findById(userId).select('firstName lastName').lean()) as {
      firstName: string;
      lastName: string;
    } | null;
    const userName = staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';

    await createAuditLog({
      projectId: updatedExpense.projectId as string,
      action: 'payment_deleted',
      userId,
      userName,
      userRole: 'admin',
      description: `Deleted payment: ${formatCurrency(transaction.amount)} via ${transaction.source}`,
      metadata: {
        expenseId: updatedExpense.expenseId,
        id: String(updatedExpense._id),
        transactionId,
        amount: transaction.amount,
        source: transaction.source
      }
    });

    revalidatePath('/projects');
    revalidatePath(`/projects/${updatedExpense.projectId}`);
    revalidatePath('/expenses');

    return (await getProjectExpenseWithTransactions(String(updatedExpense._id)))!;
  } catch (error) {
    console.error(`Error deleting payment transaction ${transactionId} for expense ${expenseIdOrId}:`, error);
    throw error instanceof Error ? error : new Error('Failed to delete payment transaction');
  }
}

export async function getProjectExpenses(
  projectId: string
): Promise<import('../types').ProjectExpenseWithTransactions[]> {
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
        transactions: exp.transactions.map(transaction => {
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
