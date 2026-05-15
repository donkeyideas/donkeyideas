import { api } from './client';

export interface Company {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  logo?: string;
  status: string;
  businessProfile?: {
    gaPropertyId?: string;
    gpPackageName?: string;
    ascBundleId?: string;
  };
}

export interface ConsolidatedSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashBalance: number;
  companyCount: number;
  activeProjects: number;
}

export async function getCompanies(): Promise<Company[]> {
  const { data } = await api.get('/companies');
  return data.companies || data;
}

export async function getConsolidatedSummary(): Promise<ConsolidatedSummary> {
  const { data } = await api.get('/companies/consolidated/summary');
  return data;
}
