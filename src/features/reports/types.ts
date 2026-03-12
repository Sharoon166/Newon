export interface MonthlyReport {
  month: number;
  year: number;
  monthName: string;
  invoicesCount: number;
  quotationsCount: number;
  revenue: number;
  expenses: number;
  grossProfit: number;
  profit: number;
  paidAmount: number;
  outstandingAmount: number;
}

export interface YearlyReportData {
  year: number;
  monthlyReports: MonthlyReport[];
  totals: {
    invoicesCount: number;
    quotationsCount: number;
    revenue: number;
    expenses: number;
    grossProfit: number;
    profit: number;
    paidAmount: number;
    outstandingAmount: number;
  };
}
