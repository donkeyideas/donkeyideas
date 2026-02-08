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
  const [saving, setSaving] = useState(false);

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

  // Add entry handler
  const handleAddEntry = async () => {
    if (!addDate || !addCategoryId || !addAmount) return;
    const numAmount = parseFloat(addAmount.replace(/[^0-9.-]/g, ''));
    if (isNaN(numAmount) || numAmount === 0) return;

    try {
      setSaving(true);
      const key = `${addDate}_${addCategoryId}`;
      const existingLine = lines[key];

      const response = await fetch('/api/budget/lines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: [{
            id: existingLine?.id || undefined,
            periodId,
            companyId,
            categoryId: addCategoryId,
            date: addDate,
            amount: numAmount,
            notes: addNotes || undefined,
          }],
        }),
      });

      if (response.ok) {
        const saved = await response.json();
        const savedLine = Array.isArray(saved) ? saved[0] : saved;
        const updated = { ...lines };
        updated[key] = {
          id: savedLine?.id || existingLine?.id || '',
          date: addDate,
          amount: String(numAmount),
          categoryId: addCategoryId,
          balance: '0',
          isApproved: false,
          notes: addNotes,
        };
        onLinesUpdate(updated);

        // Reset form
        setAddAmount('');
        setAddNotes('');
        // Keep date and category for quick repeated entry
      }
    } catch (error) {
      console.error('Error adding entry:', error);
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
  const handleDelete = async (entry: typeof sortedEntries[0]) => {
    if (!entry.id) return;
    if (!window.confirm(`Delete ${entry.categoryName} entry for ${new Date(entry.date).toLocaleDateString()}?`)) return;

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
          {saving && <span className="text-sm text-blue-400">Saving...</span>}
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
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
                  {saving ? 'Saving...' : 'Add'}
                </Button>
              </div>
            </div>
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
                                    onClick={() => handleDelete(entry)}
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
    </div>
  );
}
