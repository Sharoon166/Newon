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
  ProductOriginData,
  ProductOriginProfitData,
  DashboardData
} from '../types';

/**
 * Get Dashboard Metrics
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    await dbConnect();

    const { subMonths } = await import('date-fns');
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);

    // Previous periods for trends
    const yesterdayStart = startOfDay(subDays(now, 1));
    const yesterdayEnd = endOfDay(subDays(now, 1));
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfDay(subDays(monthStart, 1));

    const [
      stockData,
      dailySalesData,
      monthlySalesData,
      totalRevenueData,
      pendingPaymentsData,
      monthlyProfitData,
      monthlyExpensesData
    ] = await Promise.all([
      PurchaseModel.aggregate([
        {
          $group: {
            _id: null,
            totalStock: { $sum: '$remaining' },
            totalStockValue: { $sum: { $multiply: ['$remaining', '$unitPrice'] } }
          }
        }
      ]),

      InvoiceModel.aggregate([
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
      ]),

      InvoiceModel.aggregate([
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
      ]),

      InvoiceModel.aggregate([
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
      ]),

      InvoiceModel.aggregate([
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
      ]),

      InvoiceModel.aggregate([
        {
          $match: {
            type: 'invoice',
            status: { $ne: 'cancelled' },
            date: { $gte: monthStart },
            profit: { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$profit' }
          }
        }
      ]),

      ExpenseModel.aggregate([
        { $match: { date: { $gte: monthStart }, source: "manual" } },
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
            _id: null,
            total: {
              $sum: {
                $cond: [{ $eq: ['$source', 'project'] }, '$paidTx', { $ifNull: ['$amount', 0] }]
              }
            }
          }
        }
      ])
    ]);
    // Get total stock and value from purchases
    // const stockData = await PurchaseModel.aggregate([
    //   {
    //     $group: {
    //       _id: null,
    //       totalStock: { $sum: '$remaining' },
    //       totalStockValue: { $sum: { $multiply: ['$remaining', '$unitPrice'] } }
    //     }
    //   }
    // ]);

    // // Get daily sales (today's invoices)
    // const dailySalesData = await InvoiceModel.aggregate([
    //   {
    //     $match: {
    //       type: 'invoice',
    //       status: { $ne: 'cancelled' },
    //       date: { $gte: todayStart, $lte: todayEnd }
    //     }
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       total: { $sum: '$totalAmount' }
    //     }
    //   }
    // ]);

    // // Get monthly sales
    // const monthlySalesData = await InvoiceModel.aggregate([
    //   {
    //     $match: {
    //       type: 'invoice',
    //       status: { $ne: 'cancelled' },
    //       date: { $gte: monthStart }
    //     }
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       total: { $sum: '$totalAmount' }
    //     }
    //   }
    // ]);

    // // Get total revenue (all time)
    // const totalRevenueData = await InvoiceModel.aggregate([
    //   {
    //     $match: {
    //       type: 'invoice',
    //       status: { $ne: 'cancelled' }
    //     }
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       total: { $sum: '$totalAmount' }
    //     }
    //   }
    // ]);

    // // Get pending payments
    // const pendingPaymentsData = await InvoiceModel.aggregate([
    //   {
    //     $match: {
    //       type: 'invoice',
    //       status: { $in: ['pending', 'partial'] }
    //     }
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       total: { $sum: '$balanceAmount' },
    //       count: { $sum: 1 }
    //     }
    //   }
    // ]);

    // // Get monthly profit (sum of profit fields from this month's invoices)
    // const monthlyProfitData = await InvoiceModel.aggregate([
    //   {
    //     $match: {
    //       type: 'invoice',
    //       status: { $ne: 'cancelled' },
    //       date: { $gte: monthStart },
    //       profit: { $exists: true }
    //     }
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       total: { $sum: '$profit' }
    //     }
    //   }
    // ]);

    // // Get monthly expenses (include all expenses like expenses page)
    // const monthlyExpensesData = await ExpenseModel.aggregate([
    //   { $match: { date: { $gte: monthStart } } },
    //   {
    //     $addFields: {
    //       paidTx: {
    //         $reduce: {
    //           input: { $ifNull: ['$transactions', []] },
    //           initialValue: 0,
    //           in: { $add: ['$$value', { $ifNull: ['$$this.amount', 0] }] }
    //         }
    //       }
    //     }
    //   },
    //   {
    //     $group: {
    //       _id: null,
    //       total: {
    //         $sum: {
    //           $cond: [{ $eq: ['$source', 'project'] }, '$paidTx', { $ifNull: ['$amount', 0] }]
    //         }
    //       }
    //     }
    //   }
    // ]);

    // Previous period data for trends
    const [yesterdaySalesData, lastMonthSalesData, lastMonthProfitData, lastMonthExpensesData] = await Promise.all([
      InvoiceModel.aggregate([
        {
          $match: {
            type: 'invoice',
            status: { $ne: 'cancelled' },
            date: { $gte: yesterdayStart, $lte: yesterdayEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]),
      InvoiceModel.aggregate([
        {
          $match: {
            type: 'invoice',
            status: { $ne: 'cancelled' },
            date: { $gte: lastMonthStart, $lte: lastMonthEnd }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]),
      InvoiceModel.aggregate([
        {
          $match: {
            type: 'invoice',
            status: { $ne: 'cancelled' },
            date: { $gte: lastMonthStart, $lte: lastMonthEnd },
            profit: { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$profit' }
          }
        }
      ]),
      ExpenseModel.aggregate([
        {
          $match: {
            date: { $gte: lastMonthStart, $lte: lastMonthEnd },
            source: { $ne: 'invoice' }
          }
        },
        { $unwind: { path: '$transactions', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$transactions.amount', 0] } }
          }
        }
      ])
      // ExpenseModel.aggregate([
      //   { $match: {date: { $gte: lastMonthStart, $lte: lastMonthEnd },} },
      //   {
      //     $addFields: {
      //       paidTx: {
      //         $reduce: {
      //           input: { $ifNull: ['$transactions', []] },
      //           initialValue: 0,
      //           in: { $add: ['$$value', { $ifNull: ['$$this.amount', 0] }] }
      //         }
      //       }
      //     }
      //   },
      //   {
      //     $group: {
      //       _id: null,
      //       total: {
      //         $sum: {
      //           $cond: [{ $eq: ['$source', 'project'] }, '$paidTx', { $ifNull: ['$amount', 0] }]
      //         }
      //       }
      //     }
      //   }
      // ])
    ]);

    const dailySales = dailySalesData[0]?.total || 0;
    const yesterdaySales = yesterdaySalesData[0]?.total || 0;
    const monthlySales = monthlySalesData[0]?.total || 0;
    const lastMonthSales = lastMonthSalesData[0]?.total || 0;
    const monthlyProfit = monthlyProfitData[0]?.total || 0;
    const lastMonthProfit = lastMonthProfitData[0]?.total || 0;
    const monthlyExpenses = monthlyExpensesData[0]?.total || 0;
    const lastMonthExpenses = lastMonthExpensesData[0]?.total || 0;
    const netProfit = monthlyProfit - monthlyExpenses;
    const lastMonthNetProfit = lastMonthProfit - lastMonthExpenses;

    // Calculate trends
    const calculateTrend = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    // Get total customers
    const totalCustomers = await CustomerModel.countDocuments();

    return {
      totalStock: stockData[0]?.totalStock || 0,
      totalStockValue: stockData[0]?.totalStockValue || 0,
      dailySales,
      dailySalesTrend: calculateTrend(dailySales, yesterdaySales),
      monthlySales,
      monthlySalesTrend: calculateTrend(monthlySales, lastMonthSales),
      totalRevenue: totalRevenueData[0]?.total || 0,
      monthlyProfit,
      monthlyExpenses,
      netProfit,
      netProfitTrend: calculateTrend(netProfit, lastMonthNetProfit),
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
      dailySalesTrend: 0,
      monthlySales: 0,
      monthlySalesTrend: 0,
      totalRevenue: 0,
      monthlyProfit: 0,
      monthlyExpenses: 0,
      netProfit: 0,
      netProfitTrend: 0,
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

    // Get expenses data grouped by date (include all expenses like expenses page)
    // const expensesData = await ExpenseModel.aggregate([
    //   {
    //     $match: {
    //       date: { $gte: startDate, $lte: todayEnd }
    //     }
    //   },
    //   {
    //     $group: {
    //       _id: {
    //         $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' }
    //       },
    //       expenses: { $sum: '$amount' }
    //     }
    //   },
    //   {
    //     $sort: { _id: 1 }
    //   }
    // ]);

    const expensesData = await ExpenseModel.aggregate([
      { $match: { date: { $gte: startDate, $lte: todayEnd } } },
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
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' }
          },
          expenses: {
            $sum: {
              $cond: [{ $eq: ['$source', 'project'] }, '$paidTx', { $ifNull: ['$amount', 0] }]
            }
          }
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

    // Get expenses data grouped by date (include all expenses like expenses page)
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

    // Get expenses data grouped by month (include all expenses like expenses page)
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
          id: { $concat: [{ $toString: '$_id' }, '-', '$variants.sku'] },
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
 * Get Product Origin Distribution (Local vs Imported)
 */
