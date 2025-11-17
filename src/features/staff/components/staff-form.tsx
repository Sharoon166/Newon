'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { StaffMember, CreateStaffDto, UpdateStaffDto } from '../types';
import { createStaffMember, updateStaffMember } from '../actions';

const staffFormSchema = z.object({
  firstName: z.string().min(2, {
    message: 'First name must be at least 2 characters.',
  }),
  lastName: z.string().min(2, {
    message: 'Last name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  phoneNumber: z.string().optional(),
  role: z.string().min(1, 'Please select a role.'),
  password: z.string().min(8, {
    message: 'Password must be at least 8 characters.',
  }).optional().or(z.literal('')),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

interface StaffFormProps {
  initialData?: StaffMember;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StaffForm({ initialData, onSuccess, onCancel }: StaffFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isEditMode = !!initialData;

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phoneNumber: initialData?.phoneNumber || '',
      role: initialData?.role || '',
      password: '',
    },
  });

  const onSubmit = async (data: StaffFormValues) => {
    try {
      setLoading(true);
      
      if (isEditMode && initialData) {
        const updateData: UpdateStaffDto = { ...data };
        if (!updateData.password) {
          delete updateData.password;
        }
        
        await updateStaffMember(initialData.id, updateData);
        toast.success('Staff member updated successfully');
      } else {
        await createStaffMember(data as CreateStaffDto);
        toast.success('Staff member created successfully');
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/staff');
        router.refresh();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while saving the staff member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="+92 300 1234567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isEditMode ? 'New Password (leave blank to keep current)' : 'Password'}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onCancel ? onCancel() : router.push('/staff')} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Update Staff' : 'Add Staff'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
