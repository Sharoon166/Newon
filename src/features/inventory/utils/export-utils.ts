import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EnhancedVariants } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';

// Type for the CSV export data
export type CsvExportData = {
  'Product': string;
  'SKU': string;
  'Categories': string;
  'Retail Price': string;
  'Purchase Price': string;
  'Wholesale Price': string;
  'Available': number;
  'Backorder': number;
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
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const headers = Object.keys(data[0]);
  const tableData = data.map(item =>
    headers.map(header => {
      const value = item[header];
      return typeof value === 'object' ? JSON.stringify(value) : String(value || '');
    })
  );

  // Add header
  doc.setFillColor(216, 121, 67);
  doc.rect(0, 0, 297, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('Inventory Report', 14, 18);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(`${formatDate(new Date())}`, 14, 24);

  let pageNumber = 1;

  // Add table with horizontal lines only
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 40,
    theme: 'striped',
    columnStyles: {
      0: { cellWidth: 'auto' }
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [50, 50, 50],
      font: 'helvetica',
      fontStyle: 'bolditalic',
      halign: 'left',
      fontSize: 8,
      lineWidth: 0.3,
      lineColor: [25, 25, 25]
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [60, 60, 60],
      lineWidth: 0.3,
      lineColor: [25, 25, 25],
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    margin: { top: 40, left: 15, right: 15 },
    didDrawPage: () => {
      // Add page number at the bottom right of each page
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      const pageCount = doc.getNumberOfPages();

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Page ${pageNumber} of ${pageCount}`,
        pageSize.width - 15,
        pageHeight - 10,
        { align: 'right' }
      );
      pageNumber++;
    }
  });

  doc.save(`${filename}.pdf`);
};

/**
 * Prepares product data for export
 */
export const prepareProductExportData = (variants: EnhancedVariants[]): CsvExportData[] => {
  return variants.map(variant => ({
    'Product': `${variant.productName}\n(${variant.sku})`,
    'SKU': variant.sku,
    'Categories': variant.categories.join(', '),
    'Retail Price': `${formatCurrency(variant.retailPrice || 0) || '0.00'}`,
    'Purchase Price': `${formatCurrency(variant.purchasePrice || 0) || '0.00'}`,
    'Wholesale Price': `${formatCurrency(variant.wholesalePrice || 0) || '0.00'}`,
    'Available': variant.availableStock,
    'Backorder': variant.stockOnBackorder || 0,
    'Supplier': variant.supplier || 'N/A',
  }));
};
