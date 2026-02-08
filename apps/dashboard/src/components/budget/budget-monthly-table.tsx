'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { useTheme } from '@/contexts/theme-context';

interface MonthlyRow {
  month: string;
  monthKey: string;
  income: number;
  expenses: number;
  net: number;
  balance: number;
  dailyBreakdown: {
    date: string;
    income: number;
    expenses: number;
    net: number;
    balance: number;
  }[];
}

interface BudgetMonthlyTableProps {
  data: MonthlyRow[];
}

export function BudgetMonthlyTable({ data }: BudgetMonthlyTableProps) {
  const { theme } = useTheme();
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const borderClass = theme === 'light' ? 'border-slate-300' : 'border-white/10';
  const hoverClass = theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/5';
  const expandedBg = theme === 'light' ? 'bg-slate-50' : 'bg-white/[0.02]';

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No monthly data available
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-black/30 [.light_&]:bg-slate-200">
              <tr>
                <th className={`px-4 py-3 text-left text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass}`}>Month</th>
                <th className={`px-4 py-3 text-right text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass}`}>Income</th>
                <th className={`px-4 py-3 text-right text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass}`}>Expenses</th>
                <th className={`px-4 py-3 text-right text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass}`}>Net</th>
                <th className={`px-4 py-3 text-right text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass}`}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <>
                  <tr
                    key={row.monthKey}
                    onClick={() => setExpandedMonth(expandedMonth === row.monthKey ? null : row.monthKey)}
                    className={`cursor-pointer transition-colors border-b ${borderClass} ${hoverClass}`}
                  >
                    <td className="px-4 py-3 text-sm text-white [.light_&]:text-slate-900 font-medium">
                      <div className="flex items-center gap-2">
                        <svg
                          className={`w-4 h-4 text-white/40 transition-transform ${expandedMonth === row.monthKey ? 'rotate-90' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {row.month}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-400 [.light_&]:text-green-600 font-medium">{formatCurrency(row.income)}</td>
                    <td className="px-4 py-3 text-right text-sm text-red-400 [.light_&]:text-red-600 font-medium">{formatCurrency(row.expenses)}</td>
                    <td className={`px-4 py-3 text-right text-sm font-medium ${row.net >= 0 ? 'text-green-400 [.light_&]:text-green-600' : 'text-red-400 [.light_&]:text-red-600'}`}>
                      {formatCurrency(row.net)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-white [.light_&]:text-slate-900 font-medium">{formatCurrency(row.balance)}</td>
                  </tr>
                  {expandedMonth === row.monthKey && row.dailyBreakdown.map((day) => (
                    <tr key={day.date} className={`border-b ${borderClass} ${expandedBg}`}>
                      <td className="px-4 py-2 text-xs text-white/60 [.light_&]:text-slate-500 pl-10">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-green-400/70 [.light_&]:text-green-600/70">{formatCurrency(day.income)}</td>
                      <td className="px-4 py-2 text-right text-xs text-red-400/70 [.light_&]:text-red-600/70">{formatCurrency(day.expenses)}</td>
                      <td className={`px-4 py-2 text-right text-xs ${day.net >= 0 ? 'text-green-400/70 [.light_&]:text-green-600/70' : 'text-red-400/70 [.light_&]:text-red-600/70'}`}>
                        {formatCurrency(day.net)}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-white/60 [.light_&]:text-slate-500">{formatCurrency(day.balance)}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
