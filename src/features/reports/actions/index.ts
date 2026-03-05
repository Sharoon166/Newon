'use server';

import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import Expense from '@/models/Expense';
import type { YearlyReportData, MonthlyReport } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export async function getYearlyReport(year: number): Promise<YearlyReportData> {
  try {
    await dbConnect();

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Aggregate invoices by month
    const invoiceAggregation = await Invoice.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            type: '$type'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          balanceAmount: { $sum: '$balanceAmount' }
        }
      }
    ]);

    // Aggregate expenses by month
    const expenseAggregation = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          totalExpenses: { $sum: '$amount' }
        }
      }
    ]);

    // Create a map for quick lookup
    const invoiceMap = new Map<number, { invoices: number; quotations: number; revenue: number; paid: number; outstanding: number }>();
    const expenseMap = new Map<number, number>();

    invoiceAggregation.forEach(item => {
      const month = item._id.month;
      if (!invoiceMap.has(month)) {
        invoiceMap.set(month, { invoices: 0, quotations: 0, revenue: 0, paid: 0, outstanding: 0 });
      }
      const data = invoiceMap.get(month)!;
      
      if (item._id.type === 'invoice') {
        data.invoices = item.count;
        data.revenue = item.totalAmount;
        data.paid = item.paidAmount;
        data.outstanding = item.balanceAmount;
      } else if (item._id.type === 'quotation') {
        data.quotations = item.count;
      }
    });

    expenseAggregation.forEach(item => {
      expenseMap.set(item._id, item.totalExpenses);
    });

    // Build monthly reports
    const monthlyReports: MonthlyReport[] = [];
    const totals = {
      invoicesCount: 0,
      quotationsCount: 0,
      revenue: 0,
      expenses: 0,
      profit: 0,
      paidAmount: 0,
      outstandingAmount: 0
    };

    for (let month = 1; month <= 12; month++) {
      const invoiceData = invoiceMap.get(month) || { invoices: 0, quotations: 0, revenue: 0, paid: 0, outstanding: 0 };
      const expenses = expenseMap.get(month) || 0;
      const profit = invoiceData.revenue - expenses;

      const report: MonthlyReport = {
        month,
        year,
        monthName: MONTH_NAMES[month - 1],
        invoicesCount: invoiceData.invoices,
        quotationsCount: invoiceData.quotations,
        revenue: invoiceData.revenue,
        expenses,
        profit,
        paidAmount: invoiceData.paid,
        outstandingAmount: invoiceData.outstanding
      };

      monthlyReports.push(report);

      // Update totals
      totals.invoicesCount += invoiceData.invoices;
      totals.quotationsCount += invoiceData.quotations;
      totals.revenue += invoiceData.revenue;
      totals.expenses += expenses;
      totals.profit += profit;
      totals.paidAmount += invoiceData.paid;
      totals.outstandingAmount += invoiceData.outstanding;
    }

    return {
      year,
      monthlyReports,
      totals
    };
  } catch (error) {
    console.error('Error fetching yearly report:', error);
    throw new Error('Failed to fetch yearly report');
  }
}
