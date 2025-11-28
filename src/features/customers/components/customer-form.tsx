'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Customer, CreateCustomerDto, UpdateCustomerDto } from '../types';
import { createCustomer, updateCustomer } from '../actions';

const customerFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.'
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.'
  }).optional().or(z.literal('')),
  company: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional()
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  initialData?: Customer;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CustomerForm({ initialData, onSuccess, onCancel }: CustomerFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!initialData;

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      company: initialData?.company || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      zip: initialData?.zip || ''
    }
  });

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      setLoading(true);

      // Transform empty strings to undefined for optional fields, but keep non-empty strings
      const transformedData = {
        ...data,
        email: data.email?.trim() || null,
        company: data.company?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        zip: data.zip?.trim() || null
      };

      if (isEditMode && initialData) {
        // For updates, only include non-null/non-empty optional fields
        const updateData: UpdateCustomerDto = {
          name: data.name
        };

        // Add optional fields only if they have values
        if (transformedData.email) updateData.email = transformedData.email;
        if (transformedData.company) updateData.company = transformedData.company;
        if (transformedData.phone) updateData.phone = transformedData.phone;
        if (transformedData.address) updateData.address = transformedData.address;
        if (transformedData.city) updateData.city = transformedData.city;
        if (transformedData.state) updateData.state = transformedData.state;
        if (transformedData.zip) updateData.zip = transformedData.zip;

        await updateCustomer(initialData.customerId || "otc", updateData);
        toast.success('Customer updated successfully');
      } else {
        // For creation, ensure required fields are present
        const createData: CreateCustomerDto = {
          name: data.name
        };

        // Add optional fields only if they have values
        if (transformedData.email) createData.email = transformedData.email;
        if (transformedData.company) createData.company = transformedData.company;
        if (transformedData.phone) createData.phone = transformedData.phone;
        if (transformedData.address) createData.address = transformedData.address;
        if (transformedData.city) createData.city = transformedData.city;
        if (transformedData.state) createData.state = transformedData.state;
        if (transformedData.zip) createData.zip = transformedData.zip;

        await createCustomer(createData);
        toast.success('Customer created successfully');
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred while saving the customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john.doe@example.com" {...field} disabled={isEditMode} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corporation" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+1 (555) 123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main Street" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="New York" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="NY" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="zip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP Code</FormLabel>
                <FormControl>
                  <Input placeholder="10001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Update Customer' : 'Add Customer'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
