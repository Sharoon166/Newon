import mongoose, { Document, Schema, PaginateModel } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export type AuditAction = 
  | 'project_created'
  | 'project_updated'
  | 'project_status_changed'
  | 'inventory_added'
  | 'inventory_updated'
  | 'inventory_deleted'
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'staff_assigned'
  | 'staff_removed'
  | 'invoice_generated';

export interface IProjectAuditLog extends Document {
  projectId: string;
  action: AuditAction;
  userId: string;
  userName: string;
  userRole: string;
  description: string;
  metadata?: {
    itemName?: string;
    itemId?: string;
    amount?: number;
    quantity?: number;
    oldValue?: string;
    newValue?: string;
    invoiceNumber?: string;
    [key: string]: any;
  };
  createdAt: Date;
}

const projectAuditLogSchema = new Schema<IProjectAuditLog>(
  {
    projectId: {
      type: String,
      required: [true, 'Project ID is required'],
      index: true
    },
    action: {
      type: String,
      enum: [
        'project_created',
        'project_updated',
        'project_status_changed',
        'inventory_added',
        'inventory_updated',
        'inventory_deleted',
        'expense_added',
        'expense_updated',
        'expense_deleted',
        'staff_assigned',
        'staff_removed',
        'invoice_generated'
      ],
      required: [true, 'Action is required'],
      index: true
    },
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      index: true
    },
    userName: {
      type: String,
      required: [true, 'User name is required']
    },
    userRole: {
      type: String,
      required: [true, 'User role is required']
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
projectAuditLogSchema.index({ projectId: 1, createdAt: -1 });
projectAuditLogSchema.index({ userId: 1, createdAt: -1 });
projectAuditLogSchema.index({ action: 1, createdAt: -1 });

// Add pagination plugin
projectAuditLogSchema.plugin(mongoosePaginate);

// Delete the model if it exists
if (mongoose.models.ProjectAuditLog) {
  delete mongoose.models.ProjectAuditLog;
}

// Create and export the model
const ProjectAuditLog = mongoose.model<IProjectAuditLog, PaginateModel<IProjectAuditLog>>(
  'ProjectAuditLog',
  projectAuditLogSchema
);

export default ProjectAuditLog;
