'use client';

import { useEffect, useState } from 'react';
import { Card } from '@donkey-ideas/ui';
import { api } from '@/lib/api';

interface CompanyBreakdown {
  id: string;
  name: string;
  logo: string | null;
  projectStatus: string | null;
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  expenses: number;
  profit: number;
  cashBalance: number;
  valuation: number;
}

interface ConsolidatedData {
  version: string;
  consolidated: {
    pl: {
      revenue: number;
      cogs: number;
      operatingExpenses: number;
      totalExpenses: number;
      netProfit: number;
      margin: number;
    };
    balanceSheet: {
      totalAssets: number;
      totalLiabilities: number;
      totalEquity: number;
      totalLiabilitiesEquity: number;
    };
    cashFlow: {
      endingCash: number;
    };
  };
  portfolio: {
    activeCompanies: number;
    totalValuation: number;
    avgValuation: number;
    profitMargin: number;
  };
  companyBreakdown: CompanyBreakdown[];
}

export default function ConsolidatedViewV2() {
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/companies/consolidated/financials/v3');
      console.log('✅ V2 Page: Received data:', response.data);
      setData(response.data);
    } catch (err: any) {
      console.error('❌ V2 Page: Error fetching data:', err);
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Consolidated View V2 (Diagnostic)</h1>
          <p className="text-muted-foreground mb-8">Loading data from stored financial statements...</p>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-card rounded-lg"></div>
            <div className="h-32 bg-card rounded-lg"></div>
            <div className="h-64 bg-card rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Consolidated View V2 (Diagnostic)</h1>
          <Card className="p-6 border-destructive">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Data</h2>
            <p className="text-muted-foreground">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Consolidated View V2</h1>
              <p className="text-muted-foreground">
                Diagnostic version - Reading directly from stored financial statements
              </p>
              <p className="text-xs text-muted-foreground mt-1">API Version: {data.version}</p>
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Portfolio Overview</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Active Companies</p>
                <p className="text-2xl font-bold">{data.portfolio.activeCompanies}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Portfolio Valuation</p>
                <p className="text-2xl font-bold">{formatCurrency(data.portfolio.totalValuation)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Performance Metrics</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Profit Margin</p>
                <p className="text-2xl font-bold">{formatPercent(data.portfolio.profitMargin)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Average Company Valuation</p>
                <p className="text-2xl font-bold">{formatCurrency(data.portfolio.avgValuation)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Consolidated P&L */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Consolidated P&L</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Revenue</p>
              <p className="text-xl font-bold text-green-500">{formatCurrency(data.consolidated.pl.revenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">COGS</p>
              <p className="text-xl font-bold text-orange-500">{formatCurrency(data.consolidated.pl.cogs)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">OpEx</p>
              <p className="text-xl font-bold text-orange-500">{formatCurrency(data.consolidated.pl.operatingExpenses)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
              <p className={`text-xl font-bold ${data.consolidated.pl.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(data.consolidated.pl.netProfit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Margin</p>
              <p className="text-xl font-bold">{formatPercent(data.consolidated.pl.margin)}</p>
            </div>
          </div>
        </Card>

        {/* Consolidated Balance Sheet */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Consolidated Balance Sheet</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Assets</p>
              <p className="text-xl font-bold">{formatCurrency(data.consolidated.balanceSheet.totalAssets)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Liabilities + Equity</p>
              <p className="text-xl font-bold">{formatCurrency(data.consolidated.balanceSheet.totalLiabilitiesEquity)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-1">Total Cash</p>
            <p className="text-2xl font-bold text-blue-500">{formatCurrency(data.consolidated.cashFlow.endingCash)}</p>
          </div>
        </Card>

        {/* Company Breakdown */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Company Breakdown</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Company</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">COGS</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">OpEx</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Profit</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Cash</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Valuation</th>
                </tr>
              </thead>
              <tbody>
                {data.companyBreakdown.map((company) => (
                  <tr key={company.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {company.logo && (
                          <img src={company.logo} alt={company.name} className="w-6 h-6 rounded" />
                        )}
                        <span className="font-medium">{company.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {company.projectStatus || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(company.revenue)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(company.cogs)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(company.operatingExpenses)}</td>
                    <td className={`py-3 px-4 text-right font-mono font-bold ${company.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(company.profit)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(company.cashBalance)}</td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(company.valuation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Debug Info */}
        <Card className="p-4 mt-6 bg-muted/50">
          <p className="text-xs text-muted-foreground">
            <strong>Debug Info:</strong> This version reads directly from stored P&L Statements and Balance Sheets.
            If values are $0, it means no financial statements are stored in the database yet.
            Click "Rebuild All Balance Sheets" on the original Consolidated View to calculate and store statements.
          </p>
        </Card>
      </div>
    </div>
  );
}
