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
 * Loads an image from URL, converts it to JPEG via canvas for maximum compatibility
 */
const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    // Create an image element
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Load the image
    const imageLoadPromise = new Promise<string | null>((resolve) => {
      img.onload = () => {
        try {
          // Create canvas and draw image
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          
          // Draw image on canvas
          ctx.drawImage(img, 0, 0);
          
          // Convert to JPEG with high quality
          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
          resolve(jpegDataUrl);
        } catch (error) {
          console.warn('Failed to convert image to JPEG:', error);
          resolve(null);
        }
      };
      
      img.onerror = () => {
        console.warn('Failed to load image:', url);
        resolve(null);
      };
    });
    
    // Set image source from blob
    const objectUrl = URL.createObjectURL(blob);
    img.src = objectUrl;
    
    const result = await imageLoadPromise;
    
    // Clean up object URL
    URL.revokeObjectURL(objectUrl);
    
    return result;
  } catch (error) {
    console.warn('Failed to load image:', error);
    return null;
  }
};

/**
 * Exports data to PDF format with image thumbnails and triggers download
 * @param data Array of data objects to export
 * @param filename Name of the file (without extension)
 * @param imageUrls Optional array of image URLs corresponding to each data row
 */
export const exportToPdf = async <T extends ExportData>(
  data: T[], 
  filename: string,
  imageUrls?: (string | null | undefined)[]
): Promise<void> => {
  if (!data || data.length === 0) return;

  // Load all images as base64 if provided
  let loadedImages: (string | null)[] = [];
  if (imageUrls && imageUrls.length > 0) {
    loadedImages = await Promise.all(
      imageUrls.map(url => url ? loadImageAsBase64(url) : Promise.resolve(null))
    );
  }

  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    compress: true // Re-enable compression for JPEG images
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
      0: { 
        cellWidth: loadedImages.length > 0 ? 60 : 'auto'
      }
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
      valign: 'middle',
      minCellHeight: loadedImages.length > 0 ? 16 : undefined
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    },
    margin: { top: 40, left: 15, right: 15 },
    willDrawCell: (data) => {
      // Adjust text position in first column to make room for image
      if (loadedImages.length > 0 && data.column.index === 0 && data.section === 'body') {
        const rowIndex = data.row.index;
        const imageBase64 = loadedImages[rowIndex];
        
        if (imageBase64) {
          // Add left padding to push text right of the image
          data.cell.styles.cellPadding = { 
            left: 16, // 12mm image + 4mm spacing
            right: 2, 
            top: 2, 
            bottom: 2 
          };
        }
      }
    },
    didDrawCell: (data) => {
      // Add image thumbnails in the first column
      if (loadedImages.length > 0 && data.column.index === 0 && data.section === 'body') {
        const rowIndex = data.row.index;
        const imageBase64 = loadedImages[rowIndex];
        
        if (imageBase64) {
          const cellX = data.cell.x;
          const cellY = data.cell.y;
          const cellHeight = data.cell.height;
          const imgSize = 12; // 12mm thumbnail
          const padding = 2;
          
          // Center image vertically in the cell
          const imgY = cellY + (cellHeight - imgSize) / 2;
          
          try {
            // All images are now normalized to JPEG via canvas
            doc.addImage(
              imageBase64,
              'JPEG',
              cellX + padding,
              imgY,
              imgSize,
              imgSize,
              undefined,
              'FAST'
            );
          } catch (error) {
            // Silently fail if image can't be added
            console.warn('Failed to add image to PDF:', error);
          }
        }
      }
    },
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

/**
 * Extracts image URLs from variants for PDF export
 */
export const extractImageUrls = (variants: EnhancedVariants[]): (string | null)[] => {
  return variants.map(variant => {
    // Prefer cloudinaryUrl from imageFile, fallback to legacy image field
    return variant.imageFile?.cloudinaryUrl || variant.image || null;
  });
};
