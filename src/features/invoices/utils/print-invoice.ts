import { toast } from 'sonner';

export async function printInvoicePDF(invoiceId: string, invoiceNumber: string, type: 'invoice' | 'quotation' = 'invoice') {
  try {
    const response = await fetch('/api/invoices/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ invoiceId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate PDF');
    }

    // Get the PDF blob
    const blob = await response.blob();

    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type === 'invoice' ? 'Invoice' : 'Quotation'}-${invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('PDF downloaded successfully');
  } catch (error) {
    console.error('Error printing invoice:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to generate PDF');
  }
}
