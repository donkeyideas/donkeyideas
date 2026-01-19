// Custom hook for consolidated financial data with React Query
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

interface ConsolidatedData {
  totalRevenue: number;
  totalCOGS: number;
  totalOperatingExpenses: number;
  totalExpenses: number; // Keep for backward compatibility (COGS + OpEx)
  netProfit: number;
  totalAssets: number;
  totalEquity: number;
  totalCashBalance: number;
  totalValuation: number;
  activeCompanies: number;
  totalTeamMembers: number;
}

export function useConsolidatedData(monthFilter?: string) {
  const { companies } = useAppStore();
  
  return useQuery<ConsolidatedData>({
    queryKey: ['consolidated', 'financials', monthFilter || 'all', companies.map(c => c.id).join(',')],
    queryFn: async () => {
      // Use the backend API which pulls from Balance Sheet database (single source of truth)
      // This prevents calculating cash balance from scratch and getting negative values
      try {
        const url = monthFilter 
          ? `/companies/consolidated/financials?month=${monthFilter}`
          : `/companies/consolidated/financials`;
        const response = await api.get(url);
        const data = response.data;
        
        // Get team members count (if available from backend, otherwise 0)
        let totalTeamMembers = 0;
        try {
          const summaryRes = await api.get('/companies/consolidated/summary').catch(() => ({ data: null }));
          totalTeamMembers = summaryRes.data?.totalTeamMembers || 0;
        } catch (error) {
          // Ignore - team members is not critical
        }
        
        return {
          totalRevenue: data.totalRevenue || 0,
          totalCOGS: data.totalCOGS || 0,
          totalOperatingExpenses: data.totalOperatingExpenses || 0,
          totalExpenses: data.totalExpenses || 0,
          netProfit: data.netProfit || 0,
          totalAssets: data.totalAssets || 0,
          totalEquity: data.totalEquity || 0,
          totalCashBalance: data.totalCashBalance || 0,
          totalValuation: data.totalValuation || 0,
          activeCompanies: data.activeCompanies || companies.length,
          totalTeamMembers,
        };
      } catch (error) {
        console.error('Failed to load consolidated financials:', error);
        // Return zeros if API fails
        return {
          totalRevenue: 0,
          totalCOGS: 0,
          totalOperatingExpenses: 0,
          totalExpenses: 0,
          netProfit: 0,
          totalAssets: 0,
          totalEquity: 0,
          totalCashBalance: 0,
          totalValuation: 0,
          activeCompanies: companies.length,
          totalTeamMembers: 0,
        };
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - financial data changes more often
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}

