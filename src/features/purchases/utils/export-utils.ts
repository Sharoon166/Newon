import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// Generic type for any export data
type ExportData = Record<string, string | number | boolean | null | undefined>;

/**
 * Exports data to CSV format and triggers download
 * @param data Array of data objects to export
 * @param filename Name of the file (without extension)
 */
export const exportToCsv = (data: CsvExportData[], filename: string): void => {
  if (!data || data.length === 0) return;

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
};

/**
 * Exports data to PDF format and triggers download
 * @param data Array of data objects to export
 * @param filename Name of the file (without extension)
 */
export const exportToPdf = <T extends ExportData>(data: T[], filename: string): void => {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();
  const headers = Object.keys(data[0]);
  const tableData = data.map(item => 
    headers.map(header => {
      const value = item[header];
      return typeof value === 'object' ? JSON.stringify(value) : String(value || '');
    })
  );

  autoTable(doc, {
    head: [headers],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 20 },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
  });

  doc.save(`${filename}.pdf`);
};

