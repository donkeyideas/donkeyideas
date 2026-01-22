'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@donkey-ideas/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface BudgetPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  companyId: string;
  openingBalance?: number;
}

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

export default function BudgetEntryPage({ params }: { params: { id: string } }) {
  const periodId = params.id;
  const router = useRouter();

  const [period, setPeriod] = useState<BudgetPeriod | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [lines, setLines] = useState<Record<string, BudgetLine>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [hasRestoredSelections, setHasRestoredSelections] = useState(false);

  useEffect(() => {
    loadPeriod();
  }, [periodId]);

  useEffect(() => {
    if (period) {
      loadCategories();
      loadLines();
      generateDates();
    }
  }, [period]);

  const loadPeriod = async () => {
    try {
      const response = await fetch(`/api/budget/periods/${periodId}`);
      const data = await response.json();
      setPeriod(data);
      setOpeningBalance(Number(data.openingBalance || 0));
    } catch (error) {
      console.error('Error loading period:', error);
    }
  };

  const handleDeletePeriod = async () => {
    if (!period) return;
    const confirmed = window.confirm(
      `Delete "${period.name}"?\n\nThis will permanently remove the period and all entries.`
    );
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/budget/periods/${period.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        alert(`Error: ${error.error || 'Failed to delete period'}`);
        return;
      }
      router.push('/app/budget?manage=1');
    } catch (error) {
      console.error('Error deleting period:', error);
      alert('Failed to delete period');
    }
  };

  const loadCategories = async () => {
    if (!period) return;
    try {
      const response = await fetch(`/api/budget/categories?companyId=${period.companyId}`);
      const data = await response.json();
      setCategories(data);
      
      const stored = getStoredSelections();
      if (stored && stored.length > 0) {
        const validIds = new Set(data.map((category: BudgetCategory) => category.id));
        setSelectedCategories(stored.filter((id) => validIds.has(id)));
        setHasRestoredSelections(true);
      } else if (data.length > 0) {
        setSelectedCategories(data.slice(0, Math.min(5, data.length)).map((c: any) => c.id));
        setHasRestoredSelections(true);
      } else {
        setHasRestoredSelections(true);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const storageKey = period
    ? `budget:selectedCategories:${period.companyId}:${period.id}`
    : null;

  const getStoredSelections = () => {
    if (!storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed as string[];
      }
    } catch (error) {
      console.error('Error restoring selected categories:', error);
    }
    return;
  };

  useEffect(() => {
    if (!storageKey || !hasRestoredSelections) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(selectedCategories));
    } catch (error) {
      console.error('Error saving selected categories:', error);
    }
  }, [storageKey, selectedCategories, hasRestoredSelections]);

  const loadLines = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/budget/lines?periodId=${periodId}`);
      const data = await response.json();
      
      // Index lines by date+category for quick lookup
      const linesMap: Record<string, BudgetLine> = {};
      data.forEach((line: any) => {
        const key = `${line.date.split('T')[0]}_${line.categoryId}`;
        linesMap[key] = line;
      });
      
      setLines(linesMap);
    } catch (error) {
      console.error('Error loading lines:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDates = () => {
    if (!period) return;
    
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    const dateList: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateList.push(new Date(d).toISOString().split('T')[0]);
    }
    
    setDates(dateList);
  };

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
    const cleaned = normalizeInput(amount);
    setDraftValues(prev => ({ ...prev, [key]: amount }));
    
    // Update local state optimistically
    setLines(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        date,
        categoryId,
        amount: cleaned,
        id: prev[key]?.id || '',
      },
    }));
    
  };

  const scheduleSave = (date: string, categoryId: string, amount: string) => {
    const key = `${date}_${categoryId}`;
    if (saveTimers.current[key]) {
      clearTimeout(saveTimers.current[key]);
    }
    saveTimers.current[key] = setTimeout(() => {
      saveAmount(date, categoryId, amount);
    }, 800);
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
            id: line.id || undefined,
            periodId,
            companyId: period?.companyId,
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
          setLines(prev => ({
            ...prev,
            [key]: {
              ...prev[key],
              id: savedLine.id,
              amount: String(savedLine.amount ?? safeAmount),
            },
          }));
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
    if (editingKey === key && draftValues[key] !== undefined) {
      return draftValues[key];
    }
    const line = lines[key];
    return line?.amount || '';
  };

  const getDisplayValue = (date: string, categoryId: string): string => {
    const key = `${date}_${categoryId}`;
    const raw = getLineValue(date, categoryId);
    if (editingKey === key) {
      return raw;
    }
    return formatCurrencyDisplay(raw);
  };

  const balanceByDate = useMemo(() => {
    if (dates.length === 0) return {};
    const totalsByDate: Record<string, number> = {};
    Object.values(lines).forEach((line) => {
      if (!line.date) {
        return;
      }
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
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const unapprovedCount = Object.values(lines).filter(l => !l.isApproved).length;

  if (!period || loading) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/app/budget?manage=1" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
            ← Back to Budget & Forecast
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-semibold text-white">{period.name}</h1>
            <span className={`px-3 py-1 rounded text-xs font-medium ${
              period.type === 'BUDGET' ? 'bg-blue-500/10 text-blue-400' :
              period.type === 'FORECAST' ? 'bg-purple-500/10 text-purple-400' :
              'bg-green-500/10 text-green-400'
            }`}>
              {period.type}
            </span>
            <span className={`px-3 py-1 rounded text-xs font-medium border ${
              period.status === 'ACTIVE' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
              period.status === 'DRAFT' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' :
              'border-gray-500/30 bg-gray-500/10 text-gray-400'
            }`}>
              {period.status}
            </span>
          </div>
          <p className="text-slate-400 mt-1">
            {new Date(period.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} -{' '}
            {new Date(period.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/app/budget/categories">
            <Button variant="secondary">Manage Categories</Button>
          </Link>
          <Link href="/app/budget/new">
            <Button>+ New Period</Button>
          </Link>
          <Button
            variant="secondary"
            onClick={handleDeletePeriod}
            className="text-red-400 border-red-500/30 hover:bg-red-500/10"
          >
            Delete Period
          </Button>
          {saving && <span className="text-sm text-blue-400">Saving...</span>}
          {period.type === 'ACTUALS' && unapprovedCount > 0 && (
            <Link href={`/app/budget/${periodId}/approve`}>
              <Button>
                Approve Actuals ({unapprovedCount})
              </Button>
            </Link>
          )}
        </div>
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
          <div className="max-h-[70vh] overflow-x-auto overflow-y-auto pb-4 w-full max-w-full">
            <table className="min-w-max w-max pr-6">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-400 border-r border-white/10 whitespace-nowrap w-[180px] sticky top-0 left-0 z-30 bg-[#0b1220]">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-400 border-r border-white/10 whitespace-nowrap w-[140px] sticky top-0 left-[180px] z-30 bg-[#0b1220]">
                    Balance
                  </th>
                  {selectedCategories.map(catId => {
                    const category = categories.find(c => c.id === catId);
                    return (
                      <th
                        key={catId}
                        className="px-4 py-3 text-right text-sm font-medium text-white border-r border-white/10 min-w-[150px] sticky top-0 z-20 bg-[#0b1220]"
                      >
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: category?.color }}
                          />
                          {category?.name}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {dates.map((date, idx) => {
                  const dateObj = new Date(date);
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  
                  return (
                    <tr
                      key={date}
                      className={`border-t border-white/10 hover:bg-white/5 ${
                        isWeekend ? 'bg-black/20' : ''
                      }`}
                    >
                      <td className="px-4 py-2 text-sm text-slate-300 border-r border-white/10 whitespace-nowrap sticky left-0 z-20 bg-[#0b1220]">
                        <div className="font-medium">
                          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-white border-r border-white/10 whitespace-nowrap sticky left-[180px] z-20 bg-[#0b1220]">
                        ${getBalance(date)}
                      </td>
                      {selectedCategories.map(catId => (
                        <td key={`${date}_${catId}`} className="px-2 py-1 border-r border-white/10">
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
                              if (saveTimers.current[key]) {
                                clearTimeout(saveTimers.current[key]);
                              }
                              saveAmount(date, catId, e.target.value);
                              setEditingKey(null);
                              setDraftValues(prev => {
                                const { [key]: _, ...rest } = prev;
                                return rest;
                              });
                            }}
                            className="w-full px-2 py-1 bg-transparent text-right text-sm text-white focus:bg-black/30 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
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

      <div className="flex justify-between items-center text-sm text-slate-400">
        <div>
          {dates.length} days • {selectedCategories.length} categories • {Object.keys(lines).length} entries
        </div>
        <div>
          {unapprovedCount > 0 && period.type === 'ACTUALS' && (
            <span className="text-yellow-400">
              {unapprovedCount} entries pending approval
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