export async function getProductOriginData(): Promise<ProductOriginData[]> {
  try {
    await dbConnect();

    const originData = await ProductModel.aggregate([
      {
        $group: {
          _id: '$origin',
          count: { $sum: 1 }
        }
      }
    ]);

    const result: ProductOriginData[] = [
      { origin: 'local', count: 0 },
      { origin: 'imported', count: 0 }
    ];

    originData.forEach((item: { _id: string; count: number }) => {
      if (item._id === 'local' || item._id === 'imported') {
        const entry = result.find(r => r.origin === item._id);
        if (entry) entry.count = item.count;
      }
    });

    return result;
  } catch (error) {
    console.error('Error fetching product origin data:', error);
    return [
      { origin: 'local', count: 0 },
      { origin: 'imported', count: 0 }
    ];
  }
}

/**
 * Get Profit by Product Origin (Local vs Imported)
 * 
 * Optimized version using MongoDB aggregation pipeline.
 * Products without an origin field are treated as 'local'.
 * All computation is done on the database side for better performance.
 */
export async function getProductOriginProfitData(
  startDate?: Date,
  endDate?: Date
): Promise<ProductOriginProfitData[]> {
  try {
    await dbConnect();

    const now = new Date();
    const monthStart = startOfMonth(now);
    const queryStart = startDate || monthStart;
    const queryEnd = endDate || now;

    // Use aggregation pipeline to calculate profit by origin in a single query
    const result = await InvoiceModel.aggregate([
      // Match invoices in date range
      {
        $match: {
          type: 'invoice',
          status: { $ne: 'cancelled' },
          date: { $gte: queryStart, $lte: queryEnd }
        }
      },
      // Unwind items to process each individually
      { $unwind: '$items' },
      // Skip manual-entry and virtual product items (no origin concept)
      {
        $match: {
          'items.productId': { $ne: 'manual-entry' },
          'items.isVirtualProduct': { $ne: true }
        }
      },
      // Lookup product to get origin
      {
        $lookup: {
          from: 'products',
          let: { productId: { $toObjectId: '$items.productId' } },
          pipeline: [
            { $match: { $expr: { $eq: ['$_id', '$$productId'] } } },
            { $project: { origin: 1 } }
          ],
          as: 'productInfo'
        }
      },
      // Add origin field (default to 'local' if not found or not set)
      {
        $addFields: {
          origin: {
            $ifNull: [
              { $arrayElemAt: ['$productInfo.origin', 0] },
              'local'
            ]
          }
        }
      },
      // Calculate item profit
      {
        $addFields: {
          itemProfit: {
            $cond: {
              if: { $eq: ['$items.isVirtualProduct', true] },
              // Virtual product: (unitPrice - totalCost) * quantity
              then: {
                $multiply: [
                  { $subtract: ['$items.unitPrice', { $add: [{ $ifNull: ['$items.totalComponentCost', 0] }, { $ifNull: ['$items.totalCustomExpenses', 0] }] }] },
                  '$items.quantity'
                ]
              },
              else: {
                $cond: {
                  if: { $gt: [{ $size: { $ifNull: ['$items.customExpenses', []] } }, 0] },
                  // Item with custom expenses
                  then: {
                    $subtract: [
                      { $multiply: ['$items.unitPrice', '$items.quantity'] },
                      { $multiply: [{ $sum: '$items.customExpenses.actualCost' }, '$items.quantity'] }
                    ]
                  },
                  // Regular item: (unitPrice - originalRate) * quantity
                  else: {
                    $multiply: [
                      { $subtract: ['$items.unitPrice', { $ifNull: ['$items.originalRate', 0] }] },
                      '$items.quantity'
                    ]
                  }
                }
              }
            }
          },
          itemRevenue: '$items.totalPrice',
          // Proportional discount share based on item's share of invoice subtotal
          itemDiscountShare: {
            $cond: {
              if: { $gt: [{ $ifNull: ['$subtotal', 0] }, 0] },
              then: {
                $multiply: [
                  { $ifNull: ['$discountAmount', 0] },
                  { $divide: ['$items.totalPrice', '$subtotal'] }
                ]
              },
              else: 0
            }
          }
        }
      },
      // Group by origin
      {
        $group: {
          _id: '$origin',
          profit: {
            $sum: { $subtract: ['$itemProfit', { $ifNull: ['$itemDiscountShare', 0] }] }
          },
          revenue: { $sum: '$itemRevenue' },
          items: { $sum: 1 },
          invoiceIds: { $addToSet: '$_id' }
        }
      },
      // Add invoice count
      {
        $addFields: {
          invoices: { $size: '$invoiceIds' }
        }
      },
      // Project final shape
      {
        $project: {
          _id: 0,
          origin: '$_id',
          profit: 1,
          revenue: 1,
          invoices: 1,
          items: 1
        }
      }
    ]);

    // Ensure both origins are present in result
    const profitByOrigin: ProductOriginProfitData[] = [
      { origin: 'local', profit: 0, revenue: 0, invoices: 0, items: 0 },
      { origin: 'imported', profit: 0, revenue: 0, invoices: 0, items: 0 }
    ];

    result.forEach((item: { origin: string; profit: number; revenue: number; invoices: number; items: number }) => {
      if (item.origin === 'local' || item.origin === 'imported') {
        const entry = profitByOrigin.find(p => p.origin === item.origin);
        if (entry) {
          entry.profit = item.profit;
          entry.revenue = item.revenue;
          entry.invoices = item.invoices;
          entry.items = item.items;
        }
      }
    });

    return profitByOrigin;
  } catch (error) {
    console.error('Error fetching product origin profit data:', error);
    return [
      { origin: 'local', profit: 0, revenue: 0, invoices: 0, items: 0 },
      { origin: 'imported', profit: 0, revenue: 0, invoices: 0, items: 0 }
    ];
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
    pendingPayments,
    productOriginData
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
    getPendingPayments(),
    getProductOriginData()
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
    pendingPayments,
    productOriginData
  };
}
