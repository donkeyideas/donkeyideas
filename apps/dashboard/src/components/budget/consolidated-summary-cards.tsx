'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface ConsolidatedSummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  portfolioBalance: number;
  companyCount: number;
}

export function ConsolidatedSummaryCards({ totalIncome, totalExpenses, netCashFlow, portfolioBalance, companyCount }: ConsolidatedSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Total Income</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-400 [.light_&]:text-green-600">{formatCurrency(totalIncome)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Total Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-400 [.light_&]:text-red-600">{formatCurrency(totalExpenses)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Net Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-400 [.light_&]:text-green-600' : 'text-red-400 [.light_&]:text-red-600'}`}>
            {formatCurrency(netCashFlow)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Portfolio Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-400 [.light_&]:text-blue-600">{formatCurrency(portfolioBalance)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-white/60 [.light_&]:text-slate-600">Companies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white [.light_&]:text-slate-900">{companyCount}</div>
          <div className="text-xs text-white/40 [.light_&]:text-slate-500 mt-1">with active periods</div>
        </CardContent>
      </Card>
    </div>
  );
}
