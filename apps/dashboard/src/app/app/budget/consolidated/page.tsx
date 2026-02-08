'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@donkey-ideas/ui';
import Link from 'next/link';
import { ConsolidatedSummaryCards } from '@/components/budget/consolidated-summary-cards';
import { ConsolidatedCompanyCards } from '@/components/budget/consolidated-company-cards';
import { ConsolidatedComparisonTable } from '@/components/budget/consolidated-comparison-table';
import { BudgetBalanceChart } from '@/components/budget/budget-balance-chart';
import { BudgetIncomeExpenseChart } from '@/components/budget/budget-income-expense-chart';

interface BudgetPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'BUDGET' | 'FORECAST' | 'ACTUALS';
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  companyId: string;
  openingBalance?: number;
  company?: { id: string; name: string };
}

interface BudgetCategory {
  id: string;
  name: string;
  type: string;
  color: string;
  companyId: string;
}

type ViewTab = 'overview' | 'comparison' | 'table';

export default function ConsolidatedBudgetPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [lines, setLines] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<string>('ACTUALS');
  const [dates, setDates] = useState<string[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');

  // Per-company data for company cards
  const [companyData, setCompanyData] = useState<Record<string, {
    income: number;
    expenses: number;
    balance: number;
    periodName: string;
    dateRange: string;
  }>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (periods.length > 0 && categories.length > 0) {
      generateDates();
      loadAllLines();
    }
  }, [periods, filterType, categories]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const companiesRes = await fetch('/api/companies');
      if (!companiesRes.ok) throw new Error('Failed to load companies');
      const companiesData = await companiesRes.json();
      const validCompanies = companiesData.companies || [];
      setCompanies(validCompanies);

      if (validCompanies.length === 0) {
        setPeriods([]);
        setLoading(false);
        return;
      }

      // Parallel fetch: periods + categories for all companies
      const [periodsResults, categoriesResults] = await Promise.all([
        Promise.all(validCompanies.map((c: any) =>
          fetch(`/api/budget/periods?companyId=${c.id}`).then(r => r.ok ? r.json() : [])
        )),
        Promise.all(validCompanies.map((c: any) =>
          fetch(`/api/budget/categories?companyId=${c.id}`).then(r => r.ok ? r.json() : [])
        )),
      ]);

      const allPeriods: BudgetPeriod[] = [];
      const categoryMap = new Map<string, BudgetCategory>();

      validCompanies.forEach((company: any, i: number) => {
        const companyPeriods = Array.isArray(periodsResults[i]) ? periodsResults[i] : [];
        companyPeriods.forEach((period: any) => {
          allPeriods.push({ ...period, company: { id: company.id, name: company.name } });
        });

        const companyCategories = Array.isArray(categoriesResults[i]) ? categoriesResults[i] : [];
        companyCategories.forEach((cat: BudgetCategory) => {
          if (!categoryMap.has(cat.name)) categoryMap.set(cat.name, cat);
        });
      });

      setPeriods(allPeriods);
      const uniqueCategories = Array.from(categoryMap.values());
      setCategories(uniqueCategories);

      if (uniqueCategories.length > 0) {
        setSelectedCategories(uniqueCategories.slice(0, Math.min(5, uniqueCategories.length)).map(c => c.name));
      }
    } catch (error: any) {
      console.error('Error loading consolidated data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPeriods = () => {
    return periods.filter(p => p.type === filterType && p.status === 'ACTIVE');
  };

  const generateDates = () => {
    const filteredPeriods = getFilteredPeriods();
    if (filteredPeriods.length === 0) {
      setDates([]);
      return;
    }

    let minDate = new Date(filteredPeriods[0].startDate);
    let maxDate = new Date(filteredPeriods[0].endDate);
    filteredPeriods.forEach(period => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;
    });

    const dateList: string[] = [];
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      dateList.push(new Date(d).toISOString().split('T')[0]);
    }
    setDates(dateList);

    const totalOpening = filteredPeriods.reduce((sum, p) => sum + (Number(p.openingBalance) || 0), 0);
    setOpeningBalance(totalOpening);
  };

  const loadAllLines = async () => {
    const filteredPeriods = getFilteredPeriods();
    if (filteredPeriods.length === 0) {
      setLines({});
      setCompanyData({});
      return;
    }

    // Parallel fetch all lines
    const linesResults = await Promise.all(
      filteredPeriods.map(p =>
        fetch(`/api/budget/lines?periodId=${p.id}`).then(r => r.ok ? r.json() : [])
      )
    );

    const combinedLines: Record<string, number> = {};
    const perCompany: Record<string, { income: number; expenses: number; totalFlow: number; periodName: string; dateRange: string }> = {};

    filteredPeriods.forEach((period, i) => {
      const companyId = period.companyId;
      const companyName = period.company?.name || companyId;

      if (!perCompany[companyId]) {
        perCompany[companyId] = {
          income: 0,
          expenses: 0,
          totalFlow: 0,
          periodName: period.name,
          dateRange: `${new Date(period.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(period.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        };
      }

      const data = Array.isArray(linesResults[i]) ? linesResults[i] : [];
      data.forEach((line: any) => {
        const dateKey = line.date.split('T')[0];
        const category = categories.find(c => c.id === line.categoryId);
        if (category) {
          const key = `${dateKey}_${category.name}`;
          const amount = parseFloat(String(line.amount).replace(/,/g, '')) || 0;
          combinedLines[key] = (combinedLines[key] || 0) + amount;

          perCompany[companyId].totalFlow += amount;
          if (category.type === 'INCOME') {
            perCompany[companyId].income += amount;
          } else if (category.type === 'EXPENSE') {
            perCompany[companyId].expenses += Math.abs(amount);
          }
        }
      });
    });

    setLines(combinedLines);

    // Build company data with balances
    const compData: Record<string, { income: number; expenses: number; balance: number; periodName: string; dateRange: string }> = {};
    filteredPeriods.forEach(period => {
      const cid = period.companyId;
      if (perCompany[cid] && !compData[cid]) {
        const opening = Number(period.openingBalance) || 0;
        compData[cid] = {
          income: perCompany[cid].income,
          expenses: perCompany[cid].expenses,
          balance: opening + perCompany[cid].totalFlow,
          periodName: perCompany[cid].periodName,
          dateRange: perCompany[cid].dateRange,
        };
      }
    });
    setCompanyData(compData);
  };

  // Computed: portfolio summary
  const portfolioSummary = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalFlow = 0;

    Object.entries(lines).forEach(([key, amount]) => {
      const categoryName = key.split('_').slice(1).join('_');
      const category = categories.find(c => c.name === categoryName);
      if (category?.type === 'INCOME') totalIncome += amount;
      else if (category?.type === 'EXPENSE') totalExpenses += Math.abs(amount);
      totalFlow += amount;
    });

    const filteredPeriods = getFilteredPeriods();
    const companyCount = new Set(filteredPeriods.map(p => p.companyId)).size;

    return {
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      portfolioBalance: openingBalance + totalFlow,
      companyCount,
    };
  }, [lines, categories, openingBalance, periods, filterType]);

  // Computed: company cards data
  const companyCardsData = useMemo(() => {
    return companies
      .filter(c => companyData[c.id])
      .map(c => ({
        companyId: c.id,
        companyName: c.name,
        periodName: companyData[c.id].periodName,
        dateRange: companyData[c.id].dateRange,
        income: companyData[c.id].income,
        expenses: companyData[c.id].expenses,
        net: companyData[c.id].income - companyData[c.id].expenses,
        balance: companyData[c.id].balance,
      }));
  }, [companies, companyData]);

  // Computed: company comparison data
  const companyComparisonData = useMemo(() => {
    return companyCardsData.map(c => ({
      companyName: c.companyName,
      income: c.income,
      expenses: c.expenses,
      net: c.net,
      balance: c.balance,
    }));
  }, [companyCardsData]);

  // Computed: balance trend
  const balanceTrendData = useMemo(() => {
    if (dates.length === 0) return [];
    const totalsByDate: Record<string, number> = {};
    Object.entries(lines).forEach(([key, amount]) => {
      const dateKey = key.split('_')[0];
      totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) + amount;
    });

    const result: { date: string; balance: number }[] = [];
    let running = openingBalance;
    const useWeekly = dates.length > 60;
    dates.forEach((date, i) => {
      running += totalsByDate[date] || 0;
      if (useWeekly) {
        if (i % 7 === 0 || i === dates.length - 1) result.push({ date, balance: running });
      } else {
        result.push({ date, balance: running });
      }
    });
    return result;
  }, [dates, lines, openingBalance]);

  // Computed: income vs expense by company (for bar chart)
  const incomeExpenseByCompany = useMemo(() => {
    return companyCardsData.map(c => ({
      month: c.companyName.length > 12 ? c.companyName.substring(0, 12) + '...' : c.companyName,
      income: c.income,
      expenses: c.expenses,
    }));
  }, [companyCardsData]);

  // Consolidated table helpers
  const balanceByDate = useMemo(() => {
    if (dates.length === 0) return {};
    const totalsByDate: Record<string, number> = {};
    Object.entries(lines).forEach(([key, amount]) => {
      const dateKey = key.split('_')[0];
      totalsByDate[dateKey] = (totalsByDate[dateKey] || 0) + amount;
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

  const getLineValue = (date: string, categoryName: string): string => {
    const key = `${date}_${categoryName}`;
    const amount = lines[key];
    if (!amount) return '$0.00';
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredPeriods = getFilteredPeriods();
  const selectedCategoryObjects = categories.filter(c => selectedCategories.includes(c.name));

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-400">Loading consolidated data...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white [.light_&]:text-slate-900">Consolidated Budget & Forecast</h1>
          <p className="text-slate-400 [.light_&]:text-slate-600 mt-1">
            {companies.length} companies
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-black/30 [.light_&]:bg-white border border-white/20 [.light_&]:border-slate-300 rounded text-white [.light_&]:text-slate-900"
          >
            <option value="ACTUALS">Actuals</option>
            <option value="BUDGET">Budget</option>
            <option value="FORECAST">Forecast</option>
          </select>
          <Link href="/app/budget">
            <Button variant="secondary">Company View</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {filteredPeriods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-white [.light_&]:text-slate-900 text-lg font-medium mb-2">No active {filterType.toLowerCase()} periods found</h3>
            <p className="text-slate-400 [.light_&]:text-slate-600 mb-6">
              Create {filterType.toLowerCase()} periods for your companies to see consolidated data here.
            </p>
            <Link href="/app/budget">
              <Button>Go to Budget & Forecast</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Portfolio Summary Cards */}
          <ConsolidatedSummaryCards
            totalIncome={portfolioSummary.totalIncome}
            totalExpenses={portfolioSummary.totalExpenses}
            netCashFlow={portfolioSummary.netCashFlow}
            portfolioBalance={portfolioSummary.portfolioBalance}
            companyCount={portfolioSummary.companyCount}
          />

          {/* Company Health Grid */}
          <ConsolidatedCompanyCards companies={companyCardsData} />

          {/* View Tabs */}
          <div className="flex gap-1 border-b border-white/10 [.light_&]:border-slate-300">
            {(['overview', 'comparison', 'table'] as ViewTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'text-blue-400 border-blue-400'
                    : 'text-white/50 [.light_&]:text-slate-500 border-transparent hover:text-white/80 [.light_&]:hover:text-slate-800'
                }`}
              >
                {tab === 'overview' && 'Overview Charts'}
                {tab === 'comparison' && 'Company Comparison'}
                {tab === 'table' && 'Consolidated Table'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BudgetBalanceChart data={balanceTrendData} title="Combined Balance Trend" />
              <BudgetIncomeExpenseChart data={incomeExpenseByCompany} title="Income vs Expenses by Company" />
            </div>
          )}

          {activeTab === 'comparison' && (
            <ConsolidatedComparisonTable companies={companyComparisonData} />
          )}

          {activeTab === 'table' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Select Categories to Display</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto px-6 py-4 w-full max-w-full">
                    <div className="flex flex-nowrap gap-2 min-w-max">
                      {categories.map((category) => (
                        <button
                          key={category.name}
                          onClick={() => {
                            setSelectedCategories(prev =>
                              prev.includes(category.name)
                                ? prev.filter(name => name !== category.name)
                                : [...prev, category.name]
                            );
                          }}
                          className={`px-3 py-1.5 rounded text-sm transition-all whitespace-nowrap ${
                            selectedCategories.includes(category.name)
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
                          {selectedCategoryObjects.map(category => (
                            <th
                              key={category.name}
                              className="px-4 py-3 text-right text-sm font-medium text-white [.light_&]:text-slate-900 border-r border-white/10 [.light_&]:border-slate-300 min-w-[150px] w-[150px] bg-[#0b1220] [.light_&]:bg-slate-200"
                            >
                              <div className="flex items-center justify-end gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
                                {category.name}
                              </div>
                            </th>
                          ))}
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
                              {selectedCategoryObjects.map(category => (
                                <td key={`${date}_${category.name}`} className="px-4 py-2 text-right text-sm text-slate-300 [.light_&]:text-slate-800 border-r border-white/10 [.light_&]:border-slate-300 min-w-[150px] w-[150px]">
                                  {getLineValue(date, category.name)}
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
                  {dates.length} days &bull; {selectedCategories.length} categories &bull; {filteredPeriods.length} periods combined
                </div>
                <div>
                  Opening balance: ${openingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
