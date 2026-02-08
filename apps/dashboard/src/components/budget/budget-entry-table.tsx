'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import Link from 'next/link';
import { useTheme } from '@/contexts/theme-context';

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
  notes?: string;
}

interface BudgetEntryTableProps {
  periodId: string;
  companyId: string;
  periodType: string;
  periodStartDate: string;
  periodEndDate: string;
  categories: BudgetCategory[];
  lines: Record<string, BudgetLine>;
  openingBalance: number;
  onLinesUpdate: (lines: Record<string, BudgetLine>) => void;
}

type SortKey = 'date' | 'category' | 'amount';

export function BudgetEntryTable({
  periodId,
  companyId,
  periodType,
  periodStartDate,
  periodEndDate,
  categories,
  lines,
  openingBalance,
  onLinesUpdate,
}: BudgetEntryTableProps) {
  const { theme } = useTheme();

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addCategoryId, setAddCategoryId] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addRepeatMonths, setAddRepeatMonths] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Filter/sort
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<typeof sortedEntries[0] | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Build flat list of entries from the lines map
  const entries = useMemo(() => {
    return Object.entries(lines)
      .map(([key, line]) => {
        const categoryId = key.split('_')[1];
        const category = categories.find(c => c.id === categoryId);
        const amount = parseFloat(String(line.amount).replace(/,/g, '')) || 0;
        return {
          key,
          id: line.id,
          date: line.date?.split('T')[0] || key.split('_')[0],
          categoryId,
          categoryName: category?.name || 'Unknown',
          categoryColor: category?.color || '#888',
          categoryType: category?.type || 'EXPENSE',
          amount,
          notes: line.notes || '',
          isApproved: line.isApproved,
        };
      })
      .filter(e => e.amount !== 0) // Only show entries with actual values
      .filter(e => filterCategory === 'all' || e.categoryId === filterCategory);
  }, [lines, categories, filterCategory]);

  // Sort entries
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

  const unapprovedCount = Object.values(lines).filter(l => !l.isApproved).length;

  // Totals
  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;
    sortedEntries.forEach(e => {
      if (e.categoryType === 'INCOME') income += e.amount;
      else expenses += Math.abs(e.amount);
    });
    return { income, expenses, net: income - expenses, count: sortedEntries.length };
  }, [sortedEntries]);

  // Generate dates for repeating entries
  const generateRepeatDates = (startDate: string, months: number): string[] => {
    const dates: string[] = [startDate];
    if (months <= 0) return dates;

    const start = new Date(startDate + 'T12:00:00');
    const day = start.getDate();

    for (let m = 1; m <= months; m++) {
      const next = new Date(start);
      next.setMonth(next.getMonth() + m);
      // Handle months with fewer days (e.g. Jan 31 -> Feb 28)
      if (next.getDate() !== day) {
        next.setDate(0); // last day of previous month
      }
      const dateStr = next.toISOString().split('T')[0];
      // Only include if within period range
      if (dateStr <= periodEndDate) {
        dates.push(dateStr);
      }
    }
    return dates;
  };

  // Add entry handler (supports repeat)
  const handleAddEntry = async () => {
    if (!addDate || !addCategoryId || !addAmount) return;
    const numAmount = parseFloat(addAmount.replace(/[^0-9.-]/g, ''));
    if (isNaN(numAmount) || numAmount === 0) return;

    const datesToCreate = generateRepeatDates(addDate, addRepeatMonths);
    const totalCount = datesToCreate.length;

    try {
      setSaving(true);
      const updated = { ...lines };

      // Build all lines to save
      const linesToSave = datesToCreate.map(date => {
        const key = `${date}_${addCategoryId}`;
        const existingLine = lines[key];
        return {
          id: existingLine?.id || undefined,
          periodId,
          companyId,
          categoryId: addCategoryId,
          date,
          amount: numAmount,
          notes: addNotes || undefined,
        };
      });

      setSaveProgress(`Saving ${totalCount} ${totalCount === 1 ? 'entry' : 'entries'}...`);

      const response = await fetch('/api/budget/lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: linesToSave }),
      });

      if (response.ok) {
        const saved = await response.json();
        const savedLines = Array.isArray(saved) ? saved : [saved];

        datesToCreate.forEach((date, i) => {
          const key = `${date}_${addCategoryId}`;
          const savedLine = savedLines[i];
          updated[key] = {
            id: savedLine?.id || '',
            date,
            amount: String(numAmount),
            categoryId: addCategoryId,
            balance: '0',
            isApproved: false,
            notes: addNotes,
          };
        });

        onLinesUpdate(updated);

        // Reset form
        setAddAmount('');
        setAddNotes('');
        setAddRepeatMonths(0);
        setSaveProgress(`Saved ${totalCount} ${totalCount === 1 ? 'entry' : 'entries'}`);
        setTimeout(() => setSaveProgress(''), 2000);
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      setSaveProgress('');
    } finally {
      setSaving(false);
    }
  };

  // Edit entry handler
  const handleSaveEdit = async (entry: typeof sortedEntries[0]) => {
    const numAmount = parseFloat(editAmount.replace(/[^0-9.-]/g, ''));
    if (isNaN(numAmount)) return;

    try {
      setSaving(true);
      const response = await fetch('/api/budget/lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: [{
            id: entry.id,
            periodId,
            companyId,
            categoryId: entry.categoryId,
            date: entry.date,
            amount: numAmount,
            notes: editNotes || undefined,
          }],
        }),
      });

      if (response.ok) {
        const saved = await response.json();
        const savedLine = Array.isArray(saved) ? saved[0] : saved;
        const updated = { ...lines };
        updated[entry.key] = {
          ...lines[entry.key],
          amount: String(numAmount),
          notes: editNotes,
          id: savedLine?.id || entry.id,
        };
        onLinesUpdate(updated);
        setEditingId(null);
      }
    } catch (error) {
      console.error('Error updating entry:', error);
    } finally {
      setSaving(false);
    }
  };

  // Delete entry handler
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmEntry?.id) return;
    const entry = deleteConfirmEntry;
    setDeleteConfirmEntry(null);

    try {
      setDeletingId(entry.id);
      const response = await fetch(`/api/budget/lines/${entry.id}`, { method: 'DELETE' });
      if (response.ok) {
        const updated = { ...lines };
        delete updated[entry.key];
        onLinesUpdate(updated);
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const borderClass = theme === 'light' ? 'border-slate-300' : 'border-white/10';
  const inputClass = theme === 'light'
    ? 'bg-white border-slate-300 text-slate-900 focus:ring-blue-500'
    : 'bg-black/30 border-white/20 text-white focus:ring-blue-500';
  const hoverClass = theme === 'light' ? 'hover:bg-slate-50' : 'hover:bg-white/5';

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Close Form' : '+ Add Entry'}
          </Button>
          {saving && <span className="text-sm text-blue-400">{saveProgress || 'Saving...'}</span>}
        </div>
        <div className="flex items-center gap-3">
          {periodType === 'ACTUALS' && unapprovedCount > 0 && (
            <Link href={`/app/budget/${periodId}/approve`}>
              <Button size="sm" variant="secondary">Approve Actuals ({unapprovedCount})</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Add Entry Form */}
      {showAddForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
              <div>
                <label className="block text-xs text-white/50 [.light_&]:text-slate-500 mb-1">Date</label>
                <input
                  type="date"
                  value={addDate}
                  min={periodStartDate}
                  max={periodEndDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded border text-sm focus:outline-none focus:ring-1 ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 [.light_&]:text-slate-500 mb-1">Category</label>
                <select
                  value={addCategoryId}
                  onChange={(e) => setAddCategoryId(e.target.value)}
                  className={`w-full px-3 py-2 rounded border text-sm focus:outline-none focus:ring-1 ${inputClass}`}
                >
                  <option value="">Select category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 [.light_&]:text-slate-500 mb-1">Amount</label>
                <input
                  type="text"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddEntry(); }}
                  placeholder="0.00"
                  className={`w-full px-3 py-2 rounded border text-sm focus:outline-none focus:ring-1 ${inputClass}`}
                />
              </div>
              <div>
                <label className="block text-xs text-white/50 [.light_&]:text-slate-500 mb-1">Repeat</label>
                <select
                  value={addRepeatMonths}
                  onChange={(e) => setAddRepeatMonths(Number(e.target.value))}
                  className={`w-full px-3 py-2 rounded border text-sm focus:outline-none focus:ring-1 ${inputClass}`}
                >
                  <option value={0}>No repeat</option>
                  <option value={1}>2 months</option>
                  <option value={2}>3 months</option>
                  <option value={3}>4 months</option>
                  <option value={5}>6 months</option>
                  <option value={8}>9 months</option>
                  <option value={11}>12 months</option>
                  <option value={17}>18 months</option>
                  <option value={23}>24 months</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 [.light_&]:text-slate-500 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddEntry(); }}
                  placeholder="Description..."
                  className={`w-full px-3 py-2 rounded border text-sm focus:outline-none focus:ring-1 ${inputClass}`}
                />
              </div>
              <div>
                <Button
                  onClick={handleAddEntry}
                  disabled={!addDate || !addCategoryId || !addAmount || saving}
                  className="w-full"
                >
                  {saving ? 'Saving...' : addRepeatMonths > 0 ? `Add (${addRepeatMonths + 1}x)` : 'Add'}
                </Button>
              </div>
            </div>
            {addRepeatMonths > 0 && addDate && (
              <p className="mt-2 text-xs text-white/40 [.light_&]:text-slate-500">
                Will create {addRepeatMonths + 1} entries on day {new Date(addDate + 'T12:00:00').getDate()} of each month{periodEndDate ? `, up to ${new Date(periodEndDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : ''}
              </p>
            )}
            {saveProgress && (
              <p className="mt-2 text-xs text-blue-400">{saveProgress}</p>
            )}
          </CardContent>
        </Card>
      )}

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
          All ({entries.length + (filterCategory !== 'all' ? Object.entries(lines).filter(([_, l]) => (parseFloat(String(l.amount)) || 0) !== 0).length - entries.length : 0)})
        </button>
        {categories.map(cat => {
          const count = Object.entries(lines).filter(([key, l]) => {
            const catId = key.split('_')[1];
            return catId === cat.id && (parseFloat(String(l.amount)) || 0) !== 0;
          }).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(filterCategory === cat.id ? 'all' : cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm whitespace-nowrap transition-all ${
                filterCategory === cat.id
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
              <p className="text-white/40 [.light_&]:text-slate-500 mb-2">No entries yet</p>
              <p className="text-sm text-white/30 [.light_&]:text-slate-400">Click "+ Add Entry" to start adding budget data</p>
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
                      Amount {sortKey === 'amount' && (sortAsc ? '\u25B2' : '\u25BC')}
                    </th>
                    <th className={`px-4 py-3 text-left text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass}`}>
                      Notes
                    </th>
                    <th className={`px-4 py-3 text-right text-sm font-medium text-slate-400 [.light_&]:text-slate-700 border-b ${borderClass}`}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry) => (
                    <tr key={entry.key} className={`border-b ${borderClass} ${hoverClass} transition-colors`}>
                      <td className="px-4 py-2.5 text-sm text-white [.light_&]:text-slate-900">
                        {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
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
                      <td className="px-4 py-2.5 text-right">
                        {editingId === entry.id ? (
                          <input
                            type="text"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(entry);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className={`w-24 px-2 py-1 rounded border text-right text-sm focus:outline-none focus:ring-1 ${inputClass}`}
                          />
                        ) : (
                          <span className={`text-sm font-medium ${
                            entry.categoryType === 'INCOME' ? 'text-green-400 [.light_&]:text-green-600' : 'text-red-400 [.light_&]:text-red-600'
                          }`}>
                            {formatCurrency(entry.amount)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {editingId === entry.id ? (
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(entry);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            placeholder="Notes..."
                            className={`w-full px-2 py-1 rounded border text-sm focus:outline-none focus:ring-1 ${inputClass}`}
                          />
                        ) : (
                          <span className="text-xs text-white/40 [.light_&]:text-slate-500">{entry.notes || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editingId === entry.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(entry)}
                                className="px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 rounded transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2 py-1 text-xs text-white/40 hover:bg-white/10 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              {!entry.isApproved && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingId(entry.id);
                                      setEditAmount(String(entry.amount));
                                      setEditNotes(entry.notes);
                                    }}
                                    className="px-2 py-1 text-xs text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => entry.id ? setDeleteConfirmEntry(entry) : undefined}
                                    disabled={deletingId === entry.id}
                                    className="px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                  >
                                    {deletingId === entry.id ? '...' : 'Delete'}
                                  </button>
                                </>
                              )}
                              {entry.isApproved && (
                                <span className="px-2 py-0.5 text-[10px] bg-green-500/10 text-green-400 rounded">Approved</span>
                              )}
                            </>
                          )}
                        </div>
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
            {totals.count} entries
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmEntry(null)} />
          <div className={`relative w-full max-w-md mx-4 rounded-xl border shadow-2xl ${
            theme === 'light'
              ? 'bg-white border-slate-200'
              : 'bg-slate-900 border-white/10'
          }`}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    Delete Entry
                  </h3>
                  <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-white/50'}`}>
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <div className={`rounded-lg p-4 mb-6 ${theme === 'light' ? 'bg-slate-50 border border-slate-200' : 'bg-white/5 border border-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: deleteConfirmEntry.categoryColor }} />
                    <span className={`text-sm font-medium ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                      {deleteConfirmEntry.categoryName}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      deleteConfirmEntry.categoryType === 'INCOME' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {deleteConfirmEntry.categoryType}
                    </span>
                  </div>
                  <span className={`text-sm font-medium ${
                    deleteConfirmEntry.categoryType === 'INCOME' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(deleteConfirmEntry.amount)}
                  </span>
                </div>
                <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>
                  {new Date(deleteConfirmEntry.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmEntry(null)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    theme === 'light'
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  Delete Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
