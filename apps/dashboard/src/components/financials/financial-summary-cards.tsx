'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface FinancialSummary {
  totalRevenue: number;
  cogs: number;
  totalExpenses: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashBalance: number;
  profitMargin: number;
}

interface FinancialSummaryCardsProps {
  summary: FinancialSummary | null;
}

export function FinancialSummaryCards({ summary }: FinancialSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Default to 0 if summary is null or undefined
  const safeSummary: FinancialSummary = summary || {
    totalRevenue: 0,
    cogs: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    cashBalance: 0,
    profitMargin: 0,
  };

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(safeSummary.totalRevenue)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60">COGS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-400">{formatCurrency(safeSummary.cogs || 0)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60">Total Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-400">{formatCurrency(safeSummary.totalExpenses)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60">Net Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${safeSummary.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(safeSummary.netProfit)}
          </div>
          <div className="text-xs text-white/60 mt-1">
            Margin: {safeSummary.profitMargin.toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60">Cash Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-400">{formatCurrency(safeSummary.cashBalance)}</div>
        </CardContent>
      </Card>
    </div>
  );
}

