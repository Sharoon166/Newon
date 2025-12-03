import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getInvoice } from '@/features/invoices/actions';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { COMPANY_DETAILS, PAYMENT_DETAILS } from '@/constants';
import { convertToWords } from '@/features/invoices/utils';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Fetch invoice data
    const invoice = await getInvoice(invoiceId);

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header - Company Info
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY_DETAILS.name || 'Company Name', 20, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY_DETAILS.address, 20, yPos);
    yPos += 5;
    doc.text(`${COMPANY_DETAILS.city} ${COMPANY_DETAILS.state} ${COMPANY_DETAILS.zip}`, 20, yPos);
    yPos += 5;
    if (COMPANY_DETAILS.phone) {
      doc.text(COMPANY_DETAILS.phone, 20, yPos);
      yPos += 5;
    }
    if (COMPANY_DETAILS.email) {
      doc.text(COMPANY_DETAILS.email, 20, yPos);
      yPos += 5;
    }

    // Invoice Number and Date (Right side)
    yPos = 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const invoiceLabel = invoice.type === 'invoice' ? 'INVOICE' : 'QUOTATION';
    doc.text(invoiceLabel, pageWidth - 20, yPos, { align: 'right' });
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`# ${invoice.invoiceNumber}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 6;
    doc.text(`Date: ${format(new Date(invoice.date), 'MMM dd, yyyy')}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 6;

    if (invoice.dueDate) {
      doc.text(`Due: ${format(new Date(invoice.dueDate), 'MMM dd, yyyy')}`, pageWidth - 20, yPos, { align: 'right' });
    } else if (invoice.validUntil) {
      doc.text(`Valid Until: ${format(new Date(invoice.validUntil), 'MMM dd, yyyy')}`, pageWidth - 20, yPos, {
        align: 'right'
      });
    }

    // Bill To Section
    yPos = 60;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', 20, yPos);
    yPos += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const isOTC = invoice.customerId === 'otc';
    if (isOTC) {
      doc.text(invoice.customerName, 20, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('(Over the Counter)', 20, yPos);
      doc.setTextColor(0, 0, 0);
    } else {
      doc.text(invoice.customerName, 20, yPos);
      yPos += 5;
      if (invoice.customerCompany) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(invoice.customerCompany, 20, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 5;
      }
      if (invoice.customerAddress) {
        doc.setFontSize(9);
        doc.text(invoice.customerAddress, 20, yPos);
        yPos += 4;
      }
      if (invoice.customerCity || invoice.customerState || invoice.customerZip) {
        const location = [invoice.customerCity, invoice.customerState, invoice.customerZip]
          .filter(Boolean)
          .join(', ');
        doc.text(location, 20, yPos);
        yPos += 4;
      }
      if (invoice.customerPhone) {
        doc.text(invoice.customerPhone, 20, yPos);
        yPos += 4;
      }
      if (invoice.customerEmail) {
        doc.text(invoice.customerEmail, 20, yPos);
        yPos += 4;
      }
    }

    // Items Table
    yPos += 10;
    const tableData = invoice.items.map((item, index) => [
      (index + 1).toString(),
      item.productName + (item.variantSKU ? `\n(SKU: ${item.variantSKU})` : ''),
      item.quantity.toString(),
      formatCurrency(item.unitPrice),
      formatCurrency(item.totalPrice)
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Description', 'Qty', 'Rate', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });

    // Get final Y position after table
    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    // Payment Details and Totals Side by Side
    const leftColumnX = 20;
    const rightColumnX = pageWidth / 2 + 10;
    const totalsStartY = yPos;

    // Left Column - Payment Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Details', leftColumnX, yPos);
    yPos += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bank: ${PAYMENT_DETAILS.BANK_NAME}`, leftColumnX, yPos);
    yPos += 5;
    doc.text(`Account #: ${PAYMENT_DETAILS.ACCOUNT_NUMBER}`, leftColumnX, yPos);
    yPos += 5;
    doc.text(`IBAN: ${PAYMENT_DETAILS.IBAN}`, leftColumnX, yPos);

    // Right Column - Totals
    yPos = totalsStartY;
    const labelX = rightColumnX;
    const valueX = pageWidth - 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', labelX as number, yPos as number);
    doc.text(String(formatCurrency(invoice.subtotal)), valueX as number, yPos as number, { align: 'right' });
    yPos += 6;

    if (invoice.gstAmount > 0) {
      const gstLabel = invoice.gstType === 'percentage' ? `Tax (${invoice.gstValue}%):` : 'Tax:';
      doc.text(gstLabel, labelX as number, yPos as number);
      doc.text(String(formatCurrency(invoice.gstAmount)), valueX as number, yPos as number, { align: 'right' });
      yPos += 6;
    }

    if (invoice.discountAmount > 0) {
      const discountLabel =
        invoice.discountType === 'percentage' ? `Discount (${invoice.discountValue}%):` : 'Discount:';
      doc.text(discountLabel, labelX as number, yPos as number);
      doc.setTextColor(200, 0, 0);
      doc.text(`-${String(formatCurrency(invoice.discountAmount))}`, valueX as number, yPos as number, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      yPos += 6;
    }

    // Draw line before total
    doc.setLineWidth(0.5);
    doc.line(labelX as number, yPos as number, valueX as number, yPos as number);
    yPos += 6;

    doc.setFont('helvetica', 'bold');
    doc.text('Total:', labelX as number, yPos as number);
    doc.text(String(formatCurrency(invoice.totalAmount)), valueX as number, yPos as number, { align: 'right' });
    yPos += 8;

    // Invoice-specific fields
    if (invoice.type === 'invoice') {
      doc.setFont('helvetica', 'normal');
      if (invoice.paidAmount > 0) {
        doc.text('Paid:', labelX as number, yPos as number);
        doc.setTextColor(0, 150, 0);
        doc.text(String(formatCurrency(invoice.paidAmount)), valueX as number, yPos as number, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPos += 6;
      }

      // Show outstanding balance for non-OTC customers
      const outstandingBalance = isOTC ? 0 : 0; // This would come from customer data if available
      if (!isOTC && outstandingBalance > 0) {
        doc.text('Outstanding Balance:', labelX as number, yPos as number);
        doc.setTextColor(255, 140, 0);
        doc.text(String(formatCurrency(outstandingBalance)), valueX as number, yPos as number, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        yPos += 6;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('Balance:', labelX as number, yPos as number);
      if (invoice.balanceAmount > 0) {
        doc.setTextColor(200, 0, 0);
      } else {
        doc.setTextColor(0, 150, 0);
      }
      doc.text(String(formatCurrency(invoice.balanceAmount)), valueX as number, yPos as number, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      yPos += 8;

      // Amount in words
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const amountInWords = `${convertToWords(Math.round(invoice.balanceAmount))} Rupees Only`;
      doc.text(`Amount in words: ${amountInWords}`, labelX, yPos, {
        maxWidth: valueX - labelX - 5
      });
    } else {
      // For quotations, show total in words
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const amountInWords = `${convertToWords(Math.round(invoice.totalAmount))} Rupees Only`;
      doc.text(`Amount in words: ${amountInWords}`, labelX, yPos, {
        maxWidth: valueX - labelX - 5
      });
    }

    yPos += 15;

    // Notes and Terms
    if (invoice.notes || invoice.termsAndConditions) {
      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }

      const notesX = 20;
      const termsX = pageWidth / 2 + 10;
      const sectionWidth = pageWidth / 2 - 30;

      if (invoice.notes) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', notesX, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const notesLines = doc.splitTextToSize(invoice.notes, sectionWidth);
        doc.text(notesLines, notesX, yPos + 5);
      }

      if (invoice.termsAndConditions) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Terms & Conditions:', termsX, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const termsLines = doc.splitTextToSize(invoice.termsAndConditions, sectionWidth);
        doc.text(termsLines, termsX, yPos + 5);
      }
    }

    // Footer
    const footerY = pageHeight - 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });

    // Generate PDF as buffer
    const pdfBuffer = doc.output('arraybuffer');

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.type === 'invoice' ? 'Invoice' : 'Quotation'}-${invoice.invoiceNumber}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
