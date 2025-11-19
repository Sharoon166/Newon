'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupTextarea
} from '@/components/ui/input-group';
import { toast } from 'sonner';
import { Hash, Landmark, Loader2, Plus, Receipt, Save, ScrollText, X } from 'lucide-react';
import { updatePaymentDetails, updateInvoiceTerms } from '../actions';
import { PaymentDetails } from '../types';

interface InvoiceSettingsProps {
  initialPaymentDetails: PaymentDetails;
  initialTerms: string[];
}

export function InvoiceSettings({ initialPaymentDetails, initialTerms }: InvoiceSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(initialPaymentDetails);

  const [terms, setTerms] = useState<string[]>(initialTerms);
  const [newTerm, setNewTerm] = useState('');

  const handleSavePaymentDetails = async () => {
    try {
      setIsSaving(true);
      await updatePaymentDetails(paymentDetails);
      toast.success('Payment details updated successfully');
    } catch (error) {
      console.error('Error updating payment details:', error);
      toast.error('Failed to update payment details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTerms = async () => {
    try {
      setIsSaving(true);
      await updateInvoiceTerms(terms);
      toast.success('Invoice terms updated successfully');
    } catch (error) {
      console.error('Error updating invoice terms:', error);
      toast.error('Failed to update invoice terms');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTerm = () => {
    if (newTerm.trim()) {
      setTerms([...terms, newTerm.trim()]);
      setNewTerm('');
    }
  };

  const handleRemoveTerm = (index: number) => {
    setTerms(terms.filter((_, i) => i !== index));
  };

  const handleUpdateTerm = (index: number, value: string) => {
    const updatedTerms = [...terms];
    updatedTerms[index] = value;
    setTerms(updatedTerms);
  };

  return (
    <div className="space-y-8">
      {/* Payment Details Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Receipt className="size-5" />
            Payment Details
          </h3>
          <p className="text-sm text-muted-foreground">Bank account information displayed on invoices</p>
        </div>

        <div className="space-y-4 grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Landmark />
              </InputGroupAddon>
              <InputGroupInput
                id="bankName"
                value={paymentDetails.BANK_NAME}
                onChange={e => setPaymentDetails({ ...paymentDetails, BANK_NAME: e.target.value })}
                placeholder="Enter bank name and branch"
              />
            </InputGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Hash />
              </InputGroupAddon>
              <InputGroupInput
                id="accountNumber"
                value={paymentDetails.ACCOUNT_NUMBER}
                onChange={e => setPaymentDetails({ ...paymentDetails, ACCOUNT_NUMBER: e.target.value })}
                placeholder="Enter account number"
              />
            </InputGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              value={paymentDetails.IBAN}
              onChange={e => setPaymentDetails({ ...paymentDetails, IBAN: e.target.value })}
              placeholder="Enter IBAN"
            />
          </div>
        </div>
        <div className="flex justify-center">
          <Button onClick={handleSavePaymentDetails} disabled={isSaving} className="w-full max-w-sm">
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            Save Payment Details
          </Button>
        </div>
      </div>

      {/* Invoice Terms Section */}
      <div className="space-y-4 pt-6 border-t">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            {' '}
            <ScrollText className="size-5" />
            Invoice Terms & Conditions
          </h3>
          <p className="text-sm text-muted-foreground">Terms and conditions displayed on invoices</p>
        </div>

        <div className="space-y-4">
          {terms.map((term, index) => (
            <InputGroup key={index}>
              <InputGroupTextarea
                value={term}
                onChange={e => handleUpdateTerm(index, e.target.value)}
                placeholder="Enter term"
                rows={2}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton variant="ghost" size="icon-sm" onClick={() => handleRemoveTerm(index)}>
                  <X className="h-4 w-4" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          ))}

          <InputGroup>
            <InputGroupTextarea
              value={newTerm}
              onChange={e => setNewTerm(e.target.value)}
              placeholder="Add new term..."
              rows={2}
            />
            <InputGroupAddon align="block-end">
              <InputGroupButton size="icon-sm" onClick={handleAddTerm} disabled={!newTerm.trim()} className="ml-auto">
                <Plus className="h-4 w-4" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex justify-center">
          <Button onClick={handleSaveTerms} disabled={isSaving} className="w-full max-w-sm">
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            Save Terms & Conditions
          </Button>
        </div>
      </div>
    </div>
  );
}
