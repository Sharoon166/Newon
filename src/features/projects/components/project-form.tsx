'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { createProject, updateProject } from '../actions';
import { CreateProjectDto, UpdateProjectDto, Project, ProjectStatus } from '../types';
import { ProjectCustomerSelector } from './project-customer-selector';
import type { Customer } from '@/features/customers/types';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

interface ProjectFormProps {
  project?: Project;
  customers: Customer[];
  staffMembers: Array<{ id: string; firstName: string; lastName: string; email: string }>;
  currentUserId: string;
  canViewBudget?: boolean;
}

export function ProjectForm({ project, customers, staffMembers, currentUserId, canViewBudget = true }: ProjectFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(
    project?.startDate ? new Date(project.startDate) : undefined
  );
  const [endDate, setEndDate] = useState<Date | undefined>(
    project?.endDate ? new Date(project.endDate) : undefined
  );
  const [selectedStaff, setSelectedStaff] = useState<string[]>(project?.assignedStaff || []);
  
  // Find initial customer if editing
  const initialCustomer = project 
    ? customers.find(c => c.customerId === project.customerId || c.id === project.customerId)
    : null;
  
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer || null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      title: project?.title || '',
      description: project?.description || '',
      budget: project?.budget || 0,
      status: (project?.status as ProjectStatus) || 'planning'
    }
  });

  const status = watch('status');

  const onSubmit = async (data: {
    title: string;
    description: string;
    budget: number;
    status: ProjectStatus;
  }) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    try {
      setIsSubmitting(true);

      if (project) {
        // Update existing project
        const updateData: UpdateProjectDto = {
          customerId: selectedCustomer.customerId || selectedCustomer.id,
          customerName: selectedCustomer.name,
          title: data.title,
          description: data.description,
          budget: Number(data.budget),
          status: data.status,
          startDate,
          endDate: endDate || undefined,
          assignedStaff: selectedStaff
        };

        await updateProject(project.projectId!, updateData);
        toast.success('Project updated successfully');
        router.push(`/projects/${project.projectId}`);
      } else {
        // Create new project
        const createData: CreateProjectDto = {
          customerId: selectedCustomer.customerId || selectedCustomer.id,
          customerName: selectedCustomer.name,
          title: data.title,
          description: data.description,
          budget: Number(data.budget),
          status: data.status,
          startDate,
          endDate: endDate || undefined,
          assignedStaff: selectedStaff,
          createdBy: currentUserId
        };

        const newProject = await createProject(createData);
        toast.success('Project created successfully');
        router.push(`/projects/${newProject.projectId}`);
      }
    } catch (error) {
      toast.error((error as Error).message || (project ? 'Failed to update project' : 'Failed to create project'));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStaff = (staffId: string) => {
    setSelectedStaff(prev => (prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer Selection */}
      <ProjectCustomerSelector
        customers={customers}
        selectedCustomer={selectedCustomer}
        onCustomerSelect={setSelectedCustomer}
        disabled={project !== undefined && (project.inventory.length > 0 || project.expenses.length > 0)}
        showFinancials={canViewBudget}
      />

      {project && (project.inventory.length > 0 || project.expenses.length > 0) && (
        <p className="text-sm text-muted-foreground">
          Customer cannot be changed because this project has inventory or expenses.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">
            Project Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            {...register('title', { required: 'Title is required' })}
            placeholder="Enter project title"
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">
            Budget <span className="text-destructive">*</span>
          </Label>
          <Input
            id="budget"
            type="number"
            step="0.01"
            {...register('budget', {
              required: 'Budget is required',
              min: { value: 0, message: 'Budget must be positive' }
            })}
            placeholder="0.00"
          />
          {errors.budget && <p className="text-sm text-destructive">{errors.budget.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          {...register('description', { required: 'Description is required' })}
          placeholder="Enter project description"
          rows={4}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={value => setValue('status', value as ProjectStatus)}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>
            Start Date <span className="text-destructive">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>End Date (Optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Assign Staff Members</Label>
        <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
          {staffMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff members available</p>
          ) : (
            staffMembers.map(staff => (
              <div key={staff.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`staff-${staff.id}`}
                  checked={selectedStaff.includes(staff.id)}
                  onCheckedChange={() => toggleStaff(staff.id)}
                />
                <label
                  htmlFor={`staff-${staff.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {staff.firstName} {staff.lastName}
                  <span className="text-muted-foreground ml-2">({staff.email})</span>
                </label>
              </div>
            ))
          )}
        </div>
        <p className="text-sm text-muted-foreground">{selectedStaff.length} staff member(s) selected</p>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {project ? 'Update Project' : 'Create Project'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
