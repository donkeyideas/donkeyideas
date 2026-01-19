'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import { useAppStore } from '@/lib/store';

interface ConsolidatedFinancials {
  totalRevenue: number;
  totalCOGS: number;
  totalOperatingExpenses: number;
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
    operatingExpenses: number;
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
      
      // Use the backend API which properly calculates balance sheet values
      const url = monthFilter 
        ? `/companies/consolidated/financials?month=${monthFilter}`
        : `/companies/consolidated/financials`;
      
      const response = await api.get(url);
      const data = response.data;
      
      setFinancials(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load consolidated financials:', error);
      setFinancials(null);
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
              if (!confirm('This will rebuild balance sheets and cash flow for ALL companies. Continue?')) return;
              try {
                const response = await api.post('/companies/consolidated/rebuild-all-balance-sheets');
                loadConsolidatedFinancials();
                alert(response.data.message || 'Balance sheets rebuilt successfully for all companies');
              } catch (error: any) {
                alert(error.response?.data?.error?.message || 'Failed to rebuild balance sheets');
              }
            }}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
          >
            Rebuild All Balance Sheets
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
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">OpEx</th>
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
                      {formatCurrency(company.operatingExpenses || 0)}
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

