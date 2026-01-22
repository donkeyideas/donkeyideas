'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { NotificationModal } from '@/components/ui/notification-modal';
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
    dataStatus: 'ok' | 'needs_rebuild' | 'no_data';
    transactionCount: number;
    hasStatements: boolean;
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
  const [showRebuildConfirm, setShowRebuildConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showFixAllConfirm, setShowFixAllConfirm] = useState(false);
  const [rebuildLoading, setRebuildLoading] = useState(false);
  const [clearAllLoading, setClearAllLoading] = useState(false);
  const [fixAllLoading, setFixAllLoading] = useState(false);
  const [rebuildingCompanyId, setRebuildingCompanyId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  useEffect(() => {
    if (companies.length > 0) {
      loadConsolidatedFinancials();
    }
  }, [monthFilter, companies]);

  const loadConsolidatedFinancials = async () => {
    try {
      setLoading(true);
      
      // ✅ USING NEW CLEAN ENGINE (v2 endpoint)
      // Uses @donkey-ideas/financial-engine for guaranteed accuracy
      const url = monthFilter 
        ? `/companies/consolidated/financials/v2?month=${monthFilter}`
        : `/companies/consolidated/financials/v2`;
      
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

  const handleRebuildAll = async () => {
    setRebuildLoading(true);
    try {
      const response = await api.post('/companies/consolidated/rebuild-all-balance-sheets');
      setNotification({
        isOpen: true,
        title: 'Success',
        message: response.data.message || 'Balance sheets rebuilt successfully for all companies',
        type: 'success',
      });
      await loadConsolidatedFinancials();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to rebuild balance sheets',
        type: 'error',
      });
    } finally {
      setRebuildLoading(false);
    }
  };

  const handleClearAllData = async () => {
    setClearAllLoading(true);
    try {
      const response = await api.delete('/companies/consolidated/debug-transactions');
      setNotification({
        isOpen: true,
        title: 'Success',
        message: `Deleted ${response.data.deletedTransactions} transactions, ${response.data.deletedBalanceSheets} balance sheets, ${response.data.deletedCashFlows} cash flows across ${response.data.companiesAffected} companies. All financial data cleared!`,
        type: 'success',
      });
      await loadConsolidatedFinancials();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error || 'Failed to clear financial data',
        type: 'error',
      });
    } finally {
      setClearAllLoading(false);
    }
  };

  const handleRebuildCompany = async (companyId: string, companyName: string) => {
    try {
      setRebuildingCompanyId(companyId);
      await api.post(`/companies/${companyId}/financials/recalculate-all`);
      
      setNotification({
        isOpen: true,
        title: 'Success',
        message: `Rebuilt financial statements for ${companyName}`,
        type: 'success',
      });
      
      // Reload consolidated view
      await loadConsolidatedFinancials();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error || `Failed to rebuild ${companyName}`,
        type: 'error',
      });
    } finally {
      setRebuildingCompanyId(null);
    }
  };

  const handleRebuildNeeded = async () => {
    const companiesNeedingRebuild = financials?.companies.filter(c => c.dataStatus === 'needs_rebuild') || [];
    
    if (companiesNeedingRebuild.length === 0) {
      setNotification({
        isOpen: true,
        title: 'No Action Needed',
        message: 'All companies with transactions already have stored financial statements',
        type: 'success',
      });
      return;
    }
    
    try {
      setRebuildLoading(true);
      
      for (const company of companiesNeedingRebuild) {
        await api.post(`/companies/${company.id}/financials/recalculate-all`);
      }
      
      setNotification({
        isOpen: true,
        title: 'Success',
        message: `Rebuilt financial statements for ${companiesNeedingRebuild.length} companies`,
        type: 'success',
      });
      
      // Reload
      await loadConsolidatedFinancials();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error || 'Failed to rebuild companies',
        type: 'error',
      });
    } finally {
      setRebuildLoading(false);
    }
  };

  const handleFixAllData = async () => {
    try {
      setFixAllLoading(true);
      const response = await api.post('/companies/consolidated/fix-all-data');
      
      setNotification({
        isOpen: true,
        title: '✅ All Data Fixed!',
        message: `Fixed ${response.data.summary.transactionsFixed} transaction flags and created ${response.data.summary.statementsCreated} new financial statements for ${response.data.summary.companiesProcessed} companies`,
        type: 'success',
      });
      
      // Reload to show fixed data
      await loadConsolidatedFinancials();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error || 'Failed to fix all data',
        type: 'error',
      });
    } finally {
      setFixAllLoading(false);
      setShowFixAllConfirm(false);
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
            onClick={() => setShowFixAllConfirm(true)}
            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border-purple-500/30 font-bold"
            disabled={fixAllLoading}
          >
            {fixAllLoading ? 'Fixing Everything...' : '☢️ FIX ALL DATA (Nuclear Option)'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleRebuildNeeded}
            className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/30"
            disabled={rebuildLoading || fixAllLoading || !financials || financials.companies.filter(c => c.dataStatus === 'needs_rebuild').length === 0}
          >
            {rebuildLoading ? 'Rebuilding...' : `Rebuild Needed Companies ${financials ? `(${financials.companies.filter(c => c.dataStatus === 'needs_rebuild').length})` : ''}`}
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowRebuildConfirm(true)}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
            disabled={rebuildLoading}
          >
            {rebuildLoading ? 'Rebuilding...' : 'Rebuild All Companies'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setShowClearAllConfirm(true)}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
            disabled={clearAllLoading}
          >
            {clearAllLoading ? 'Deleting...' : 'Clear All Data'}
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
          <CardContent>
            {/* 2-Column Layout */}
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column: Total Assets */}
              <div className="space-y-2">
                <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Total Assets</div>
                <div className="text-3xl font-bold text-blue-400 [.light_&]:text-blue-600">
                  {formatCurrency(financials.totalAssets)}
                </div>
                <div className="text-xs text-white/40 [.light_&]:text-slate-500 mt-2">
                  (Includes Cash: {formatCurrency(financials.totalCashBalance || 0)})
                </div>
              </div>
              
              {/* Right Column: Total Liabilities + Equity */}
              <div className="space-y-2">
                <div className="text-sm text-white/60 [.light_&]:text-slate-700 mb-1">Total Liabilities + Equity</div>
                <div className="text-3xl font-bold text-green-500 [.light_&]:text-green-600">
                  {formatCurrency(financials.totalLiabilities + financials.totalEquity)}
                </div>
                <div className="text-xs text-white/40 [.light_&]:text-slate-500 mt-2">
                  Liabilities: {formatCurrency(financials.totalLiabilities)} + Equity: {formatCurrency(financials.totalEquity)}
                </div>
              </div>
            </div>
            
            {/* Balance Check Warning */}
            {Math.abs(financials.totalAssets - (financials.totalLiabilities + financials.totalEquity)) > 0.01 && (
              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
                <div className="text-yellow-400 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    ⚠️ Balance sheet does not balance! 
                    Difference: {formatCurrency(Math.abs(financials.totalAssets - (financials.totalLiabilities + financials.totalEquity)))}
                  </span>
                </div>
              </div>
            )}
            
            {/* Balance Check Success */}
            {Math.abs(financials.totalAssets - (financials.totalLiabilities + financials.totalEquity)) <= 0.01 && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-md text-center">
                <div className="text-green-400 text-sm">
                  ✅ Balance sheet balances correctly
                </div>
              </div>
            )}
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
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Project</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Data Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Revenue</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">COGS</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">OpEx</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Profit</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Cash</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-white/60 [.light_&]:text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {financials.companies.map((company) => {
                  const statusConfig = {
                    ok: { text: 'Data OK', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
                    needs_rebuild: { text: 'Needs Rebuild', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
                    no_data: { text: 'No Transactions', color: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
                  };
                  const status = statusConfig[company.dataStatus];
                  
                  return (
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
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                          {status.text}
                        </span>
                        <div className="text-[10px] text-white/40 [.light_&]:text-slate-500 mt-1">
                          {company.transactionCount} txns
                        </div>
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
                      <td className="py-3 px-4">
                        {company.dataStatus === 'needs_rebuild' && (
                          <Button
                            onClick={() => handleRebuildCompany(company.id, company.name)}
                            disabled={rebuildingCompanyId === company.id}
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                          >
                            {rebuildingCompanyId === company.id ? 'Rebuilding...' : 'Rebuild'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Legend */}
          <div className="mt-4 p-3 bg-white/5 [.light_&]:bg-slate-100 rounded-lg border border-white/10 [.light_&]:border-slate-200">
            <div className="text-xs font-semibold text-white/60 [.light_&]:text-slate-600 mb-2">Data Status Legend:</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-green-500/20 text-green-300 border-green-500/30">
                  Data OK
                </span>
                <span className="text-white/80 [.light_&]:text-slate-700">
                  Has transactions and stored financial statements
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                  Needs Rebuild
                </span>
                <span className="text-white/80 [.light_&]:text-slate-700">
                  Has transactions but no statements - click "Rebuild" to fix
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-gray-500/20 text-gray-300 border-gray-500/30">
                  No Transactions
                </span>
                <span className="text-white/80 [.light_&]:text-slate-700">
                  No financial data entered yet (expected $0)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Fix All Data Modal */}
      <ConfirmModal
        isOpen={showFixAllConfirm}
        onClose={() => setShowFixAllConfirm(false)}
        onConfirm={handleFixAllData}
        title="☢️ FIX ALL DATA - Nuclear Option"
        message="This is the NUCLEAR OPTION. It will:

1. Fix ALL transaction flags (affectsPL, affectsCashFlow)
2. Delete ALL existing financial statements
3. Recalculate EVERYTHING from scratch
4. Store NEW statements for ALL companies

This fixes:
- Wrong cash calculations
- Companies showing $0 despite having transactions
- Rebuild button not working

This takes 30-60 seconds. Continue?"
        confirmText="☢️ FIX EVERYTHING"
        cancelText="Cancel"
        variant="danger"
        loading={fixAllLoading}
      />

      {/* Confirm Rebuild Modal */}
      <ConfirmModal
        isOpen={showRebuildConfirm}
        onClose={() => setShowRebuildConfirm(false)}
        onConfirm={handleRebuildAll}
        title="Rebuild All Balance Sheets"
        message="This will rebuild balance sheets and cash flow for ALL companies. This may take a few moments. Continue?"
        confirmText="Rebuild All"
        cancelText="Cancel"
        variant="info"
        loading={rebuildLoading}
      />

      {/* Confirm Clear All Data Modal */}
      <ConfirmModal
        isOpen={showClearAllConfirm}
        onClose={() => setShowClearAllConfirm(false)}
        onConfirm={handleClearAllData}
        title="⚠️ Clear ALL Financial Data"
        message="This will permanently delete ALL transactions, balance sheets, cash flows, and P&L statements across ALL companies.\n\n🚨 This action cannot be undone!\n\nThis will fix the -$5 balance sheet issue by removing all phantom data."
        confirmText="Delete Everything"
        cancelText="Cancel"
        variant="danger"
        loading={clearAllLoading}
      />

      {/* Notification Modal */}
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

