import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportData {
  [key: string]: string | number | null;
}

interface Product {
  productName: string;
  sku: string;
  category?: string | null;
  supplier?: string | null;
  quantity?: number;
  price?: number;
  status?: string;
}

export function prepareProductExportData(products: Product[]): ExportData[] {
  return products.map(product => ({
    'Product Name': product.productName,
    'SKU': product.sku,
    'Category': product.category || 'N/A',
    'Supplier': product.supplier || 'N/A',
    'Quantity': product.quantity || 0,
    'Price': product.price || 0,
    'Status': product.status || 'Active'
  }));
}

export function exportToCsv(data: ExportData[], filename: string): void {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header] ?? '';
        const escaped = String(value).replace(/"/g, '\\"');
        return `"${escaped}"`;
      }).join(',')
    )
  ];

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPdf(data: ExportData[], filename: string): void {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();
  const headers = Object.keys(data[0]);
  const tableData = data.map(item => 
    headers.map(header => {
      const value = item[header];
      return typeof value === 'object' ? JSON.stringify(value) : String(value || '');
    })
  );

  // Add header
  doc.setFontSize(20);
  doc.text('Products Report', 14, 22);

  // Add table
  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 30,
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
    styles: {
      fontSize: 8,
      cellPadding: 2,
      minCellHeight: 8,
    },
  });

  doc.save(`${filename}.pdf`);
}
