import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EnhancedVariants } from '../types';

// Type for the CSV export data
export type CsvExportData = {
  'Product Name': string;
  'SKU': string;
  'Categories': string;
  'Retail Price': string;
  'Purchase Price': string;
  'Wholesale Price': string;
  'Available Stock': number;
  'Stock on Backorder': number;
  'Supplier': string;
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

  const doc = new jsPDF({
    orientation: 'l',
    unit: 'mm',
    format: 'a4'
  });

  const headers = Object.keys(data[0]);
  const tableData = data.map(item => 
    headers.map(header => {
      const value = item[header];
      return typeof value === 'object' ? JSON.stringify(value) : String(value || '');
    })
  );

  // Add header
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, 297, 35, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Inventory Report', 14, 22);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  // Add table
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 40,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 40 },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
  });

  doc.save(`${filename}.pdf`);
};

/**
 * Prepares product data for export
 */
export const prepareProductExportData = (variants: EnhancedVariants[]): CsvExportData[] => {
  return variants.map(variant => ({
    'Product Name': variant.productName,
    'SKU': variant.sku,
    'Categories': variant.categories.join(', '),
    'Retail Price': `$${variant.retailPrice?.toFixed(2) || '0.00'}`,
    'Purchase Price': `$${variant.purchasePrice?.toFixed(2) || '0.00'}`,
    'Wholesale Price': `$${variant.wholesalePrice?.toFixed(2) || '0.00'}`,
    'Available Stock': variant.availableStock,
    'Stock on Backorder': variant.stockOnBackorder || 0,
    'Supplier': variant.supplier || 'N/A',
  }));
};
