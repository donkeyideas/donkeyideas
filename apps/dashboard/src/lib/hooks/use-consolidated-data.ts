// Custom hook for consolidated financial data with React Query
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

interface ConsolidatedData {
  totalRevenue: number;
  totalCOGS: number;
  totalExpenses: number;
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
      // Calculate from actual transactions for each company - NO backend API call
      // This ensures no hardcoded/mock data
      const companyFinancials = await Promise.all(
        companies.map(async (company) => {
          try {
            // Get transactions for this company (with month filter if provided)
            const transactionsUrl = monthFilter 
              ? `/companies/${company.id}/transactions?month=${monthFilter}`
              : `/companies/${company.id}/transactions`;
            const transactionsRes = await api.get(transactionsUrl).catch(() => ({ data: { transactions: [] } }));
            const transactions = transactionsRes.data.transactions || [];
            
            // If month filter is provided, also filter transactions client-side as backup
            let filteredTransactions = transactions;
            if (monthFilter) {
              const [year, month] = monthFilter.split('-').map(Number);
              const startDate = new Date(year, month - 1, 1);
              const endDate = new Date(year, month, 0, 23, 59, 59);
              filteredTransactions = transactions.filter((tx: any) => {
                const txDate = new Date(tx.date);
                return txDate >= startDate && txDate <= endDate;
              });
            }
            
            // Calculate metrics from transactions
            let revenue = 0;
            let cogs = 0;
            let operatingExpenses = 0;
            let cashBalance = 0;
            
            // Balance sheet calculations
            let accountsReceivable = 0;
            let fixedAssets = 0;
            let accountsPayable = 0;
            let shortTermDebt = 0;
            let longTermDebt = 0;
            
            filteredTransactions.forEach((tx: any) => {
              const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
              const category = (tx.category || '').toLowerCase().trim();
              
              // P&L Calculation
              if (tx.affectsPL !== false) {
                if (tx.type === 'revenue') {
                  revenue += Math.abs(amount);
                } else if (tx.type === 'expense') {
                  if (category === 'direct_costs' || category === 'infrastructure' || 
                      category === 'direct costs' || category === 'infrastructure costs') {
                    cogs += Math.abs(amount);
                  } else {
                    operatingExpenses += Math.abs(amount);
                  }
                }
              }
              
              // Cash Flow Calculation (single pass - no double counting!)
              if (tx.affectsCashFlow !== false) {
                if (tx.type === 'revenue') {
                  cashBalance += Math.abs(amount);
                } else if (tx.type === 'expense') {
                  cashBalance -= Math.abs(amount);
                } else if (tx.type === 'asset') {
                  // Asset purchases reduce cash (negative), asset sales increase cash (positive)
                  cashBalance += amount;
                } else if (tx.type === 'liability') {
                  // Taking on debt increases cash (positive), paying off debt reduces cash (negative)
                  cashBalance += amount;
                } else if (tx.type === 'equity') {
                  // Equity contributions increase cash
                  cashBalance += Math.abs(amount);
                }
              }
              
              // Balance Sheet Positions (separate from cash flow)
              if (tx.affectsBalance !== false) {
                if (tx.type === 'asset') {
                  if (category === 'accounts_receivable' || category === 'accounts receivable') {
                    accountsReceivable += amount;
                  } else if (category === 'equipment' || category === 'inventory' || category === 'fixed_assets' || category === 'fixed assets') {
                    fixedAssets += amount;
                  }
                  // Note: Cash transactions are handled above in cashBalance
                } else if (tx.type === 'liability') {
                  if (category === 'accounts_payable' || category === 'accounts payable') {
                    accountsPayable += amount;
                  } else if (category === 'short_term_debt' || category === 'short term debt') {
                    shortTermDebt += amount;
                  } else if (category === 'long_term_debt' || category === 'long term debt') {
                    longTermDebt += amount;
                  }
                } else if (tx.type === 'revenue' && tx.affectsCashFlow === false) {
                  // Accrual revenue increases A/R
                  accountsReceivable += Math.abs(amount);
                } else if (tx.type === 'expense' && tx.affectsCashFlow === false) {
                  // Accrual expense increases A/P
                  accountsPayable += Math.abs(amount);
                }
              }
            });
            
            // Total expenses = COGS + Operating Expenses
            const totalExpenses = cogs + operatingExpenses;
            
            // Calculate balance sheet totals
            // Cash Balance from cash flow is already calculated above
            const totalAssets = cashBalance + accountsReceivable + fixedAssets;
            const totalLiabilities = accountsPayable + shortTermDebt + longTermDebt;
            const totalEquity = totalAssets - totalLiabilities;
            
            return { revenue, cogs, operatingExpenses, totalExpenses, cashBalance, totalAssets, totalLiabilities, totalEquity };
          } catch (error) {
            console.error(`Failed to load financials for ${company.name}:`, error);
            return { revenue: 0, cogs: 0, operatingExpenses: 0, totalExpenses: 0, cashBalance: 0, totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
          }
        })
      );
      
      // Calculate consolidated totals
      const totalRevenue = companyFinancials.reduce((sum, c) => sum + c.revenue, 0);
      const totalCOGS = companyFinancials.reduce((sum, c) => sum + c.cogs, 0);
      const totalExpenses = companyFinancials.reduce((sum, c) => sum + c.totalExpenses, 0);
      const netProfit = totalRevenue - totalExpenses;
      const totalCashBalance = companyFinancials.reduce((sum, c) => sum + c.cashBalance, 0);
      const totalAssets = companyFinancials.reduce((sum, c) => sum + c.totalAssets, 0);
      const totalLiabilities = companyFinancials.reduce((sum, c) => sum + c.totalLiabilities, 0);
      const totalEquity = companyFinancials.reduce((sum, c) => sum + c.totalEquity, 0);
      
      // Get team members count (if available from backend, otherwise 0)
      let totalTeamMembers = 0;
      try {
        const summaryRes = await api.get('/companies/consolidated/summary').catch(() => ({ data: null }));
        totalTeamMembers = summaryRes.data?.totalTeamMembers || 0;
      } catch (error) {
        // Ignore - team members is not critical
      }
      
      return {
        totalRevenue,
        totalCOGS,
        totalExpenses,
        netProfit,
        totalAssets,
        totalEquity,
        totalCashBalance,
        totalValuation: 0, // TODO: Calculate from valuation engine
        activeCompanies: companies.length,
        totalTeamMembers,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - financial data changes more often
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}

