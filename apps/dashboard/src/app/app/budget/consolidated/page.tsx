'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@donkey-ideas/ui';
import Link from 'next/link';

interface BudgetPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'BUDGET' | 'FORECAST' | 'ACTUALS';
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  companyId: string;
  openingBalance?: number;
  company?: {
    id: string;
    name: string;
  };
}

interface BudgetCategory {
  id: string;
  name: string;
  type: string;
  color: string;
  companyId: string;
}

interface BudgetLine {
  id: string;
  date: string;
  amount: string;
  categoryId: string;
  periodId: string;
}

export default function ConsolidatedBudgetPage() {
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [lines, setLines] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ACTUALS');
  const [dates, setDates] = useState<string[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);

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

      // Load all companies
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

      // Load all periods and categories for all companies
      const allPeriods: BudgetPeriod[] = [];
      const allCategories: BudgetCategory[] = [];
      const categoryMap = new Map<string, BudgetCategory>();

      for (const company of validCompanies) {
        try {
          // Load periods
          const periodsRes = await fetch(`/api/budget/periods?companyId=${company.id}`);
          if (periodsRes.ok) {
            const periodsData = await periodsRes.json();
            if (Array.isArray(periodsData)) {
              periodsData.forEach(period => {
                allPeriods.push({
                  ...period,
                  company: { id: company.id, name: company.name },
                });
              });
            }
          }

          // Load categories
          const categoriesRes = await fetch(`/api/budget/categories?companyId=${company.id}`);
          if (categoriesRes.ok) {
            const categoriesData = await categoriesRes.json();
            if (Array.isArray(categoriesData)) {
              categoriesData.forEach((cat: BudgetCategory) => {
                // Use category name as key to merge same-named categories
                if (!categoryMap.has(cat.name)) {
                  categoryMap.set(cat.name, cat);
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error loading data for ${company.name}:`, error);
        }
      }

      setPeriods(allPeriods);

      // Convert category map to array
      const uniqueCategories = Array.from(categoryMap.values());
      setCategories(uniqueCategories);

      // Select first 5 categories by default
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

    // Find the widest date range across all filtered periods
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

    // Calculate combined opening balance
    const totalOpening = filteredPeriods.reduce((sum, p) => sum + (Number(p.openingBalance) || 0), 0);
    setOpeningBalance(totalOpening);
  };

  const loadAllLines = async () => {
    const filteredPeriods = getFilteredPeriods();
    if (filteredPeriods.length === 0) {
      setLines({});
      return;
    }

    const combinedLines: Record<string, number> = {};

    for (const period of filteredPeriods) {
      try {
        const response = await fetch(`/api/budget/lines?periodId=${period.id}`);
        if (response.ok) {
          const data = await response.json();
          data.forEach((line: any) => {
            const dateKey = line.date.split('T')[0];
            // Find the category name for this line
            const category = categories.find(c => c.id === line.categoryId);
            if (category) {
              const key = `${dateKey}_${category.name}`;
              const amount = parseFloat(String(line.amount).replace(/,/g, '')) || 0;
              combinedLines[key] = (combinedLines[key] || 0) + amount;
            }
          });
        }
      } catch (error) {
        console.error(`Error loading lines for period ${period.id}:`, error);
      }
    }

    setLines(combinedLines);
  };

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
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getLineValue = (date: string, categoryName: string): string => {
    const key = `${date}_${categoryName}`;
    const amount = lines[key];
    if (!amount) return '$0.00';
    return `$${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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
      <div className="flex items-center justify-between">
        <div>
          <Link href="/app/budget" className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block">
            ← Back to Budget & Forecast
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-semibold text-white">CONSOLIDATED {filterType}</h1>
            <span className={`px-3 py-1 rounded text-xs font-medium ${
              filterType === 'BUDGET' ? 'bg-blue-500/10 text-blue-400' :
              filterType === 'FORECAST' ? 'bg-purple-500/10 text-purple-400' :
              'bg-green-500/10 text-green-400'
            }`}>
              {filterType}
            </span>
            <span className="px-3 py-1 rounded text-xs font-medium border border-green-500/30 bg-green-500/10 text-green-400">
              COMBINED
            </span>
          </div>
          <p className="text-slate-400 mt-1">
            {filteredPeriods.length} periods from {companies.length} companies
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-black/30 border border-white/20 rounded text-white"
          >
            <option value="ACTUALS">Actuals</option>
            <option value="BUDGET">Budget</option>
            <option value="FORECAST">Forecast</option>
          </select>
          <Link href="/app/budget/categories">
            <Button variant="secondary">Manage Categories</Button>
          </Link>
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
            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-white text-lg font-medium mb-2">No active {filterType.toLowerCase()} periods found</h3>
            <p className="text-slate-400 mb-6">
              Create {filterType.toLowerCase()} periods for your companies to see consolidated data here.
            </p>
            <Link href="/app/budget">
              <Button>Go to Budget & Forecast</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
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
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
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
              {dates.length} days • {selectedCategories.length} categories • {filteredPeriods.length} periods combined
            </div>
            <div>
              Opening balance: ${openingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
