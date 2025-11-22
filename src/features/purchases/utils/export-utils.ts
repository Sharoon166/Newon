import { toast } from 'sonner';

// Type for the CSV export data
export type CsvExportData = {
  'Purchase Date': string;
  'Product': string;
  'Variant': string;
  'Supplier': string;
  'Quantity': number;
  'Remaining': number;
  'Unit Price': string;
  'Total Cost': string;
};

/**
 * Exports data to CSV format and triggers download
 * @param data Array of data objects to export
 * @param filename Name of the file (without extension)
 */
export const exportToCsv = (data: CsvExportData[], filename: string): void => {
  if (!data || data.length === 0) {
    toast.error('No data to export');
    return;
  }

  try {
    // Get headers from the first object
    const headers = Object.keys(data[0]);

    // Create CSV header
    let csvContent = headers.join(',') + '\n';

    // Add data rows
    data.forEach(item => {
      const row = headers.map(header => {
        const value = item[header as keyof CsvExportData];
        // Escape quotes and wrap in quotes if the value contains commas or quotes
        const escaped = String(value || '').replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvContent += row.join(',') + '\n';
    });

    // Create a Blob with the CSV data
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Purchases exported to CSV successfully');
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    toast.error('Failed to export purchases to CSV');
  }
};

/**
 * Export purchases to PDF (navigates to print page)
 */
export const exportToPdf = (): void => {
  try {
    // Navigate to print page - data will be fetched server-side
    window.location.href = '/purchases/print';
  } catch (error) {
    console.error('Error navigating to print page:', error);
    toast.error('Failed to open print page');
  }
};

