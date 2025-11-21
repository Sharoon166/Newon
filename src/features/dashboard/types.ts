/**
 * Dashboard Types
 */

/**
 * Dashboard Metrics
 */
export interface DashboardMetrics {
  totalStock: number;
  totalStockValue: number;
  dailySales: number;
  monthlySales: number;
  totalRevenue: number;
  pendingPayments: number;
  pendingPaymentsCount: number;
  totalCustomers: number;
}

/**
 * Sales Trend Data Point
 */
export interface SalesTrendData {
  date: string;
  sales: number;
  revenue: number;
  invoices: number;
}

/**
 * Low Stock Alert
 */
export interface OutOfStockAlert {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  image: string;
  minStock: number;
}

/**
 * Overdue Invoice Alert
 */
export interface OverdueInvoiceAlert {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dueDate: string | Date;
  daysOverdue: number;
}

/**
 * Pending Payment Alert
 */
export interface PendingPaymentAlert {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dueDate: string | Date;
  daysUntilDue: number;
}

/**
 * Dashboard Data
 */
export interface DashboardData {
  metrics: DashboardMetrics;
  salesTrend: SalesTrendData[];
  salesTrend30Days: SalesTrendData[];
  outOfStockAlerts: OutOfStockAlert[];
  overdueInvoices: OverdueInvoiceAlert[];
  pendingPayments: PendingPaymentAlert[];
}
