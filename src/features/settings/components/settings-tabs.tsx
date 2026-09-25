'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceiptText, User, Store } from 'lucide-react';
import { InvoiceSettings } from './invoice-settings';
import { AccountSettings } from './account-settings';
import { BrandSettings } from './brand-settings';
import { PaymentDetails, BrandSettingsMap } from '../types';

interface SettingsTabsProps {
  paymentDetails: PaymentDetails;
  invoiceTerms: string[];
  brandSettings: BrandSettingsMap;
  currentUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function SettingsTabs({ paymentDetails, invoiceTerms, brandSettings, currentUser }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="account" className="mt-8 lg:flex lg:gap-6">
      {/* Vertical sidebar on large screens, horizontal on mobile - sticky on large screens */}
      <TabsList className="w-fit">
        <TabsTrigger value="account" className="flex items-center gap-2 lg:w-full lg:justify-start">
          <User className="h-4 w-4" />
          <span>Account</span>
        </TabsTrigger>
        <TabsTrigger value="brands" className="flex items-center gap-2 lg:w-full lg:justify-start">
          <Store className="h-4 w-4" />
          <span>Brands</span>
        </TabsTrigger>
        <TabsTrigger value="invoice" className="flex items-center gap-2 lg:w-full lg:justify-start">
          <ReceiptText className="h-4 w-4" />
          <span>Invoice</span>
        </TabsTrigger>
      </TabsList>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        <TabsContent value="account" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account settings and password</CardDescription>
            </CardHeader>
            <CardContent className="w-full max-w-xl mx-auto">
              <AccountSettings currentUser={currentUser} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brands" className="mt-0">
          <BrandSettings initialSettings={brandSettings} />
        </TabsContent>

        <TabsContent value="invoice" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
              <CardDescription>Configure payment details and terms & conditions for invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InvoiceSettings initialPaymentDetails={paymentDetails} initialTerms={invoiceTerms} />
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </Tabs>
  );
}
