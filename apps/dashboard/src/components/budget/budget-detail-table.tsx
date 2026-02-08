'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import Link from 'next/link';

interface BudgetCategory {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface BudgetLine {
  id: string;
  date: string;
  amount: string;
  categoryId: string;
  balance: string;
  isApproved: boolean;
}

interface BudgetDetailTableProps {
  periodId: string;
  companyId: string;
  periodType: string;
  categories: BudgetCategory[];
  lines: Record<string, BudgetLine>;
  dates: string[];
  openingBalance: number;
  onLinesUpdate: (lines: Record<string, BudgetLine>) => void;
}

export function BudgetDetailTable({
  periodId,
  companyId,
  periodType,
  categories,
  lines,
  dates,
  openingBalance,
  onLinesUpdate,
}: BudgetDetailTableProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [hasRestoredSelections, setHasRestoredSelections] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const storageKey = `budget:selectedCategories:${companyId}:${periodId}`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const validIds = new Set(categories.map(c => c.id));
          setSelectedCategories(parsed.filter((id: string) => validIds.has(id)));
          setHasRestoredSelections(true);
          return;
        }
      }
    } catch (error) {
      console.error('Error restoring selected categories:', error);
    }
    if (categories.length > 0) {
      setSelectedCategories(categories.slice(0, Math.min(5, categories.length)).map(c => c.id));
    }
    setHasRestoredSelections(true);
  }, [categories, storageKey]);

  useEffect(() => {
    if (!hasRestoredSelections) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(selectedCategories));
    } catch (error) {
      console.error('Error saving selected categories:', error);
    }
  }, [storageKey, selectedCategories, hasRestoredSelections]);

  const normalizeInput = (value: string) => value.replace(/[^0-9.-]/g, '');

  const formatCurrencyDisplay = (value: string): string => {
    if (!value) return '';
    const num = parseFloat(value.replace(/,/g, ''));
    if (isNaN(num)) return value;
    return `$${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const updateAmount = (date: string, categoryId: string, amount: string) => {
    const key = `${date}_${categoryId}`;
    setDraftValues(prev => ({ ...prev, [key]: amount }));
    const cleaned = normalizeInput(amount);
    const updated = {
      ...lines,
      [key]: {
        ...lines[key],
        date,
        categoryId,
        amount: cleaned,
        id: lines[key]?.id || '',
      },
    };
    onLinesUpdate(updated);
  };

  const scheduleSave = (date: string, categoryId: string, amount: string) => {
    const key = `${date}_${categoryId}`;
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => saveAmount(date, categoryId, amount), 800);
  };

  const saveAmount = async (date: string, categoryId: string, amount: string) => {
    const key = `${date}_${categoryId}`;
    try {
      setSaving(true);
      const line = lines[key] || {};
      const cleanedAmount = normalizeInput(amount).replace(/,/g, '');
      const numAmount = parseFloat(cleanedAmount);
      const safeAmount = Number.isNaN(numAmount) ? 0 : numAmount;

      const response = await fetch('/api/budget/lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: [{
            id: (line as any).id || undefined,
            periodId,
            companyId,
            categoryId,
            date,
            amount: safeAmount,
          }],
        }),
      });

      if (response.ok) {
        const saved = await response.json();
        const savedLine = Array.isArray(saved) ? saved[0] : saved;
        if (savedLine?.id) {
          const updated = {
            ...lines,
            [key]: {
              ...lines[key],
              id: savedLine.id,
              amount: String(savedLine.amount ?? safeAmount),
            },
          };
          onLinesUpdate(updated);
        }
      }
    } catch (error) {
      console.error('Error saving line:', error);
    } finally {
      setSaving(false);
    }
  };

  const getLineValue = (date: string, categoryId: string): string => {
    const key = `${date}_${categoryId}`;
    if (editingKey === key && draftValues[key] !== undefined) return draftValues[key];
    return lines[key]?.amount || '';
  };

  const getDisplayValue = (date: string, categoryId: string): string => {
    const key = `${date}_${categoryId}`;
    const raw = getLineValue(date, categoryId);
    if (editingKey === key) return raw;
    return formatCurrencyDisplay(raw);
  };

  const balanceByDate = useMemo(() => {
    if (dates.length === 0) return {};
    const totalsByDate: Record<string, number> = {};
    Object.values(lines).forEach((line) => {
      if (!line.date) return;
      const dateKey = line.date.split('T')[0];
      const amount = parseFloat(String(line.amount).replace(/,/g, ''));
      totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) + (Number.isNaN(amount) ? 0 : amount);
    });
    const balances: Record<string, number> = {};
    let running = openingBalance;
    dates.forEach((date) => {
      running += totalsByDate[date] || 0;
      balances[date] = running;
    });
    return balances;
  }, [dates, lines, openingBalance]);

  const getBalance = (date: string): string => {
    const value = balanceByDate[date];
    if (value === undefined) return '0.00';
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const unapprovedCount = Object.values(lines).filter(l => !l.isApproved).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/50 [.light_&]:text-slate-500">
          {saving && <span className="text-blue-400">Saving...</span>}
        </div>
        {periodType === 'ACTUALS' && unapprovedCount > 0 && (
          <Link href={`/app/budget/${periodId}/approve`}>
            <Button size="sm">Approve Actuals ({unapprovedCount})</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Categories to Display</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto px-6 py-4 w-full max-w-full">
            <div className="flex flex-nowrap gap-2 min-w-max">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategories(prev =>
                      prev.includes(category.id)
                        ? prev.filter(id => id !== category.id)
                        : [...prev, category.id]
                    );
                  }}
                  className={`px-3 py-1.5 rounded text-sm transition-all whitespace-nowrap ${
                    selectedCategories.includes(category.id)
                      ? 'bg-white/20 text-white border-2 border-white/40'
                      : 'bg-black/20 text-slate-400 border border-white/10 hover:bg-black/30'
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[70vh] overflow-x-auto overflow-y-auto w-full">
            <table className="w-full border-collapse">
              <thead className="bg-black/30 [.light_&]:bg-slate-200 sticky top-0 z-20">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-r border-white/10 [.light_&]:border-slate-300 whitespace-nowrap min-w-[180px] w-[180px] sticky left-0 z-30 bg-[#0b1220] [.light_&]:bg-slate-200">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-r border-white/10 [.light_&]:border-slate-300 whitespace-nowrap min-w-[140px] w-[140px] sticky left-[180px] z-30 bg-[#0b1220] [.light_&]:bg-slate-200">
                    Balance
                  </th>
                  {selectedCategories.map(catId => {
                    const category = categories.find(c => c.id === catId);
                    return (
                      <th
                        key={catId}
                        className="px-4 py-3 text-right text-sm font-medium text-white [.light_&]:text-slate-900 border-r border-white/10 [.light_&]:border-slate-300 min-w-[150px] w-[150px] bg-[#0b1220] [.light_&]:bg-slate-200"
                      >
                        <div className="flex items-center justify-end gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category?.color }} />
                          {category?.name}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {dates.map((date) => {
                  const dateObj = new Date(date);
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  return (
                    <tr
                      key={date}
                      className={`border-t border-white/10 [.light_&]:border-slate-300 hover:bg-white/5 [.light_&]:hover:bg-slate-100 ${
                        isWeekend ? 'bg-black/20 [.light_&]:bg-slate-100' : ''
                      }`}
                    >
                      <td className={`px-4 py-2 text-sm text-slate-300 [.light_&]:text-slate-800 border-r border-white/10 [.light_&]:border-slate-300 whitespace-nowrap min-w-[180px] w-[180px] sticky left-0 z-20 ${
                        isWeekend ? 'bg-black/20 [.light_&]:bg-slate-100' : 'bg-[#0b1220] [.light_&]:bg-[#F5F5DC]'
                      }`}>
                        <div className="font-medium">
                          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className={`px-4 py-2 text-right text-sm font-medium text-white [.light_&]:text-slate-900 border-r border-white/10 [.light_&]:border-slate-300 whitespace-nowrap min-w-[140px] w-[140px] sticky left-[180px] z-20 ${
                        isWeekend ? 'bg-black/20 [.light_&]:bg-slate-100' : 'bg-[#0b1220] [.light_&]:bg-[#F5F5DC]'
                      }`}>
                        ${getBalance(date)}
                      </td>
                      {selectedCategories.map(catId => (
                        <td key={`${date}_${catId}`} className="px-2 py-1 border-r border-white/10 [.light_&]:border-slate-300 min-w-[150px] w-[150px]">
                          <input
                            type="text"
                            value={getDisplayValue(date, catId)}
                            onFocus={() => {
                              const key = `${date}_${catId}`;
                              setEditingKey(key);
                              setDraftValues(prev => ({
                                ...prev,
                                [key]: prev[key] ?? getLineValue(date, catId),
                              }));
                            }}
                            onChange={(e) => {
                              updateAmount(date, catId, e.target.value);
                              scheduleSave(date, catId, e.target.value);
                            }}
                            onBlur={(e) => {
                              const key = `${date}_${catId}`;
                              if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
                              saveAmount(date, catId, e.target.value);
                              setEditingKey(null);
                              setDraftValues(prev => {
                                const { [key]: _, ...rest } = prev;
                                return rest;
                              });
                            }}
                            className="w-full px-2 py-1 bg-transparent text-right text-sm text-white [.light_&]:text-slate-900 focus:bg-black/30 [.light_&]:focus:bg-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                            placeholder="$0.00"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center text-sm text-slate-400 [.light_&]:text-slate-600">
        <div>
          {dates.length} days &bull; {selectedCategories.length} categories &bull; {Object.keys(lines).length} entries
        </div>
        <div>
          {unapprovedCount > 0 && periodType === 'ACTUALS' && (
            <span className="text-yellow-400">{unapprovedCount} entries pending approval</span>
          )}
        </div>
      </div>
    </div>
  );
}
