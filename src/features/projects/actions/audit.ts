'use server';

import dbConnect from '@/lib/db';
import ProjectAuditLog, { AuditAction } from '@/models/ProjectAuditLog';

interface CreateAuditLogParams {
  projectId: string;
  action: AuditAction;
  userId: string;
  userName: string;
  userRole: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    await dbConnect();

    const auditLog = await ProjectAuditLog.create(params);

    return { success: true, auditLog: JSON.parse(JSON.stringify(auditLog)) };
  } catch (error) {
    console.error('Error creating audit log:', error);
    return { success: false, error: 'Failed to create audit log' };
  }
}

export async function getProjectAuditLogs(
  projectId: string,
  options?: {
    action?: AuditAction;
    userId?: string;
    limit?: number;
    page?: number;
  }
) {
  try {
    await dbConnect();

    const query: Record<string, unknown> = { projectId };

    if (options?.action) {
      query.action = options.action;
    }

    if (options?.userId) {
      query.userId = options.userId;
    }

    const logs = await ProjectAuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(options?.limit || 100)
      .skip(((options?.page || 1) - 1) * (options?.limit || 100))
      .lean();

    const total = await ProjectAuditLog.countDocuments(query);

    return {
      success: true,
      logs: JSON.parse(JSON.stringify(logs)),
      total,
      page: options?.page || 1,
      limit: options?.limit || 100
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { success: false, error: 'Failed to fetch audit logs', logs: [], total: 0 };
  }
}
