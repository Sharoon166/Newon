'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Save } from "lucide-react";

type QuotationTemplateProps = {
  quotationData: Record<string, unknown>;
  onBack?: () => void;
  onPrint?: () => void;
  onDownload?: () => void;
};

export default function QuotationTemplate({ 
  quotationData, 
  onBack, 
  onPrint, 
  onDownload 
}: QuotationTemplateProps) {
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-sm print:shadow-none print:p-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4">QUOTATION</h1>
        <p className="text-muted-foreground">Quotation template is under development.</p>
        {quotationData && (
          <pre className="mt-4 p-4 bg-muted rounded text-sm overflow-auto">
            {JSON.stringify(quotationData, null, 2)}
          </pre>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        {onBack && (
          <Button 
            variant="outline" 
            onClick={onBack}
            className="print:hidden"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Edit
          </Button>
        )}
        {onPrint && (
          <Button 
            variant="outline" 
            onClick={onPrint}
            className="print:hidden"
          >
            <Save className="w-4 h-4 mr-2" />
            Print Quotation
          </Button>
        )}
        {onDownload && (
          <Button 
            onClick={onDownload}
            className="print:hidden"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        )}
      </div>
    </div>
  );
}