'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface FinancialSummary {
  totalRevenue: number;
  cogs: number;
  operatingExpenses: number; // Changed from totalExpenses
  totalExpenses: number; // Keep for backward compatibility (COGS + OpEx)
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
    operatingExpenses: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    cashBalance: 0,
    profitMargin: 0,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white [.light_&]:text-slate-900">{formatCurrency(safeSummary.totalRevenue)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">COGS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-400 [.light_&]:text-orange-600">{formatCurrency(safeSummary.cogs || 0)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Operating Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-400 [.light_&]:text-red-600">{formatCurrency(safeSummary.operatingExpenses)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Net Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${safeSummary.netProfit >= 0 ? 'text-green-500 [.light_&]:text-green-600' : 'text-red-500 [.light_&]:text-red-600'}`}>
            {formatCurrency(safeSummary.netProfit)}
          </div>
          <div className="text-xs text-white/60 [.light_&]:text-slate-600 mt-1">
            Margin: {safeSummary.profitMargin.toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Cash Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-400 [.light_&]:text-blue-600">{formatCurrency(safeSummary.cashBalance)}</div>
        </CardContent>
      </Card>
    </div>
  );
}

