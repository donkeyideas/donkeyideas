'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';
import { useTheme } from '@/contexts/theme-context';

interface BudgetCategory {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface BudgetPeriod {
  id: string;
  companyId: string;
  company?: { id: string; name: string };
}

interface ConsolidatedEntriesTableProps {
  lines: Record<string, number>;
  categories: BudgetCategory[];
  companies: any[];
  filteredPeriods: BudgetPeriod[];
  openingBalance: number;
}

type SortKey = 'date' | 'category' | 'amount';

export function ConsolidatedEntriesTable({
  lines,
  categories,
  companies,
  filteredPeriods,
  openingBalance,
}: ConsolidatedEntriesTableProps) {
  const { theme } = useTheme();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Build flat list of entries from the lines map (date_categoryName -> amount)
  const entries = useMemo(() => {
    return Object.entries(lines)
      .map(([key, amount]) => {
        const parts = key.split('_');
        const date = parts[0];
        const categoryName = parts.slice(1).join('_');
        const category = categories.find(c => c.name === categoryName);
        return {
          key,
          date,
          categoryName,
          categoryColor: category?.color || '#888',
          categoryType: category?.type || 'EXPENSE',
          amount,
        };
      })
      .filter(e => e.amount !== 0)
      .filter(e => filterCategory === 'all' || e.categoryName === filterCategory);
  }, [lines, categories, filterCategory]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortKey === 'category') cmp = a.categoryName.localeCompare(b.categoryName);
      else if (sortKey === 'amount') cmp = a.amount - b.amount;
      return sortAsc ? cmp : -cmp;
    });
  }, [entries, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'category'); }
  };

  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    sortedEntries.forEach(e => {
      if (e.categoryType === 'INCOME') income += e.amount;
      else expenses += Math.abs(e.amount);
    });
    return { income, expenses, net: income - expenses, count: sortedEntries.length };
  }, [sortedEntries]);

  // Category counts for filter chips
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(lines).forEach(([key, amount]) => {
      if (amount === 0) return;
      const categoryName = key.split('_').slice(1).join('_');
      counts[categoryName] = (counts[categoryName] || 0) + 1;
    });
    return counts;
  }, [lines]);

  const totalEntries = Object.values(lines).filter(a => a !== 0).length;

  const borderClass = theme === 'light' ? 'border-slate-300' : 'border-white/10';
  const hoverClass = theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/5';

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-all ${
            filterCategory === 'all'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
              : 'bg-black/20 [.light_&]:bg-slate-100 text-slate-400 [.light_&]:text-slate-600 border border-white/10 [.light_&]:border-slate-300 hover:bg-black/30 [.light_&]:hover:bg-slate-200'
          }`}
        >
          All ({totalEntries})
        </button>
        {categories.map(cat => {
          const count = categoryCounts[cat.name] || 0;
          if (count === 0) return null;
          return (
            <button
              key={cat.name}
              onClick={() => setFilterCategory(filterCategory === cat.name ? 'all' : cat.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm whitespace-nowrap transition-all ${
                filterCategory === cat.name
                  ? 'bg-white/20 text-white border border-white/40'
                  : 'bg-black/20 [.light_&]:bg-slate-100 text-slate-400 [.light_&]:text-slate-600 border border-white/10 [.light_&]:border-slate-300 hover:bg-black/30 [.light_&]:hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Entries Table */}
      <Card>
        <CardContent className="p-0">
          {sortedEntries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-white/40 [.light_&]:text-slate-500">No entries with data across companies</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-black/30 [.light_&]:bg-slate-200">
                  <tr>
                    <th
                      onClick={() => handleSort('date')}
                      className={`px-4 py-3 text-left text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass} cursor-pointer select-none`}
                    >
                      Date {sortKey === 'date' && (sortAsc ? '\u25B2' : '\u25BC')}
                    </th>
                    <th
                      onClick={() => handleSort('category')}
                      className={`px-4 py-3 text-left text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass} cursor-pointer select-none`}
                    >
                      Category {sortKey === 'category' && (sortAsc ? '\u25B2' : '\u25BC')}
                    </th>
                    <th className={`px-4 py-3 text-left text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass}`}>
                      Type
                    </th>
                    <th
                      onClick={() => handleSort('amount')}
                      className={`px-4 py-3 text-right text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass} cursor-pointer select-none`}
                    >
                      Combined Amount {sortKey === 'amount' && (sortAsc ? '\u25B2' : '\u25BC')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => (
                    <tr key={entry.key} className={`border-b ${borderClass} ${hoverClass} transition-colors`}>
                      <td className="px-4 py-2.5 text-sm text-white [.light_&]:text-slate-900">
                        {new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.categoryColor }} />
                          <span className="text-white [.light_&]:text-slate-900">{entry.categoryName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          entry.categoryType === 'INCOME' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {entry.categoryType}
                        </span>
                      </td>
                      <td className={`px-4 py-2.5 text-right text-sm font-medium ${
                        entry.categoryType === 'INCOME' ? 'text-green-400 [.light_&]:text-green-600' : 'text-red-400 [.light_&]:text-red-600'
                      }`}>
                        {formatCurrency(entry.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Footer */}
      {sortedEntries.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/40 [.light_&]:text-slate-500">
            {totals.count} entries across {filteredPeriods.length} periods
          </span>
          <div className="flex items-center gap-6">
            <span className="text-green-400 [.light_&]:text-green-600">
              Income: {formatCurrency(totals.income)}
            </span>
            <span className="text-red-400 [.light_&]:text-red-600">
              Expenses: {formatCurrency(totals.expenses)}
            </span>
            <span className={`font-medium ${totals.net >= 0 ? 'text-green-400 [.light_&]:text-green-600' : 'text-red-400 [.light_&]:text-red-600'}`}>
              Net: {formatCurrency(totals.net)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
