'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { updateBrandSettings } from '../actions';
import type { BrandSettingsMap } from '../types';
import useBrandStore from '@/stores/useBrandStore';

const brandSchema = z.object({
  displayName: z.string().min(1, 'Display name is required'),
  description: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  phone: z.string(),
  email: z.string().email('Invalid email').or(z.literal('')),
  website: z.string(),
  logo: z.string().optional(),
  ntnNo: z.string().optional(),
  strnNo: z.string().optional(),
  invoiceTitle: z.string().optional(),
  paymentDetails: z.object({
    bankName: z.string(),
    accountNumber: z.string(),
    iban: z.string()
  }).optional()
});

type BrandFormData = z.infer<typeof brandSchema>;

interface BrandSettingsProps {
  initialSettings: BrandSettingsMap;
}

function BrandForm({ brandId, initialData }: { brandId: string; initialData: BrandFormData }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const setBrands = useBrandStore(state => state.setBrands);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<BrandFormData>({
    resolver: zodResolver(brandSchema),
    defaultValues: initialData
  });

  const onSubmit = async (data: BrandFormData) => {
    setIsSubmitting(true);
    try {
      const updatedSettings = await updateBrandSettings(brandId, data);
      // Update the store immediately so UI reflects changes
      setBrands(updatedSettings);
      toast.success(`${data.displayName} settings updated successfully`);
    } catch (error) {
      console.error('Failed to update brand settings:', error);
      toast.error('Failed to update brand settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${brandId}-displayName`}>Display Name</Label>
          <Input id={`${brandId}-displayName`} {...register('displayName')} placeholder="Newon" />
          {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${brandId}-description`}>Description</Label>
          <Input
            id={`${brandId}-description`}
            {...register('description')}
            placeholder="Inventory Management System"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${brandId}-logo`}>Logo URL</Label>
          <Input id={`${brandId}-logo`} {...register('logo')} placeholder="/newon.png" />
          <p className="text-xs text-muted-foreground">Path to logo image in public folder</p>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Contact Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${brandId}-phone`}>Phone</Label>
            <Input id={`${brandId}-phone`} {...register('phone')} placeholder="+92 343 9227883" />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${brandId}-email`}>Email</Label>
            <Input id={`${brandId}-email`} type="email" {...register('email')} placeholder="info@newon.pk" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${brandId}-website`}>Website</Label>
          <Input id={`${brandId}-website`} {...register('website')} placeholder="https://newon.pk/" />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Address</h3>

        <div className="space-y-2">
          <Label htmlFor={`${brandId}-address`}>Street Address</Label>
          <Input id={`${brandId}-address`} {...register('address')} placeholder="I-9 markaz, Islamabad" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${brandId}-city`}>City</Label>
            <Input id={`${brandId}-city`} {...register('city')} placeholder="Islamabad" />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${brandId}-state`}>State</Label>
            <Input id={`${brandId}-state`} {...register('state')} placeholder="Islamabad" />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${brandId}-zip`}>ZIP Code</Label>
            <Input id={`${brandId}-zip`} {...register('zip')} placeholder="44000" />
          </div>
        </div>
      </div>

      {/* Tax Registration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tax Registration (Optional)</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${brandId}-ntnNo`}>NTN Number</Label>
            <Input id={`${brandId}-ntnNo`} {...register('ntnNo')} placeholder="8938936-1" />
            <p className="text-xs text-muted-foreground">National Tax Number</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${brandId}-strnNo`}>STRN Number</Label>
            <Input id={`${brandId}-strnNo`} {...register('strnNo')} placeholder="3277876217651" />
            <p className="text-xs text-muted-foreground">Sales Tax Registration Number</p>
          </div>
        </div>
      </div>

      {/* Invoice Customization */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Invoice Customization</h3>

        <div className="space-y-2">
          <Label htmlFor={`${brandId}-invoiceTitle`}>Invoice Title</Label>
          <Input
            id={`${brandId}-invoiceTitle`}
            {...register('invoiceTitle')}
            placeholder="Sale Invoice (default)"
          />
          <p className="text-xs text-muted-foreground">Custom heading printed on invoices. Leave empty for default.</p>
        </div>
      </div>

      {/* Payment Details */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Payment Details (Optional)</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Brand-specific bank account details. Leave empty to use global payment details.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${brandId}-paymentDetails.bankName`}>Bank Name</Label>
            <Input
              id={`${brandId}-paymentDetails.bankName`}
              {...register('paymentDetails.bankName')}
              placeholder="BAHL (Bank Al-Habib Ltd.)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${brandId}-paymentDetails.accountNumber`}>Account Number</Label>
              <Input
                id={`${brandId}-paymentDetails.accountNumber`}
                {...register('paymentDetails.accountNumber')}
                placeholder="02470095010759013"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${brandId}-paymentDetails.iban`}>IBAN</Label>
              <Input
                id={`${brandId}-paymentDetails.iban`}
                {...register('paymentDetails.iban')}
                placeholder="PK62BAHL0247009501075901"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

export function BrandSettings({ initialSettings }: BrandSettingsProps) {
  const newonSettings = initialSettings.newon;
  const waymorSettings = initialSettings.waymor;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Brand Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure brand information displayed on invoices, quotations, and delivery notes
        </p>
      </div>

      <Tabs defaultValue="newon" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="newon">Newon</TabsTrigger>
          <TabsTrigger value="waymor">Waymor</TabsTrigger>
        </TabsList>

        <TabsContent value="newon" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Newon Brand Settings</CardTitle>
              <CardDescription>Configure settings for the Newon brand</CardDescription>
            </CardHeader>
            <CardContent>
              <BrandForm
                brandId="newon"
                initialData={{
                  displayName: newonSettings.displayName,
                  description: newonSettings.description,
                  address: newonSettings.address,
                  city: newonSettings.city,
                  state: newonSettings.state,
                  zip: newonSettings.zip,
                  phone: newonSettings.phone,
                  email: newonSettings.email,
                  website: newonSettings.website,
                  logo: newonSettings.logo,
                  ntnNo: newonSettings.ntnNo,
                  strnNo: newonSettings.strnNo,
                  invoiceTitle: newonSettings.invoiceTitle,
                  paymentDetails: newonSettings.paymentDetails
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waymor" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Waymor Brand Settings</CardTitle>
              <CardDescription>Configure settings for the Waymor brand</CardDescription>
            </CardHeader>
            <CardContent>
              <BrandForm
                brandId="waymor"
                initialData={{
                  displayName: waymorSettings.displayName,
                  description: waymorSettings.description,
                  address: waymorSettings.address,
                  city: waymorSettings.city,
                  state: waymorSettings.state,
                  zip: waymorSettings.zip,
                  phone: waymorSettings.phone,
                  email: waymorSettings.email,
                  website: waymorSettings.website,
                  logo: waymorSettings.logo,
                  ntnNo: waymorSettings.ntnNo,
                  strnNo: waymorSettings.strnNo,
                  invoiceTitle: waymorSettings.invoiceTitle,
                  paymentDetails: waymorSettings.paymentDetails
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
