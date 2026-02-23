'use server';


import { startOfDay, endOfDay, startOfMonth, subDays, differenceInDays, addDays, format } from 'date-fns';
import dbConnect from '@/lib/db';
import InvoiceModel from '@/models/Invoice';
import PurchaseModel from '@/models/Purchase';
import CustomerModel from '@/models/Customer';
import ProductModel from '@/models/Product';
import ExpenseModel from '@/models/Expense';
import type {
  DashboardMetrics,
  SalesTrendData,
  ProfitTrendData,
  OverdueInvoiceAlert,
  PendingPaymentAlert,
  DashboardData
} from '../types';

/**
 * Get Dashboard Metrics
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    await dbConnect();

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);

    // Get total stock and value from purchases
    const stockData = await PurchaseModel.aggregate([
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$remaining' },
          totalStockValue: { $sum: { $multiply: ['$remaining', '$unitPrice'] } }
        }
      }
    ]);

    // Get daily sales (today's invoices)
    const dailySalesData = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $ne: 'cancelled' },
          date: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get monthly sales
    const monthlySalesData = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $ne: 'cancelled' },
          date: { $gte: monthStart }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get total revenue (all time)
    const totalRevenueData = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get pending payments
    const pendingPaymentsData = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $in: ['pending', 'partial'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$balanceAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get monthly profit (sum of profit fields from this month's invoices)
    const monthlyProfitData = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $ne: 'cancelled' },
          date: { $gte: monthStart },
          profit: { $exists: true, $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$profit' }
        }
      }
    ]);

    // Get monthly expenses
    const monthlyExpensesData = await ExpenseModel.aggregate([
      {
        $match: {
          date: { $gte: monthStart }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const monthlyProfit = monthlyProfitData[0]?.total || 0;
    const monthlyExpenses = monthlyExpensesData[0]?.total || 0;
    const netProfit = monthlyProfit - monthlyExpenses;

    // Get total customers
    const totalCustomers = await CustomerModel.countDocuments();

    return {
      totalStock: stockData[0]?.totalStock || 0,
      totalStockValue: stockData[0]?.totalStockValue || 0,
      dailySales: dailySalesData[0]?.total || 0,
      monthlySales: monthlySalesData[0]?.total || 0,
      totalRevenue: totalRevenueData[0]?.total || 0,
      monthlyProfit,
      monthlyExpenses,
      netProfit,
      pendingPayments: pendingPaymentsData[0]?.total || 0,
      pendingPaymentsCount: pendingPaymentsData[0]?.count || 0,
      totalCustomers
    };
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    // Return default values on error
    return {
      totalStock: 0,
      totalStockValue: 0,
      dailySales: 0,
      monthlySales: 0,
      totalRevenue: 0,
      monthlyProfit: 0,
      monthlyExpenses: 0,
      netProfit: 0,
      pendingPayments: 0,
      pendingPaymentsCount: 0,
      totalCustomers: 0
    };
  }
}

/**
 * Get Sales Trend Data
 */
