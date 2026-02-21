'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { generateInvoiceFromProject, type GenerateInvoiceFromProjectDto } from '../actions/generate-invoice';
import { formatCurrency } from '@/lib/utils';
import type { Project } from '../types';
import { FileText, Receipt } from 'lucide-react';

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  userId: string;
  market: 'newon' | 'waymor';
}

export function GenerateInvoiceDialog({
  open,
  onOpenChange,
  project,
  userId,
  market
}: GenerateInvoiceDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'quotation'>('invoice');
  const [billingType, setBillingType] = useState<'wholesale' | 'retail'>('retail');
  const [markupPercentage, setMarkupPercentage] = useState<string>('20');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [gstType, setGstType] = useState<'percentage' | 'fixed'>('percentage');
  const [gstValue, setGstValue] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [termsAndConditions, setTermsAndConditions] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(project.inventory.map(item => item.id!))
  );

  const handleToggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedItems.size === project.inventory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(project.inventory.map(item => item.id!)));
    }
  };

  // Calculate preview totals
  const selectedInventory = project.inventory.filter(item => selectedItems.has(item.id!));
  const markup = parseFloat(markupPercentage) || 0;
  const subtotal = selectedInventory.reduce((sum, item) => {
    const unitPrice = item.rate * (1 + markup / 100);
    return sum + (unitPrice * item.quantity);
  }, 0);

  const discount = discountType === 'percentage'
    ? (subtotal * (parseFloat(discountValue) || 0)) / 100
    : parseFloat(discountValue) || 0;

  const amountAfterDiscount = subtotal - discount;

  const gst = gstType === 'percentage'
    ? (amountAfterDiscount * (parseFloat(gstValue) || 0)) / 100
    : parseFloat(gstValue) || 0;

  const total = amountAfterDiscount + gst;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.size === 0) {
      toast.error('Please select at least one inventory item');
      return;
    }

    setIsSubmitting(true);

    try {
      const data: GenerateInvoiceFromProjectDto = {
        projectId: project.projectId!,
        type: invoiceType,
        markupPercentage: parseFloat(markupPercentage) || 0,
        discountType: parseFloat(discountValue) > 0 ? discountType : undefined,
        discountValue: parseFloat(discountValue) || undefined,
        gstType: parseFloat(gstValue) > 0 ? gstType : undefined,
        gstValue: parseFloat(gstValue) || undefined,
        notes,
        termsAndConditions,
        selectedInventoryIds: Array.from(selectedItems),
        createdBy: userId,
        market,
        billingType
      };

      if (invoiceType === 'invoice') {
        // Set due date to 30 days from now
        data.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else {
        // Set valid until to 30 days from now
        data.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }

      const result = await generateInvoiceFromProject(data);

      if (result.success) {
        toast.success(`${invoiceType === 'invoice' ? 'Invoice' : 'Quotation'} generated successfully`, {
          description: `${result.invoiceNumber} has been created`
        });
        onOpenChange(false);
        router.push(`/invoices/${result.invoiceId}`);
      } else {
        toast.error(result.error || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice from Project</DialogTitle>
          <DialogDescription>
            Create an invoice or quotation from project inventory items
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Invoice Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={invoiceType} onValueChange={(value: 'invoice' | 'quotation') => setInvoiceType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Invoice
                    </div>
                  </SelectItem>
                  <SelectItem value="quotation">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Quotation
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Billing Type</Label>
              <Select value={billingType} onValueChange={(value: 'wholesale' | 'retail') => setBillingType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Markup */}
          <div className="space-y-2">
            <Label>Markup Percentage (%)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={markupPercentage}
              onChange={(e) => setMarkupPercentage(e.target.value)}
              placeholder="20"
            />
            <p className="text-xs text-muted-foreground">
              Add markup to cost prices (e.g., 20 for 20% markup)
            </p>
          </div>

          {/* Select Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Select Inventory Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleToggleAll}
              >
                {selectedItems.size === project.inventory.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
              {project.inventory.map(item => {
                const unitPrice = item.rate * (1 + markup / 100);
                const lineTotal = unitPrice * item.quantity;
                
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-gray-50">
                    <Checkbox
                      checked={selectedItems.has(item.id!)}
                      onCheckedChange={() => handleToggleItem(item.id!)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{item.quantity} × {formatCurrency(unitPrice)}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(lineTotal)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discount */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={discountType} onValueChange={(value: 'percentage' | 'fixed') => setDiscountType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Discount Value</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* GST/Tax */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tax Type</Label>
              <Select value={gstType} onValueChange={(value: 'percentage' | 'fixed') => setGstType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Tax Value</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={gstValue}
                onChange={(e) => setGstValue(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Preview Totals */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount:</span>
                <span className="font-medium text-red-600">-{formatCurrency(discount)}</span>
              </div>
            )}
            {gst > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax:</span>
                <span className="font-medium">{formatCurrency(gst)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for the invoice..."
              rows={3}
            />
          </div>

          {/* Terms */}
          <div className="space-y-2">
            <Label>Terms & Conditions</Label>
            <Textarea
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              placeholder="Payment terms, delivery terms, etc..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || selectedItems.size === 0}>
              {isSubmitting ? 'Generating...' : `Generate ${invoiceType === 'invoice' ? 'Invoice' : 'Quotation'}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
