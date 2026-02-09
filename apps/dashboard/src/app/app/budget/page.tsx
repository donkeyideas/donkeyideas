'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@donkey-ideas/ui';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useRouter, useSearchParams } from 'next/navigation';
import { BudgetSummaryCards } from '@/components/budget/budget-summary-cards';
import { BudgetBalanceChart } from '@/components/budget/budget-balance-chart';
import { BudgetIncomeExpenseChart } from '@/components/budget/budget-income-expense-chart';
import { BudgetPeriodTabs } from '@/components/budget/budget-period-tabs';
import { BudgetCategoryHealth } from '@/components/budget/budget-category-health';
import { BudgetMonthlyTable } from '@/components/budget/budget-monthly-table';
import { BudgetEntryTable } from '@/components/budget/budget-entry-table';

interface BudgetPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'BUDGET' | 'FORECAST' | 'ACTUALS';
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  companyId: string;
  openingBalance?: number;
  _count?: { lines: number };
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

type ViewTab = 'overview' | 'monthly' | 'categories' | 'table';

function BudgetPageContent() {
  const { currentCompany } = useAppStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const periodParam = searchParams.get('period');

  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(periodParam);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [lines, setLines] = useState<Record<string, BudgetLine>>({});
  const [dates, setDates] = useState<string[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [periodLoading, setPeriodLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [manageMode, setManageMode] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load periods for this company
  useEffect(() => {
    if (currentCompany) {
      loadPeriods();
      loadCategories();
    }
  }, [currentCompany]);

  // Load period detail when selection changes
  useEffect(() => {
    if (selectedPeriodId && !manageMode) {
      loadPeriodDetail(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const loadPeriods = async () => {
    if (!currentCompany) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/budget/periods?companyId=${currentCompany.id}`);
      const data = await response.json();
      const periodsArr = Array.isArray(data) ? data : [];
      setPeriods(periodsArr);

      // Auto-select the first period if none selected
      if (!selectedPeriodId && periodsArr.length > 0) {
        const sorted = [...periodsArr].sort((a, b) =>
          new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
        );
        setSelectedPeriodId(sorted[0].id);
      }
    } catch (error) {
      console.error('Error loading periods:', error);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!currentCompany) return;
    try {
      const response = await fetch(`/api/budget/categories?companyId=${currentCompany.id}`);
      const data = await response.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadPeriodDetail = async (periodId: string) => {
    try {
      setPeriodLoading(true);
      const [periodRes, linesRes] = await Promise.all([
        fetch(`/api/budget/periods/${periodId}`),
        fetch(`/api/budget/lines?periodId=${periodId}`),
      ]);

      const periodData = await periodRes.json();
      setOpeningBalance(Number(periodData.openingBalance || 0));

      // Generate dates
      const start = new Date(periodData.startDate);
      const end = new Date(periodData.endDate);
      const dateList: string[] = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dateList.push(new Date(d).toISOString().split('T')[0]);
      }
      setDates(dateList);

      // Index lines
      const linesData = await linesRes.json();
      const linesMap: Record<string, BudgetLine> = {};
      linesData.forEach((line: any) => {
        const key = `${line.date.split('T')[0]}_${line.categoryId}`;
        linesMap[key] = line;
      });
      setLines(linesMap);
    } catch (error) {
      console.error('Error loading period detail:', error);
    } finally {
      setPeriodLoading(false);
    }
  };

  const handleDeletePeriod = async (period: BudgetPeriod) => {
    const confirmed = window.confirm(
      `Delete "${period.name}"?\n\nThis will permanently remove the period and all ${period._count?.lines || 0} entries.`
    );
    if (!confirmed) return;
    try {
      setDeletingId(period.id);
      const response = await fetch(`/api/budget/periods/${period.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        alert(`Error: ${error.error || 'Failed to delete period'}`);
        return;
      }
      if (selectedPeriodId === period.id) setSelectedPeriodId(null);
      await loadPeriods();
    } catch (error) {
      console.error('Error deleting period:', error);
      alert('Failed to delete period');
    } finally {
      setDeletingId(null);
    }
  };

  // Computed: summary data
  const summaryData = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;

    Object.entries(lines).forEach(([key, line]) => {
      const categoryId = key.split('_')[1];
      const category = categories.find(c => c.id === categoryId);
      const amount = parseFloat(String(line.amount).replace(/,/g, '')) || 0;
      if (category?.type === 'INCOME') {
        totalIncome += amount;
      } else if (category?.type === 'EXPENSE') {
        totalExpenses += Math.abs(amount);
      }
    });

    const netCashFlow = totalIncome - totalExpenses;
    // Current balance = opening + income - expenses
    const currentBalance = openingBalance + totalIncome - totalExpenses;

    return { totalIncome, totalExpenses, netCashFlow, currentBalance };
  }, [lines, categories, openingBalance]);

  // Computed: balance trend data (weekly if > 60 days)
  const balanceTrendData = useMemo(() => {
    if (dates.length === 0) return [];
    const totalsByDate: Record<string, number> = {};
    Object.entries(lines).forEach(([key, line]) => {
      if (!line.date) return;
      const dateKey = line.date.split('T')[0];
      const categoryId = key.split('_')[1];
      const category = categories.find(c => c.id === categoryId);
      const rawAmount = parseFloat(String(line.amount).replace(/,/g, ''));
      const amount = Number.isNaN(rawAmount) ? 0 : rawAmount;
      // Expenses stored as positive values need to be subtracted
      const signedAmount = category?.type === 'EXPENSE' ? -Math.abs(amount) : amount;
      totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) + signedAmount;
    });

    const result: { date: string; balance: number }[] = [];
    let running = openingBalance;
    const useWeekly = dates.length > 60;

    dates.forEach((date, i) => {
      running += totalsByDate[date] || 0;
      if (useWeekly) {
        if (i % 7 === 0 || i === dates.length - 1) {
          result.push({ date, balance: running });
        }
      } else {
        result.push({ date, balance: running });
      }
    });
    return result;
  }, [dates, lines, openingBalance]);

  // Computed: income vs expense by month
  const monthlyChartData = useMemo(() => {
    const monthMap: Record<string, { income: number; expenses: number }> = {};

    Object.entries(lines).forEach(([key, line]) => {
      if (!line.date) return;
      const dateKey = line.date.split('T')[0];
      const monthKey = dateKey.substring(0, 7); // YYYY-MM
      const categoryId = key.split('_')[1];
      const category = categories.find(c => c.id === categoryId);
      const amount = parseFloat(String(line.amount).replace(/,/g, '')) || 0;

      if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expenses: 0 };
      if (category?.type === 'INCOME') {
        monthMap[monthKey].income += amount;
      } else if (category?.type === 'EXPENSE') {
        monthMap[monthKey].expenses += Math.abs(amount);
      }
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, data]) => ({
        month: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        income: data.income,
        expenses: data.expenses,
      }));
  }, [lines, categories]);

  // Computed: category health
  const categoryHealthData = useMemo(() => {
    const categoryTotals: Record<string, { name: string; type: string; color: string; total: number }> = {};

    Object.entries(lines).forEach(([key, line]) => {
      const categoryId = key.split('_')[1];
      const category = categories.find(c => c.id === categoryId);
      if (!category) return;
      const amount = parseFloat(String(line.amount).replace(/,/g, '')) || 0;

      if (!categoryTotals[categoryId]) {
        categoryTotals[categoryId] = { name: category.name, type: category.type, color: category.color, total: 0 };
      }
      categoryTotals[categoryId].total += amount;
    });

    const incomeTotal = Object.values(categoryTotals)
      .filter(c => c.type === 'INCOME')
      .reduce((sum, c) => sum + Math.abs(c.total), 0);
    const expenseTotal = Object.values(categoryTotals)
      .filter(c => c.type === 'EXPENSE')
      .reduce((sum, c) => sum + Math.abs(c.total), 0);

    return Object.values(categoryTotals)
      .map(c => ({
        ...c,
        percentage: c.type === 'INCOME'
          ? (incomeTotal > 0 ? (Math.abs(c.total) / incomeTotal) * 100 : 0)
          : (expenseTotal > 0 ? (Math.abs(c.total) / expenseTotal) * 100 : 0),
      }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
  }, [lines, categories]);

  // Computed: top categories for overview
  const topCategories = useMemo(() => {
    return categoryHealthData.slice(0, 5);
  }, [categoryHealthData]);

  // Computed: monthly table data
  const monthlyTableData = useMemo(() => {
    if (dates.length === 0) return [];

    const monthMap: Record<string, {
      income: number;
      expenses: number;
      dailyBreakdown: { date: string; income: number; expenses: number; net: number; balance: number }[];
    }> = {};

    // First pass: compute daily income/expense
    const totalsByDate: Record<string, number> = {};
    const dailyIncome: Record<string, number> = {};
    const dailyExpenses: Record<string, number> = {};

    Object.entries(lines).forEach(([key, line]) => {
      if (!line.date) return;
      const dateKey = line.date.split('T')[0];
      const categoryId = key.split('_')[1];
      const category = categories.find(c => c.id === categoryId);
      const amount = parseFloat(String(line.amount).replace(/,/g, '')) || 0;

      if (category?.type === 'INCOME') {
        dailyIncome[dateKey] = (dailyIncome[dateKey] || 0) + amount;
        totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) + amount;
      } else if (category?.type === 'EXPENSE') {
        dailyExpenses[dateKey] = (dailyExpenses[dateKey] || 0) + Math.abs(amount);
        totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) - Math.abs(amount);
      }
    });

    let running = openingBalance;
    dates.forEach((date) => {
      const monthKey = date.substring(0, 7);
      running += totalsByDate[date] || 0;

      if (!monthMap[monthKey]) monthMap[monthKey] = { income: 0, expenses: 0, dailyBreakdown: [] };
      const inc = dailyIncome[date] || 0;
      const exp = dailyExpenses[date] || 0;
      monthMap[monthKey].income += inc;
      monthMap[monthKey].expenses += exp;
      monthMap[monthKey].dailyBreakdown.push({
        date,
        income: inc,
        expenses: exp,
        net: inc - exp,
        balance: running,
      });
    });

    let monthRunning = openingBalance;
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, data]) => {
        const net = data.income - data.expenses;
        monthRunning += net;
        return {
          month: new Date(monthKey + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          monthKey,
          income: data.income,
          expenses: data.expenses,
          net,
          balance: monthRunning,
          dailyBreakdown: data.dailyBreakdown,
        };
      });
  }, [dates, lines, categories, openingBalance]);

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'DRAFT': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'CLOSED': return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      default: return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BUDGET': return 'bg-blue-500/10 text-blue-400';
      case 'FORECAST': return 'bg-purple-500/10 text-purple-400';
      case 'ACTUALS': return 'bg-green-500/10 text-green-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (!currentCompany) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg">Please select a company from the sidebar to view budgets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white [.light_&]:text-slate-900">Budget & Forecast</h1>
          <p className="text-slate-400 [.light_&]:text-slate-600 mt-1">
            <span className="text-blue-400 [.light_&]:text-blue-600 font-medium">{currentCompany.name}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/app/budget/categories">
            <Button variant="secondary">Manage Categories</Button>
          </Link>
          <Link href="/app/budget/new">
            <Button>+ New Period</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : periods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-white [.light_&]:text-slate-900 text-lg font-medium mb-2">No budget periods yet</h3>
            <p className="text-slate-400 [.light_&]:text-slate-600 mb-6">Create your first budget period to start tracking income and expenses.</p>
            <Link href="/app/budget/new">
              <Button>Create Your First Period</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Period Tabs */}
          <BudgetPeriodTabs
            periods={periods}
            selectedId={selectedPeriodId}
            onSelect={(id) => {
              setSelectedPeriodId(id);
              setManageMode(false);
            }}
            showManage
            onManageClick={() => setManageMode(true)}
            manageActive={manageMode}
          />

          {manageMode ? (
            /* Manage Periods View */
            <Card>
              <CardHeader>
                <CardTitle>All Periods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {periods.map((period) => (
                    <div
                      key={period.id}
                      className="flex items-center justify-between p-4 bg-black/20 [.light_&]:bg-slate-100 border border-white/10 [.light_&]:border-slate-300 rounded-lg hover:bg-black/30 [.light_&]:hover:bg-slate-200 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded text-xs font-medium ${getTypeColor(period.type)}`}>
                          {period.type}
                        </div>
                        <div>
                          <div className="text-white [.light_&]:text-slate-900 font-medium">{period.name}</div>
                          <div className="text-sm text-slate-400 [.light_&]:text-slate-600">
                            {new Date(period.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} -{' '}
                            {new Date(period.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`px-3 py-1 rounded text-xs font-medium border ${getStatusColor(period.status)}`}>
                          {period.status}
                        </div>
                        <div className="text-sm text-slate-400">
                          {period._count?.lines || 0} entries
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPeriodId(period.id);
                            setManageMode(false);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDeletePeriod(period)}
                          disabled={deletingId === period.id}
                          className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                        >
                          {deletingId === period.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : periodLoading ? (
            <div className="text-center py-12 text-slate-400">Loading period data...</div>
          ) : selectedPeriod ? (
            <>
              {/* Period Info */}
              <div className="flex items-center gap-3 text-sm text-slate-400 [.light_&]:text-slate-600">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(selectedPeriod.type)}`}>
                  {selectedPeriod.type}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(selectedPeriod.status)}`}>
                  {selectedPeriod.status}
                </span>
                <span>
                  {new Date(selectedPeriod.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} -{' '}
                  {new Date(selectedPeriod.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {/* Summary Cards */}
              <BudgetSummaryCards
                totalIncome={summaryData.totalIncome}
                totalExpenses={summaryData.totalExpenses}
                netCashFlow={summaryData.netCashFlow}
                currentBalance={summaryData.currentBalance}
              />

              {/* View Tabs */}
              <div className="flex gap-1 border-b border-white/10 [.light_&]:border-slate-300">
                {(['overview', 'monthly', 'categories', 'table'] as ViewTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'text-blue-400 border-blue-400'
                        : 'text-white/50 [.light_&]:text-slate-500 border-transparent hover:text-white/80 [.light_&]:hover:text-slate-800'
                    }`}
                  >
                    {tab === 'overview' && 'Overview'}
                    {tab === 'monthly' && 'Monthly Summary'}
                    {tab === 'categories' && 'Category Breakdown'}
                    {tab === 'table' && 'Data Entry'}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <BudgetBalanceChart data={balanceTrendData} />
                    <BudgetIncomeExpenseChart data={monthlyChartData} />
                  </div>

                  {/* Top Categories */}
                  {topCategories.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Top Categories</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {topCategories.map((cat) => (
                            <div key={cat.name} className="flex items-center gap-4">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="text-sm text-white [.light_&]:text-slate-900 w-40 truncate">{cat.name}</span>
                              <div className="flex-1 bg-white/10 [.light_&]:bg-slate-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    cat.percentage > 90 ? 'bg-red-500' :
                                    cat.percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm text-white [.light_&]:text-slate-900 font-medium w-28 text-right">
                                {formatCurrency(Math.abs(cat.total))}
                              </span>
                              <span className="text-xs text-white/50 [.light_&]:text-slate-500 w-16 text-right">
                                {cat.percentage.toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {activeTab === 'monthly' && (
                <BudgetMonthlyTable data={monthlyTableData} />
              )}

              {activeTab === 'categories' && (
                <BudgetCategoryHealth categories={categoryHealthData} />
              )}

              {activeTab === 'table' && (
                <BudgetEntryTable
                  periodId={selectedPeriod.id}
                  companyId={selectedPeriod.companyId || currentCompany.id}
                  periodType={selectedPeriod.type}
                  periodStartDate={selectedPeriod.startDate?.split('T')[0] || ''}
                  periodEndDate={selectedPeriod.endDate?.split('T')[0] || ''}
                  categories={categories}
                  lines={lines}
                  openingBalance={openingBalance}
                  onLinesUpdate={setLines}
                />
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-400">Select a period to view budget data</div>
          )}
        </>
      )}
    </div>
  );
}

export default function BudgetPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <BudgetPageContent />
    </Suspense>
  );
}
