import { api } from './client';

export interface FinancialSummary {
  totalRevenue: number;
  cogs: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  cashBalance: number;
}

export interface CompanyBreakdown {
  id: string;
  name: string;
  revenue: number;
  expenses: number;
  profit: number;
  cashBalance: number;
}

export async function getConsolidatedFinancials(month?: string): Promise<{
  summary: FinancialSummary;
  companies: CompanyBreakdown[];
}> {
  const { data } = await api.get('/companies/consolidated/financials', { params: { month } });
  return {
    summary: {
      totalRevenue: data.totalRevenue || 0,
      cogs: data.totalCOGS || 0,
      totalExpenses: data.totalExpenses || 0,
      netProfit: data.netProfit || 0,
      profitMargin: data.profitMargin || 0,
      cashBalance: data.totalCashBalance || 0,
    },
    companies: data.companies || [],
  };
}
