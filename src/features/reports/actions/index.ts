'use server';

import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import Expense from '@/models/Expense';
import type { YearlyReportData, MonthlyReport } from '../types';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export async function getYearlyReport(year: number): Promise<YearlyReportData> {
  try {
    await dbConnect();

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // Aggregate invoices by month (only invoices, not quotations, exclude cancelled)
    const invoiceAggregation = await Invoice.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          type: 'invoice',
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          balanceAmount: { $sum: '$balanceAmount' },
          profit: { $sum: { $ifNull: ['$profit', 0] } }
        }
      }
    ]);

    // Aggregate quotations by month (only for counting)
    const quotationAggregation = await Invoice.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          type: 'quotation'
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Aggregate expenses by month (only manual expenses)
    const expenseAggregation = await Expense.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          source: 'manual' // Only include manual expenses
        }
      },
      {
        $addFields: {
          paidTx: {
            $reduce: {
              input: { $ifNull: ['$transactions', []] },
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.amount', 0] }] }
            }
          }
        }
      },
      {
        $group: {
          _id: { $month: '$date' },
          totalExpenses: {
            $sum: {
              $cond: [{ $eq: ['$source', 'project'] }, '$paidTx', { $ifNull: ['$amount', 0] }]
            }
          }
        }
      }
    ]);

    // Create a map for quick lookup
    const invoiceMap = new Map<number, { invoices: number; revenue: number; paid: number; outstanding: number; profit: number }>();
    const quotationMap = new Map<number, number>();
    const expenseMap = new Map<number, number>();

    invoiceAggregation.forEach(item => {
      const month = item._id;
      if (!invoiceMap.has(month)) {
        invoiceMap.set(month, { invoices: 0, revenue: 0, paid: 0, outstanding: 0, profit: 0 });
      }
      const data = invoiceMap.get(month)!;
      data.invoices = item.count;
      data.revenue = item.revenue;
      data.paid = item.paidAmount;
      data.outstanding = item.balanceAmount;
      data.profit = item.profit;
    });

    quotationAggregation.forEach(item => {
      quotationMap.set(item._id, item.count);
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
      grossProfit: 0,
      profit: 0,
      paidAmount: 0,
      outstandingAmount: 0
    };

    for (let month = 1; month <= 12; month++) {
      const invoiceData = invoiceMap.get(month) || { invoices: 0, revenue: 0, paid: 0, outstanding: 0, profit: 0 };
      const quotations = quotationMap.get(month) || 0;
      const expenses = expenseMap.get(month) || 0;

      const report: MonthlyReport = {
        month,
        year,
        monthName: MONTH_NAMES[month - 1],
        invoicesCount: invoiceData.invoices,
        quotationsCount: quotations,
        revenue: invoiceData.revenue,
        expenses,
        grossProfit: invoiceData.profit, // Gross profit before expenses
        profit: invoiceData.profit - expenses, // Net profit after expenses
        paidAmount: invoiceData.paid,
        outstandingAmount: invoiceData.outstanding
      };

      monthlyReports.push(report);

      // Update totals
      totals.invoicesCount += invoiceData.invoices;
      totals.quotationsCount += quotations;
      totals.revenue += invoiceData.revenue;
      totals.expenses += expenses;
      totals.grossProfit += invoiceData.profit; // Accumulate gross profit
      totals.profit += invoiceData.profit - expenses; // Accumulate net profit
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
