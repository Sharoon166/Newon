'use client';

import { Button } from "@/components/ui/button";

type NewQuotationFormProps = {
  onPreview: (data: Record<string, unknown>) => void;
};

export function NewQuotationForm({ onPreview }: NewQuotationFormProps) {
  const handlePreview = () => {
    // Mock quotation data for now
    const mockData = {
      quotationNumber: 'QUO-001',
      date: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      items: [
        {
          id: '1',
          description: 'Sample Item',
          quantity: 1,
          rate: 100,
          amount: 100
        }
      ],
      notes: 'This is a sample quotation.',
      terms: 'Terms and conditions apply.'
    };
    
    onPreview(mockData);
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">New Quotation Form</h2>
        <p className="text-muted-foreground mb-4">
          The quotation form is under development. This is a placeholder that will generate a sample quotation for preview.
        </p>
        
        <Button onClick={handlePreview}>
          Preview Sample Quotation
        </Button>
      </div>
    </div>
  );
}