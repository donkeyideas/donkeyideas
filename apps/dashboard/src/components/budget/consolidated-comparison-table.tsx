'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { useTheme } from '@/contexts/theme-context';

interface CompanyRow {
  companyName: string;
  income: number;
  expenses: number;
  net: number;
  balance: number;
}

interface ConsolidatedComparisonTableProps {
  companies: CompanyRow[];
}

type SortKey = 'companyName' | 'income' | 'expenses' | 'net' | 'balance';

export function ConsolidatedComparisonTable({ companies }: ConsolidatedComparisonTableProps) {
  const { theme } = useTheme();
  const [sortKey, setSortKey] = useState<SortKey>('balance');
  const [sortAsc, setSortAsc] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'companyName');
    }
  };

  const sorted = [...companies].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'string' && typeof bv === 'string') {
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const borderClass = theme === 'light' ? 'border-slate-300' : 'border-white/10';
  const hoverClass = theme === 'light' ? 'hover:bg-slate-100' : 'hover:bg-white/5';

  const SortIcon = ({ active, asc }: { active: boolean; asc: boolean }) => (
    <span className={`ml-1 text-[10px] ${active ? 'text-blue-400' : 'text-white/20 [.light_&]:text-slate-400'}`}>
      {active ? (asc ? '\u25B2' : '\u25BC') : '\u25BC'}
    </span>
  );

  if (companies.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        No company data available
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Comparison</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-black/30 [.light_&]:bg-slate-200">
              <tr>
                {[
                  { key: 'companyName' as SortKey, label: 'Company', align: 'left' },
                  { key: 'income' as SortKey, label: 'Income', align: 'right' },
                  { key: 'expenses' as SortKey, label: 'Expenses', align: 'right' },
                  { key: 'net' as SortKey, label: 'Net', align: 'right' },
                  { key: 'balance' as SortKey, label: 'Balance', align: 'right' },
                  { key: 'net' as SortKey, label: 'Status', align: 'center' },
                ].map((col, i) => (
                  <th
                    key={i}
                    onClick={() => col.key !== 'net' || col.label !== 'Status' ? handleSort(col.key) : undefined}
                    className={`px-4 py-3 text-${col.align} text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass} cursor-pointer select-none`}
                  >
                    {col.label}
                    {col.label !== 'Status' && <SortIcon active={sortKey === col.key} asc={sortAsc} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((company) => (
                <tr key={company.companyName} className={`border-b ${borderClass} ${hoverClass} transition-colors`}>
                  <td className="px-4 py-3 text-sm text-white [.light_&]:text-slate-900 font-medium">{company.companyName}</td>
                  <td className="px-4 py-3 text-right text-sm text-green-400 [.light_&]:text-green-600">{formatCurrency(company.income)}</td>
                  <td className="px-4 py-3 text-right text-sm text-red-400 [.light_&]:text-red-600">{formatCurrency(company.expenses)}</td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${company.net >= 0 ? 'text-green-400 [.light_&]:text-green-600' : 'text-red-400 [.light_&]:text-red-600'}`}>
                    {formatCurrency(company.net)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-white [.light_&]:text-slate-900 font-medium">{formatCurrency(company.balance)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      company.net >= 0
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${company.net >= 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                      {company.net >= 0 ? 'Positive' : 'Negative'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