export async function getSalesTrend(days: number = 7): Promise<SalesTrendData[]> {
  try {
    await dbConnect();

    const now = new Date();
    const todayEnd = endOfDay(now);
    const startDate = startOfDay(subDays(now, days - 1));

    // Get sales data grouped by date
    const salesData = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $ne: 'cancelled' },
          date: { $gte: startDate, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' }
          },
          sales: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          invoices: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Create a map of existing data
    const dataMap = new Map<string, { sales: number; revenue: number; invoices: number }>();
    salesData.forEach((item: { _id: string; sales: number; revenue: number; invoices: number }) => {
      dataMap.set(item._id, {
        sales: item.sales,
        revenue: item.revenue,
        invoices: item.invoices
      });
    });

    // Fill in missing dates with zero values
    const data: SalesTrendData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const existing = dataMap.get(dateStr);
      data.push({
        date: dateStr,
        sales: existing?.sales || 0,
        revenue: existing?.revenue || 0,
        invoices: existing?.invoices || 0
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching sales trend:', error);
    return [];
  }
}

/**
 * Get Sales Trend Data for Custom Date Range
 */
export async function getSalesTrendByDateRange(startDate: Date, endDate: Date): Promise<SalesTrendData[]> {
  try {
    await dbConnect();

    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    // Get sales data grouped by date
    const salesData = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $ne: 'cancelled' },
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' }
          },
          sales: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          invoices: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Create a map of existing data
    const dataMap = new Map<string, { sales: number; revenue: number; invoices: number }>();
    salesData.forEach((item: { _id: string; sales: number; revenue: number; invoices: number }) => {
      dataMap.set(item._id, {
        sales: item.sales,
        revenue: item.revenue,
        invoices: item.invoices
      });
    });

    // Fill in missing dates with zero values
    const data: SalesTrendData[] = [];
    const daysDiff = differenceInDays(end, start);
    
    for (let i = 0; i <= daysDiff; i++) {
      const date = addDays(start, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const existing = dataMap.get(dateStr);
      data.push({
        date: dateStr,
        sales: existing?.sales || 0,
        revenue: existing?.revenue || 0,
        invoices: existing?.invoices || 0
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching sales trend by date range:', error);
    return [];
  }
}

/**
 * Get Monthly Sales Trend Data (Last 12 Months)
 */
export async function getMonthlySalesTrend(): Promise<SalesTrendData[]> {
  try {
    await dbConnect();

    const now = new Date();
    const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    // Get sales data grouped by month
    const salesData = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $ne: 'cancelled' },
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-01', date: '$date', timezone: 'UTC' }
          },
          sales: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          invoices: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Create a map of existing data
    const dataMap = new Map<string, { sales: number; revenue: number; invoices: number }>();
    salesData.forEach((item: { _id: string; sales: number; revenue: number; invoices: number }) => {
      dataMap.set(item._id, {
        sales: item.sales,
        revenue: item.revenue,
        invoices: item.invoices
      });
    });

    // Fill in missing months with zero values
    const data: SalesTrendData[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dateStr = format(date, 'yyyy-MM-01');

      const existing = dataMap.get(dateStr);
      data.push({
        date: dateStr,
        sales: existing?.sales || 0,
        revenue: existing?.revenue || 0,
        invoices: existing?.invoices || 0
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching monthly sales trend:', error);
    return [];
  }
}

/**
 * Get Profit Trend Data
 */
export async function getProfitTrend(days: number = 7): Promise<ProfitTrendData[]> {
  try {
    await dbConnect();

    const now = new Date();
    const todayEnd = endOfDay(now);
    const startDate = startOfDay(subDays(now, days - 1));

    // Get profit data grouped by date
    const profitData = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $ne: 'cancelled' },
          date: { $gte: startDate, $lte: todayEnd },
          profit: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' }
          },
          profit: { $sum: '$profit' },
          invoices: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get expenses data grouped by date
    const expensesData = await ExpenseModel.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' }
          },
          expenses: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Create maps of existing data
    const profitMap = new Map<string, { profit: number; invoices: number }>();
    profitData.forEach((item: { _id: string; profit: number; invoices: number }) => {
      profitMap.set(item._id, {
        profit: item.profit,
        invoices: item.invoices
      });
    });

    const expensesMap = new Map<string, number>();
    expensesData.forEach((item: { _id: string; expenses: number }) => {
      expensesMap.set(item._id, item.expenses);
    });

    // Fill in missing dates with zero values
    const data: ProfitTrendData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const profit = profitMap.get(dateStr);
      const expenses = expensesMap.get(dateStr) || 0;
      const profitAmount = profit?.profit || 0;

      data.push({
        date: dateStr,
        profit: profitAmount,
        expenses,
        netProfit: profitAmount - expenses,
        invoices: profit?.invoices || 0
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching profit trend:', error);
    return [];
  }
}

/**
 * Get Profit Trend Data for Custom Date Range
 */
export async function getProfitTrendByDateRange(startDate: Date, endDate: Date): Promise<ProfitTrendData[]> {
  try {
    await dbConnect();

    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    // Get profit data grouped by date
    const profitData = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $ne: 'cancelled' },
          date: { $gte: start, $lte: end },
          profit: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' }
          },
          profit: { $sum: '$profit' },
          invoices: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get expenses data grouped by date
    const expensesData = await ExpenseModel.aggregate([
      {
        $match: {
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' }
          },
          expenses: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Create maps of existing data
    const profitMap = new Map<string, { profit: number; invoices: number }>();
    profitData.forEach((item: { _id: string; profit: number; invoices: number }) => {
      profitMap.set(item._id, {
        profit: item.profit,
        invoices: item.invoices
      });
    });

    const expensesMap = new Map<string, number>();
    expensesData.forEach((item: { _id: string; expenses: number }) => {
      expensesMap.set(item._id, item.expenses);
    });

    // Fill in missing dates with zero values
    const data: ProfitTrendData[] = [];
    const daysDiff = differenceInDays(end, start);
    
    for (let i = 0; i <= daysDiff; i++) {
      const date = addDays(start, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const profit = profitMap.get(dateStr);
      const expenses = expensesMap.get(dateStr) || 0;
      const profitAmount = profit?.profit || 0;

      data.push({
        date: dateStr,
        profit: profitAmount,
        expenses,
        netProfit: profitAmount - expenses,
        invoices: profit?.invoices || 0
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching profit trend by date range:', error);
    return [];
  }
}

/**
 * Get Monthly Profit Trend Data (Last 12 Months)
 */
export async function getMonthlyProfitTrend(): Promise<ProfitTrendData[]> {
  try {
    await dbConnect();

    const now = new Date();
    const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    // Get profit data grouped by month
    const profitData = await InvoiceModel.aggregate([
      {
        $match: {
          type: 'invoice',
          status: { $ne: 'cancelled' },
          date: { $gte: startDate },
          profit: { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-01', date: '$date', timezone: 'UTC' }
          },
          profit: { $sum: '$profit' },
          invoices: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get expenses data grouped by month
    const expensesData = await ExpenseModel.aggregate([
      {
        $match: {
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-01', date: '$date', timezone: 'UTC' }
          },
          expenses: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Create maps of existing data
    const profitMap = new Map<string, { profit: number; invoices: number }>();
    profitData.forEach((item: { _id: string; profit: number; invoices: number }) => {
      profitMap.set(item._id, {
        profit: item.profit,
        invoices: item.invoices
      });
    });

    const expensesMap = new Map<string, number>();
    expensesData.forEach((item: { _id: string; expenses: number }) => {
      expensesMap.set(item._id, item.expenses);
    });

    // Fill in missing months with zero values
    const data: ProfitTrendData[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const dateStr = format(date, 'yyyy-MM-01');

      const profit = profitMap.get(dateStr);
      const expenses = expensesMap.get(dateStr) || 0;
      const profitAmount = profit?.profit || 0;

      data.push({
        date: dateStr,
        profit: profitAmount,
        expenses,
        netProfit: profitAmount - expenses,
        invoices: profit?.invoices || 0
      });
    }

    return data;
  } catch (error) {
    console.error('Error fetching monthly profit trend:', error);
    return [];
  }
}

/**
 * Get Out of Stock Alerts (products with 0 total remaining stock or no purchases)
 */
export async function getLowStockAlerts(limit = 5, skip = 0, threshold = 0) {
  try {
    await dbConnect();

    const results = await ProductModel.aggregate([
      // Break variants into separate docs
      { $unwind: '$variants' },

      // Join purchase records for each variant
      {
        $lookup: {
          from: 'purchases',
          let: { productId: '$_id', variantId: '$variants.id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$productId', '$$productId'] }, { $eq: ['$variantId', '$$variantId'] }]
                }
              }
            },
            { $group: { _id: null, totalRemaining: { $sum: '$remaining' } } }
          ],
          as: 'purchaseData'
        }
      },

      // Use `0` if no purchase data
      {
        $addFields: {
          totalRemaining: {
            $ifNull: [{ $arrayElemAt: ['$purchaseData.totalRemaining', 0] }, 0]
          }
        }
      },

      // Filter out only out-of-stock variants
      {
        $match: {
          $or: [{ totalRemaining: { $lte: threshold } }, { totalRemaining: { $exists: false } }]
        }
      },

      // Sort
      { $sort: { name: 1 } },

      // Pagination
      { $skip: skip },
      { $limit: limit },

      // Final shape
      {
        $project: {
          _id: 0,
          id: { $concat: [{ $toString: '$_id' }, '-', '$variants.id'] },
          productName: '$name',
          sku: '$variants.sku',
          image: '$variants.image',
          currentStock: '$totalRemaining',
          minStock: 1
        }
      }
    ]);

    return results;
  } catch (err) {
    console.error('Error fetching low stock alerts:', err);
    return [];
  }
}

/**
 * Get Overdue Invoices
 */
export async function getOverdueInvoices(limit: number = 5, skip: number = 0): Promise<OverdueInvoiceAlert[]> {
  try {
    await dbConnect();

    const today = startOfDay(new Date());

    interface OverdueInvoiceDoc {
      _id: { toString(): string };
      invoiceNumber: string;
      customerName: string;
      balanceAmount: number;
      dueDate: Date;
    }

    const overdueInvoices = (await InvoiceModel.find({
      type: 'invoice',
      status: { $in: ['pending', 'partial'] },
      dueDate: { $lt: today }
    })
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit)
      .lean()) as OverdueInvoiceDoc[];

    return overdueInvoices.map(invoice => {
      const daysOverdue = differenceInDays(today, new Date(invoice.dueDate));

      return {
        id: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        amount: invoice.balanceAmount,
        dueDate: invoice.dueDate,
        daysOverdue
      };
    });
  } catch (error) {
    console.error('Error fetching overdue invoices:', error);
    return [];
  }
}

/**
 * Get Pending Payments (invoices due within 14 days)
 */
export async function getPendingPayments(limit: number = 5, skip: number = 0): Promise<PendingPaymentAlert[]> {
  try {
    await dbConnect();

    const today = startOfDay(new Date());
    const fourteenDaysFromNow = endOfDay(addDays(new Date(), 14));

    interface PendingInvoiceDoc {
      _id: { toString(): string };
      invoiceNumber: string;
      customerName: string;
      balanceAmount: number;
      dueDate: Date;
    }

    const pendingInvoices = (await InvoiceModel.find({
      type: 'invoice',
      status: { $in: ['pending', 'partial'] },
      dueDate: { $gte: today, $lte: fourteenDaysFromNow }
    })
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(limit)
      .lean()) as PendingInvoiceDoc[];

    return pendingInvoices.map(invoice => {
      const daysUntilDue = differenceInDays(new Date(invoice.dueDate), today);

      return {
        id: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        amount: invoice.balanceAmount,
        dueDate: invoice.dueDate,
        daysUntilDue
      };
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    return [];
  }
}

/**
 * Get Complete Dashboard Data
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [
    metrics,
    salesTrend,
    salesTrend30Days,
    salesTrendMonthly,
    profitTrend,
    profitTrend30Days,
    profitTrendMonthly,
    outOfStockAlerts,
    overdueInvoices,
    pendingPayments
  ] = await Promise.all([
    getDashboardMetrics(),
    getSalesTrend(7),
    getSalesTrend(30),
    getMonthlySalesTrend(),
    getProfitTrend(7),
    getProfitTrend(30),
    getMonthlyProfitTrend(),
    getLowStockAlerts(),
    getOverdueInvoices(),
    getPendingPayments()
  ]);

  return {
    metrics,
    salesTrend,
    salesTrend30Days,
    salesTrendMonthly,
    profitTrend,
    profitTrend30Days,
    profitTrendMonthly,
    outOfStockAlerts,
    overdueInvoices,
    pendingPayments
  };
}
