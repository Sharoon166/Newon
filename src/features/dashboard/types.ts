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
  dailySalesTrend: number;
  monthlySales: number;
  monthlySalesTrend: number;
  totalRevenue: number;
  monthlyProfit: number;
  monthlyExpenses: number;
  netProfit: number;
  netProfitTrend: number;
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
 * Profit Trend Data Point
 */
export interface ProfitTrendData {
  date: string;
  profit: number;
  expenses: number;
  netProfit: number;
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
 * Product Origin Data Point
 */
export interface ProductOriginData {
  origin: 'local' | 'imported';
  count: number;
}

/**
 * A supplier that owes money, used by the Payables widget.
 */
export interface PayableSupplier {
  id: string;
  supplierId?: string;
  name: string;
  outstandingBalance: number;
  /** Date of the oldest unpaid purchase - drives the aging buckets */
  oldestUnpaidDate?: string | Date;
}

/**
 * Payables summary for the dashboard: total owed, how many suppliers have an
 * open balance, aging buckets (based on each supplier's oldest unpaid
 * purchase), and the top debtors.
 */
export interface PayablesSummary {
  totalOutstanding: number;
  supplierCount: number;
  aging: {
    current: number;
    days30: number;
    days60: number;
    days90Plus: number;
  };
  topSuppliers: PayableSupplier[];
}

/**
 * Dashboard Data
 */
export interface DashboardData {
  metrics: DashboardMetrics;
  salesTrend: SalesTrendData[];
  salesTrend30Days: SalesTrendData[];
  salesTrendMonthly: SalesTrendData[];
  profitTrend: ProfitTrendData[];
  profitTrend30Days: ProfitTrendData[];
  profitTrendMonthly: ProfitTrendData[];
  outOfStockAlerts: OutOfStockAlert[];
  overdueInvoices: OverdueInvoiceAlert[];
  pendingPayments: PendingPaymentAlert[];
  productOriginData: ProductOriginData[];
  payables: PayablesSummary;
  productOriginProfitData?: ProductOriginProfitData[];
}

/**
 * Product Origin Profit Data
 */
export interface ProductOriginProfitData {
  origin: 'local' | 'imported';
  profit: number;
  revenue: number;
  invoices: number;
  items: number;
}
