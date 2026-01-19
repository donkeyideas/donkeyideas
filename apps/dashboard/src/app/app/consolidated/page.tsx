'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

interface ConsolidatedFinancials {
  totalRevenue: number;
  totalCOGS: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalCashBalance: number;
  activeCompanies: number;
  totalValuation: number;
  companies: Array<{
    id: string;
    name: string;
    logo?: string | null;
    projectStatus: string | null;
    revenue: number;
    cogs: number;
    expenses: number;
    profit: number;
    cashBalance: number;
    valuation: number;
  }>;
}

export default function ConsolidatedViewPage() {
  const { companies } = useAppStore();
  const [financials, setFinancials] = useState<ConsolidatedFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<string>(''); // Format: YYYY-MM or empty for all

  useEffect(() => {
    if (companies.length > 0) {
      loadConsolidatedFinancials();
    }
  }, [monthFilter, companies]);

  const loadConsolidatedFinancials = async () => {
    try {
      setLoading(true);
      
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
            let transactions = transactionsRes.data.transactions || [];
            
            // If month filter is provided, also filter transactions client-side as backup
            if (monthFilter) {
              const [year, month] = monthFilter.split('-').map(Number);
              const startDate = new Date(year, month - 1, 1);
              const endDate = new Date(year, month, 0, 23, 59, 59);
              transactions = transactions.filter((tx: any) => {
                const txDate = new Date(tx.date);
                return txDate >= startDate && txDate <= endDate;
              });
            }
            
            // Calculate metrics from transactions
            let revenue = 0;
            let cogs = 0;
            let operatingExpenses = 0;
            let cashBalance = 0;
            
            transactions.forEach((tx: any) => {
              const amount = Math.abs(typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount);
              const signedAmount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
              
              // P&L Calculation
              if (tx.affectsPL !== false) {
                if (tx.type === 'revenue') {
                  revenue += amount;
                } else if (tx.type === 'expense') {
                  const category = (tx.category || '').toLowerCase().trim();
                  if (category === 'direct_costs' || category === 'infrastructure' || 
                      category === 'direct costs' || category === 'infrastructure costs') {
                    cogs += amount;
                  } else {
                    operatingExpenses += amount;
                  }
                }
              }
              
              // Cash Flow Calculation (single pass - no double counting!)
              if (tx.affectsCashFlow !== false) {
                if (tx.type === 'revenue') {
                  cashBalance += amount;
                } else if (tx.type === 'expense') {
                  cashBalance -= amount;
                } else if (tx.type === 'asset' || tx.type === 'liability') {
                  // Asset/Liability transactions use signed amounts
                  cashBalance += signedAmount;
                } else if (tx.type === 'equity') {
                  // Equity contributions increase cash
                  cashBalance += amount;
                }
              }
            });
            
            // Total expenses = COGS + Operating Expenses
            const totalExpenses = cogs + operatingExpenses;
            const profit = revenue - totalExpenses;
            
            // Get logo from multiple sources: store, then localStorage
            let logoUrl = company.logo || null;
            if (!logoUrl && typeof window !== 'undefined') {
              const storedLogo = localStorage.getItem(`company-logo-${company.id}`);
              if (storedLogo) {
                logoUrl = storedLogo;
              }
            }
            
            return {
              id: company.id,
              name: company.name,
              logo: logoUrl,
              projectStatus: null, // TODO: Get from company profile if needed
              revenue,
              cogs,
              expenses: totalExpenses,
              profit,
              cashBalance,
              valuation: 0, // TODO: Calculate from valuation engine if needed
            };
          } catch (error) {
            console.error(`Failed to load financials for ${company.name}:`, error);
            // Return zeros if we can't load
            // Get logo from multiple sources: store, then localStorage
            let logoUrl = company.logo || null;
            if (!logoUrl && typeof window !== 'undefined') {
              const storedLogo = localStorage.getItem(`company-logo-${company.id}`);
              if (storedLogo) {
                logoUrl = storedLogo;
              }
            }
            
            return {
              id: company.id,
              name: company.name,
              logo: logoUrl,
              projectStatus: null,
              revenue: 0,
              cogs: 0,
              expenses: 0,
              profit: 0,
              cashBalance: 0,
              valuation: 0,
            };
          }
        })
      );
      
      // Calculate consolidated totals
      const totalRevenue = companyFinancials.reduce((sum, c) => sum + c.revenue, 0);
      const totalCOGS = companyFinancials.reduce((sum, c) => sum + c.cogs, 0);
      const totalExpenses = companyFinancials.reduce((sum, c) => sum + c.expenses, 0);
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const totalCashBalance = companyFinancials.reduce((sum, c) => sum + c.cashBalance, 0);
      
      // Calculate assets, liabilities, equity (for now set to 0 or calculate from balance sheet if needed)
      const totalAssets = 0; // TODO: Calculate from balance sheet transactions
      const totalLiabilities = 0; // TODO: Calculate from balance sheet transactions
      const totalEquity = totalAssets - totalLiabilities;
      const totalValuation = companyFinancials.reduce((sum, c) => sum + c.valuation, 0);
      
      const consolidated: ConsolidatedFinancials = {
        totalRevenue,
        totalCOGS,
        totalExpenses,
        netProfit,
        profitMargin,
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalCashBalance,
        activeCompanies: companies.length,
        totalValuation,
        companies: companyFinancials,
      };
      
      // Log summary only if there are transactions
      const companiesWithTransactions = companyFinancials.filter(c => c.revenue > 0 || c.expenses > 0 || c.cashBalance !== 0);
      if (companiesWithTransactions.length > 0) {
        console.log(`[Consolidated] ${companies.length} companies, ${companiesWithTransactions.length} with transactions`);
      }
      
      setFinancials(consolidated);
    } catch (error) {
      console.error('Failed to load consolidated financials:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Generate list of available months (last 12 months)
  const getAvailableMonths = () => {
    const monthsList: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthsList.push(monthKey);
    }
    return monthsList;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/companies/consolidated/financials/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `consolidated-financials-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  if (loading) {
    return <div className="text-white/60 [.light_&]:text-slate-600">Loading consolidated financials...</div>;
  }

  if (!financials) {
    return (
      <EmptyState
        icon={
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        title="No financial data available"
        description="Add financial data to your companies to see consolidated reports"
      />
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">Consolidated Financials</h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            Donkey Ideas — Combined financial overview of all companies
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/60 [.light_&]:text-slate-600">Filter by Month:</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white text-sm focus:outline-none focus:border-blue-500 [&>option]:bg-[#0F0F0F] [&>option]:text-white [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&_option]:bg-white [.light_&_option]:text-slate-900 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            >
              <option value="">All Time</option>
              {getAvailableMonths().map((month) => {
                const [year, monthNum] = month.split('-');
                const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return (
                  <option key={month} value={month}>
                    {monthName}
                  </option>
                );
              })}
            </select>
          </div>
          <Button 
            variant="secondary" 
            onClick={async () => {
              try {
                await api.post('/companies/consolidated/rebuild-cashflow');
                loadConsolidatedFinancials();
                alert('Cash flow statements rebuilt successfully for all companies');
              } catch (error: any) {
                alert(error.response?.data?.error?.message || 'Failed to rebuild cash flow');
              }
            }}
          >
            Rebuild Cash Flow
          </Button>
          <Button variant="secondary" onClick={loadConsolidatedFinancials}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Consolidated P&L</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-white [.light_&]:text-slate-900">{formatCurrency(financials.totalRevenue)}</div>
            </div>
            <div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">COGS</div>
              <div className="text-2xl font-bold text-orange-400">
                {formatCurrency(financials.totalCOGS || 0)}
              </div>
            </div>
            <div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Total Expenses</div>
              <div className="text-2xl font-bold text-red-400">
                {formatCurrency(financials.totalExpenses)}
              </div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Net Profit</div>
              <div className={`text-2xl font-bold ${financials.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(financials.netProfit)}
              </div>
              <div className="text-xs text-white/60 [.light_&]:text-slate-600 mt-1">
                Margin: {financials.profitMargin?.toFixed(1) || '0.0'}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consolidated Balance Sheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Total Assets</div>
              <div className="text-2xl font-bold text-white [.light_&]:text-slate-900">{formatCurrency(financials.totalAssets)}</div>
            </div>
            <div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Total Liabilities</div>
              <div className="text-2xl font-bold text-red-400">
                {formatCurrency(financials.totalLiabilities)}
              </div>
            </div>
            <div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Cash Balance</div>
              <div className="text-2xl font-bold text-blue-400">
                {formatCurrency(financials.totalCashBalance || 0)}
              </div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Total Equity</div>
              <div className="text-2xl font-bold text-green-500">
                {formatCurrency(financials.totalEquity)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Active Companies</div>
                <div className="text-3xl font-bold text-white [.light_&]:text-slate-900">{financials.activeCompanies}</div>
              </div>
              <div>
                <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Total Portfolio Valuation</div>
                <div className="text-3xl font-bold text-blue-400">
                  {formatCurrency(financials.totalValuation)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Profit Margin</div>
                <div className="text-3xl font-bold text-white [.light_&]:text-slate-900">
                  {financials.profitMargin?.toFixed(1) || (financials.totalRevenue > 0
                    ? ((financials.netProfit / financials.totalRevenue) * 100).toFixed(1)
                    : '0.0')}
                  %
                </div>
              </div>
              <div>
                <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Average Company Valuation</div>
                <div className="text-3xl font-bold text-white [.light_&]:text-slate-900">
                  {formatCurrency(
                    financials.activeCompanies > 0
                      ? financials.totalValuation / financials.activeCompanies
                      : 0
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Company Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Company</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Revenue</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">COGS</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Expenses</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Profit</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Cash</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Valuation</th>
                </tr>
              </thead>
              <tbody>
                {financials.companies.map((company) => (
                  <tr key={company.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {company.logo ? (
                          <img
                            src={company.logo}
                            alt={company.name}
                            className="w-8 h-8 object-contain rounded border border-white/10 bg-white/5 p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded border border-white/10 bg-white/5 flex items-center justify-center text-xs text-white/40 [.light_&]:text-slate-500">
                            {company.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{company.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {company.projectStatus ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {company.projectStatus}
                        </span>
                      ) : (
                        <span className="text-white/40 [.light_&]:text-slate-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">{formatCurrency(company.revenue)}</td>
                    <td className="py-3 px-4 text-right text-orange-400">
                      {formatCurrency(company.cogs || 0)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-400">
                      {formatCurrency(company.expenses)}
                    </td>
                    <td className={`py-3 px-4 text-right ${company.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(company.profit)}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-400">
                      {formatCurrency(company.cashBalance || 0)}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-400">
                      {formatCurrency(company.valuation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

