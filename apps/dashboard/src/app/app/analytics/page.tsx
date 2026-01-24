'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { Button } from '@donkey-ideas/ui';
import { NotificationModal } from '@/components/ui/notification-modal';

interface AnalyticsData {
  financial: {
    totalRevenue: number;
    totalCOGS: number;
    totalExpenses: number;
    netProfit: number;
    revenueGrowth: number;
    expenseGrowth: number;
  };
  kpis: {
    mrr: number;
    cac: number;
    ltv: number;
    churnRate: number;
    nps: number;
    activeUsers: number;
    growthRate: number;
  };
  trends: {
    revenue: Array<{ period: string; value: number }>;
    cogs: Array<{ period: string; value: number }>;
    expenses: Array<{ period: string; value: number }>;
    users: Array<{ period: string; value: number }>;
  };
}

export default function AnalyticsPage() {
  const { companies } = useAppStore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<string>(''); // Format: YYYY-MM or empty for all
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  useEffect(() => {
    loadAnalytics();
  }, [monthFilter, companies]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch consolidated financial data for all companies
      const financialsUrl = monthFilter 
        ? `/companies/consolidated/financials/v2?month=${monthFilter}`
        : '/companies/consolidated/financials/v2';
      
      const financialsResponse = await api.get(financialsUrl).catch(() => ({ data: null }));
      const financials = financialsResponse.data;
      
      if (!financials) {
        setLoading(false);
        return;
      }

      // Get all P&L statements for trends (need to fetch from all companies)
      // For now, we'll use the consolidated data structure
      // In a real implementation, you'd want to fetch all company P&L statements
      const plData: any[] = []; // We'll build this from consolidated data if needed
      
      // Calculate growth rates from consolidated data
      // For now, we'll set growth to 0 and calculate from trends if we have historical data
      let revenueGrowth = 0;
      let expenseGrowth = 0;

      // Use consolidated financial data
      const totalRevenue = financials.totalRevenue || 0;
      const totalCOGS = financials.totalCOGS || 0;
      const totalExpenses = financials.totalExpenses || 0;
      const netProfit = financials.netProfit || 0;

      // For trends, we need to fetch P&L data from all companies
      // For now, we'll create empty trends - in production you'd aggregate all company P&L statements
      const revenue: Array<{ period: string; value: number }> = [];
      const cogs: Array<{ period: string; value: number }> = [];
      const expenses: Array<{ period: string; value: number }> = [];
      const users: Array<{ period: string; value: number }> = [];

        // Calculate trends from transactions (single source of truth)
        try {
          const allTransactionPromises = companies.map((company) =>
            api.get(`/companies/${company.id}/transactions`).catch(() => ({ data: { transactions: [] } }))
          );
          const allTransactionResponses = await Promise.all(allTransactionPromises);
          
          // Aggregate all transactions by period
          const periodMap = new Map<string, { revenue: number; cogs: number; expenses: number }>();
          
          allTransactionResponses.forEach((response) => {
            const transactions = response.data?.transactions || [];
            transactions.forEach((tx: any) => {
              if (tx.affectsPL === false) return;
              
              const txDate = new Date(tx.date);
              const periodKey = txDate.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              });
              
              const amount = Math.abs(typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount);
              const category = (tx.category || '').toLowerCase().trim();
              
              const existing = periodMap.get(periodKey) || { revenue: 0, cogs: 0, expenses: 0 };
              
              if (tx.type === 'revenue') {
                existing.revenue += amount;
              } else if (tx.type === 'expense') {
                // COGS categories
                if (category === 'direct_costs' || category === 'direct costs' || 
                    category === 'infrastructure' || category === 'infrastructure costs') {
                  existing.cogs += amount;
                } else {
                  // Operating expenses
                  existing.expenses += amount;
                }
              }
              
              periodMap.set(periodKey, existing);
            });
          });
        
        // Convert to sorted arrays
        const sortedPeriods = Array.from(periodMap.entries()).sort((a, b) => {
          // Parse the period string to compare dates properly
          // Format is "Nov 2025", so we need to parse it correctly
          const dateA = new Date(a[0] + ' 1'); // Add day to make it parseable
          const dateB = new Date(b[0] + ' 1'); // Add day to make it parseable
          return dateA.getTime() - dateB.getTime();
        });
        
        sortedPeriods.forEach(([period, data]) => {
          revenue.push({ period, value: data.revenue });
          cogs.push({ period, value: data.cogs });
          expenses.push({ period, value: data.cogs + data.expenses }); // Total expenses = COGS + OpEx
        });
        
        // Calculate growth rates from trends
        if (revenue.length >= 2) {
          const current = revenue[revenue.length - 1].value;
          const previous = revenue[revenue.length - 2].value;
          if (previous > 0) {
            revenueGrowth = ((current - previous) / previous) * 100;
          }
        }
        
        if (expenses.length >= 2) {
          const current = expenses[expenses.length - 1].value;
          const previous = expenses[expenses.length - 2].value;
          if (previous > 0) {
            expenseGrowth = ((current - previous) / previous) * 100;
          }
        }
      } catch (error) {
        console.error('Failed to load trends:', error);
      }

      setAnalytics({
        financial: {
          totalRevenue,
          totalCOGS,
          totalExpenses,
          netProfit,
          revenueGrowth,
          expenseGrowth,
        },
        kpis: {
          mrr: 0, // Would need to aggregate from all companies
          cac: 0,
          ltv: 0,
          churnRate: 0,
          nps: 0,
          activeUsers: 0,
          growthRate: revenueGrowth,
        },
        trends: {
          revenue,
          cogs,
          expenses,
          users,
        },
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
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

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8 text-white [.light_&]:text-slate-900">Analytics & Reports</h1>
        <div className="text-white/60 [.light_&]:text-slate-600">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div>
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">Analytics & Reports</h1>
            <p className="text-white/60 [.light_&]:text-slate-600">
              Donkey Ideas — Consolidated analytics across all companies
            </p>
          </div>
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
        </div>
        <EmptyState
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          title="No data available"
          description="Add financial data and KPIs to see analytics"
          action={
            <Button variant="primary" onClick={() => window.location.href = '/app/financials'}>
              Go to Financial Hub
            </Button>
          }
        />
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">Analytics & Reports</h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            Donkey Ideas — Consolidated analytics across all companies
          </p>
        </div>
        <div className="flex items-center gap-3">
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
                loadAnalytics();
                setNotification({
                  isOpen: true,
                  title: 'Success',
                  message: 'Cash flow statements rebuilt successfully for all companies',
                  type: 'success',
                });
              } catch (error: any) {
                setNotification({
                  isOpen: true,
                  title: 'Error',
                  message: error.response?.data?.error?.message || 'Failed to rebuild cash flow',
                  type: 'error',
                });
              }
            }}
          >
            Rebuild Cash Flow
          </Button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400 [.light_&]:text-green-600">
              {formatCurrency(analytics.financial.totalRevenue)}
            </div>
            <div className="text-sm text-white/60 [.light_&]:text-slate-600 mt-2">
              Growth: {formatPercent(analytics.financial.revenueGrowth)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">COGS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-400 [.light_&]:text-orange-600">
              {formatCurrency(analytics.financial.totalCOGS || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400 [.light_&]:text-red-600">
              {formatCurrency(analytics.financial.totalExpenses)}
            </div>
            <div className="text-sm text-white/60 [.light_&]:text-slate-600 mt-2">
              Growth: {formatPercent(analytics.financial.expenseGrowth)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${
                analytics.financial.netProfit >= 0
                  ? 'text-green-400 [.light_&]:text-green-600'
                  : 'text-red-400 [.light_&]:text-red-600'
              }`}
            >
              {formatCurrency(analytics.financial.netProfit)}
            </div>
            <div className="text-sm text-white/60 [.light_&]:text-slate-600 mt-2">
              Margin:{' '}
              {analytics.financial.totalRevenue > 0
                ? formatPercent(
                    (analytics.financial.netProfit /
                      analytics.financial.totalRevenue) *
                      100
                  )
                : '0%'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white [.light_&]:text-slate-900">
              {formatCurrency(analytics.kpis.mrr)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">CAC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white [.light_&]:text-slate-900">
              {formatCurrency(analytics.kpis.cac)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">LTV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white [.light_&]:text-slate-900">
              {formatCurrency(analytics.kpis.ltv)}
            </div>
            {analytics.kpis.cac > 0 && (
              <div className="text-xs text-white/60 [.light_&]:text-slate-600 mt-1">
                LTV:CAC = {(analytics.kpis.ltv / analytics.kpis.cac).toFixed(1)}x
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Churn Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white [.light_&]:text-slate-900">
              {analytics.kpis.churnRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">NPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white [.light_&]:text-slate-900">{analytics.kpis.nps}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white [.light_&]:text-slate-900">
              {analytics.kpis.activeUsers.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {formatPercent(analytics.kpis.growthRate)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Section */}
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
              <div className="flex items-end gap-2 h-32">
                {analytics.trends.revenue.length > 0 ? (
                  analytics.trends.revenue.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end"
                    >
                      <div
                        className="w-full bg-blue-500 rounded-t"
                        style={{
                          height: `${
                            (point.value /
                              Math.max(
                                ...analytics.trends.revenue.map((p) => p.value),
                                1
                              )) *
                            100
                          }%`,
                          minHeight: point.value > 0 ? '8px' : '2px',
                        }}
                        title={`${point.period}: $${point.value.toLocaleString()}`}
                      />
                      <div className="text-xs text-white/60 [.light_&]:text-slate-600 mt-2 text-center">
                        {point.period}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-white/40 [.light_&]:text-slate-500 text-sm">No revenue data available</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">COGS Trend</h3>
              <div className="flex items-end gap-2 h-32">
                {analytics.trends.cogs.length > 0 ? (
                  analytics.trends.cogs.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end"
                    >
                      <div
                        className="w-full bg-orange-500 rounded-t"
                        style={{
                          height: `${
                            (point.value /
                              Math.max(
                                ...analytics.trends.cogs.map((p) => p.value),
                                1
                              )) *
                            100
                          }%`,
                          minHeight: point.value > 0 ? '8px' : '2px',
                        }}
                        title={`${point.period}: $${point.value.toLocaleString()}`}
                      />
                      <div className="text-xs text-white/60 [.light_&]:text-slate-600 mt-2 text-center">
                        {point.period}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-white/40 [.light_&]:text-slate-500 text-sm">No COGS data available</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Expenses Trend</h3>
              <div className="flex items-end gap-2 h-32">
                {analytics.trends.expenses.length > 0 ? (
                  analytics.trends.expenses.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end"
                    >
                      <div
                        className="w-full bg-red-500 rounded-t"
                        style={{
                          height: `${
                            (point.value /
                              Math.max(
                                ...analytics.trends.expenses.map((p) => p.value),
                                1
                              )) *
                            100
                          }%`,
                          minHeight: point.value > 0 ? '8px' : '2px',
                        }}
                        title={`${point.period}: $${point.value.toLocaleString()}`}
                      />
                      <div className="text-xs text-white/60 mt-2 text-center">
                        {point.period}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-white/40 text-sm">No expenses data available</div>
                )}
              </div>
            </div>

            {analytics.trends.users.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Active Users Trend</h3>
                <div className="flex items-end gap-2 h-32">
                  {analytics.trends.users.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end"
                    >
                      <div
                        className="w-full bg-green-500 rounded-t"
                        style={{
                          height: `${
                            (point.value /
                              Math.max(
                                ...analytics.trends.users.map((p) => p.value),
                                1
                              )) *
                            100
                          }%`,
                          minHeight: '4px',
                        }}
                      />
                      <div className="text-xs text-white/60 [.light_&]:text-slate-600 mt-2 text-center">
                        {point.period}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}

