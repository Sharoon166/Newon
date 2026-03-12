import { toast } from 'sonner';
import type { MonthlyReport } from '../types';
import { formatCurrency } from '@/lib/utils';

export type ReportCsvData = {
  Month: string;
  Invoices: number;
  Quotations: number;
  Revenue: string;
  Paid: string;
  Outstanding: string;
  'Gross Profit': string;
  Expenses: string;
  'Net Profit': string;
};

export const exportReportsToCsv = (data: MonthlyReport[], year: number): void => {
  if (!data || data.length === 0) {
    toast.error('No data to export');
    return;
  }

  try {
    const csvData: ReportCsvData[] = data.map(report => ({
      Month: report.monthName,
      Invoices: report.invoicesCount,
      Quotations: report.quotationsCount,
      Revenue: formatCurrency(report.revenue, false),
      Paid: formatCurrency(report.paidAmount, false),
      Outstanding: formatCurrency(report.outstandingAmount, false),
      'Gross Profit': formatCurrency(report.grossProfit, false),
      Expenses: formatCurrency(report.expenses, false),
      'Net Profit': formatCurrency(report.profit, false)
    }));

    const headers = Object.keys(csvData[0]);
    let csvContent = headers.join(',') + '\n';

    csvData.forEach(item => {
      const row = headers.map(header => {
        const value = item[header as keyof ReportCsvData];
        const escaped = String(value || '').replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial-report-${year}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Report exported to CSV successfully');
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    toast.error('Failed to export report to CSV');
  }
};
