'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Edit, 
  FileText, 
  Users, 
  TrendingUp,
  AlertCircle,
  LucideIcon
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { AuditAction } from '@/models/ProjectAuditLog';

interface AuditLog {
  _id: string;
  projectId: string;
  action: AuditAction;
  userId: string;
  userName: string;
  userRole: string;
  description: string;
  metadata?: Record<string, string | number | boolean | undefined>;
  createdAt: string;
}

interface ProjectAuditLogsProps {
  logs: AuditLog[];
  users: Array<{ id: string; name: string }>;
}

const actionConfig: Record<AuditAction, { icon: LucideIcon; color: string; bgColor: string; label: string }> = {
  project_created: { icon: Plus, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Created' },
  project_updated: { icon: Edit, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Updated' },
  project_status_changed: { icon: TrendingUp, color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'Status Changed' },
  inventory_added: { icon: Plus, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Added' },
  inventory_updated: { icon: Edit, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Updated' },
  inventory_deleted: { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-50', label: 'Deleted' },
  expense_added: { icon: Plus, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Added' },
  expense_updated: { icon: Edit, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'Updated' },
  expense_deleted: { icon: Trash2, color: 'text-red-600', bgColor: 'bg-red-50', label: 'Deleted' },
  staff_assigned: { icon: Users, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Assigned' },
  staff_removed: { icon: Users, color: 'text-red-600', bgColor: 'bg-red-50', label: 'Removed' },
  invoice_generated: { icon: FileText, color: 'text-indigo-600', bgColor: 'bg-indigo-50', label: 'Generated' }
};

export function ProjectAuditLogs({ logs, users }: ProjectAuditLogsProps) {
  const [filteredLogs, setFilteredLogs] = useState(logs);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  useEffect(() => {
    let filtered = logs;

    if (selectedUser !== 'all') {
      filtered = filtered.filter(log => log.userId === selectedUser);
    }

    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.action === selectedAction);
    }

    setFilteredLogs(filtered);
  }, [selectedUser, selectedAction, logs]);

  const actionTypes = Array.from(new Set(logs.map(log => log.action)));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Activity Log
          </CardTitle>
          <div className="flex gap-2">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map(action => (
                  <SelectItem key={action} value={action}>
                    {actionConfig[action]?.label || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No activity logs found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const config = actionConfig[log.action];
              const Icon = config?.icon || AlertCircle;

              return (
                <div
                  key={log._id}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${config?.bgColor || 'bg-gray-50'}`}>
                    <Icon className={`h-4 w-4 ${config?.color || 'text-gray-600'}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {config?.label || log.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-foreground mb-1">{log.description}</p>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{log.userName}</span>
                      <span>•</span>
                      <span className="capitalize">{log.userRole}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
