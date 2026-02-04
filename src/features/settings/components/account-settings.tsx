'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { AtSign, Eye, EyeOff, Loader2, Lock, Save, User } from 'lucide-react';
import { toast } from 'sonner';
import { updateAdminAccount } from '../actions';

const accountFormSchema = z
  .object({
    firstName: z.string().min(2, {
      message: 'First name must be at least 2 characters.'
    }),
    lastName: z.string().min(2, {
      message: 'Last name must be at least 2 characters.'
    }),
    email: z.string().email({
      message: 'Please enter a valid email address.'
    }),
    currentPassword: z.string().min(1, {
      message: 'Current password is required to make changes.'
    }),
    newPassword: z.string().optional().or(z.literal('')),
    confirmPassword: z.string().optional().or(z.literal(''))
  })
  .refine(
    data => {
      // If new password is provided, it must be at least 6 characters
      if (data.newPassword && data.newPassword.length > 0) {
        return data.newPassword.length >= 6;
      }
      return true;
    },
    {
      message: 'New password must be at least 6 characters.',
      path: ['newPassword']
    }
  )
  .refine(
    data => {
      // If new password is provided, confirm password must match
      if (data.newPassword && data.newPassword.length > 0) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'Passwords do not match.',
      path: ['confirmPassword']
    }
  );

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountSettingsProps {
  currentUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function AccountSettings({ currentUser }: AccountSettingsProps) {
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (data: AccountFormValues) => {
    try {
      setLoading(true);

      const result = await updateAdminAccount({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword || undefined
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to update account');
        return;
      }

      // Update the session with new user data
      await update({
        user: {
          name: `${data.firstName} ${data.lastName}`,
          email: data.email
        }
      });

      toast.success('Account updated successfully');

      // Reset password fields only
      form.setValue('currentPassword', '');
      form.setValue('newPassword', '');
      form.setValue('confirmPassword', '');
    } catch {
      toast.error('Failed to update account');
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
                  <InputGroup>
                    <InputGroupAddon>
                      <User />
                    </InputGroupAddon>
                    <InputGroupInput placeholder="John" {...field} />
                  </InputGroup>
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
                  <InputGroup>
                    <InputGroupAddon>
                      <User />
                    </InputGroupAddon>
                    <InputGroupInput placeholder="Doe" {...field} />
                  </InputGroup>
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
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <InputGroup>
                  <InputGroupAddon>
                    <AtSign />
                  </InputGroupAddon>
                  <InputGroupInput type="email" placeholder="you@example.com" {...field} />
                </InputGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t pt-4 mt-6">
          <h3 className="text-sm font-medium mb-2">Change Password</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Leave new password fields empty if you don&apos;t want to change your password
          </p>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon>
                        <Lock />
                      </InputGroupAddon>
                      <InputGroupInput
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...field}
                      />
                      <InputGroupButton type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                        {showCurrentPassword ? <Eye /> : <EyeOff />}
                        <span className="sr-only">toggle password</span>
                      </InputGroupButton>
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password (optional)</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon>
                        <Lock />
                      </InputGroupAddon>
                      <InputGroupInput type={showNewPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                      <InputGroupButton type="button" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <Eye /> : <EyeOff />}
                        <span className="sr-only">toggle password</span>
                      </InputGroupButton>
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <InputGroup>
                      <InputGroupAddon>
                        <Lock />
                      </InputGroupAddon>
                      <InputGroupInput
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...field}
                      />
                      <InputGroupButton type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <Eye /> : <EyeOff />}
                        <span className="sr-only">toggle password</span>
                      </InputGroupButton>
                    </InputGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-center">
          <Button type="submit" disabled={loading} className="w-full max-w-sm">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save />
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
}
