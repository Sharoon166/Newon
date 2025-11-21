'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ReceiptText, Settings, User } from 'lucide-react';
import { InvoiceSettings } from './invoice-settings';
import { AccountSettings } from './account-settings';
import { PaymentDetails } from '../types';
import { Button } from '@/components/ui/button';

interface SettingsTabsProps {
  paymentDetails: PaymentDetails;
  invoiceTerms: string[];
  currentUser: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function SettingsTabs({ paymentDetails, invoiceTerms, currentUser }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="account" className="mt-8">
      <TabsList>
        <TabsTrigger value="account" className="flex items-center gap-2">
          <User />
          <span>Account</span>
        </TabsTrigger>
        <TabsTrigger value="invoice" className="flex items-center gap-2">
          <ReceiptText />
          <span>Invoice</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="account" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings and password</CardDescription>
          </CardHeader>
          <CardContent className='w-full max-w-xl mx-auto'>
            <AccountSettings currentUser={currentUser} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="invoice" className="mt-6">
        <Card>
          <CardContent className="space-y-4">
            <InvoiceSettings
              initialPaymentDetails={paymentDetails}
              initialTerms={invoiceTerms}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
