'use client';

import { useState, useEffect } from 'react';
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
  company: {
    id: string;
    name: string;
  };
  _count: {
    lines: number;
  };
}

interface ConsolidatedStats {
  totalBudgetPeriods: number;
  totalForecastPeriods: number;
  totalActualsPeriods: number;
  totalEntries: number;
  companiesWithBudgets: number;
}

export default function ConsolidatedBudgetPage() {
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ConsolidatedStats>({
    totalBudgetPeriods: 0,
    totalForecastPeriods: 0,
    totalActualsPeriods: 0,
    totalEntries: 0,
    companiesWithBudgets: 0,
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [periods]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all companies
      const companiesRes = await fetch('/api/companies');
      const companiesData = await companiesRes.json();
      setCompanies(Array.isArray(companiesData) ? companiesData : []);

      // Load all periods for all companies
      if (Array.isArray(companiesData) && companiesData.length > 0) {
        const allPeriods: BudgetPeriod[] = [];
        
        for (const company of companiesData) {
          try {
            const periodsRes = await fetch(`/api/budget/periods?companyId=${company.id}`);
            const periodsData = await periodsRes.json();
            
            if (Array.isArray(periodsData)) {
              // Add company info to each period
              periodsData.forEach(period => {
                allPeriods.push({
                  ...period,
                  company: {
                    id: company.id,
                    name: company.name,
                  },
                });
              });
            }
          } catch (error) {
            console.error(`Error loading periods for ${company.name}:`, error);
          }
        }
        
        setPeriods(allPeriods);
      }
    } catch (error) {
      console.error('Error loading consolidated budget data:', error);
      setCompanies([]);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const companiesWithBudgets = new Set(periods.map(p => p.companyId)).size;
    
    setStats({
      totalBudgetPeriods: periods.filter(p => p.type === 'BUDGET').length,
      totalForecastPeriods: periods.filter(p => p.type === 'FORECAST').length,
      totalActualsPeriods: periods.filter(p => p.type === 'ACTUALS').length,
      totalEntries: periods.reduce((sum, p) => sum + (p._count?.lines || 0), 0),
      companiesWithBudgets,
    });
  };

  const getFilteredPeriods = () => {
    let filtered = periods;
    
    if (filterType !== 'all') {
      filtered = filtered.filter(p => p.type === filterType);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }
    
    return filtered.sort((a, b) => 
      new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  };

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

  const filteredPeriods = getFilteredPeriods();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Consolidated Budget & Forecast</h1>
          <p className="text-slate-400 mt-1">
            View all budgets, forecasts, and actuals across all companies
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/app/budget/categories">
            <Button variant="secondary">
              Manage Categories
            </Button>
          </Link>
          <Link href="/app/budget">
            <Button variant="secondary">
              Company View
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-400">Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-white">{stats.companiesWithBudgets}</div>
            <div className="text-xs text-slate-400">with budgets</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-blue-400">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-white">{stats.totalBudgetPeriods}</div>
            <div className="text-xs text-slate-400">periods</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-purple-400">Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-white">{stats.totalForecastPeriods}</div>
            <div className="text-xs text-slate-400">periods</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-green-400">Actuals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-white">{stats.totalActualsPeriods}</div>
            <div className="text-xs text-slate-400">periods</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-slate-400">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-white">{stats.totalEntries.toLocaleString()}</div>
            <div className="text-xs text-slate-400">daily entries</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Periods</CardTitle>
            <div className="flex gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-black/30 border border-white/20 rounded text-white text-sm"
              >
                <option value="all">All Types</option>
                <option value="BUDGET">Budget</option>
                <option value="FORECAST">Forecast</option>
                <option value="ACTUALS">Actuals</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 bg-black/30 border border-white/20 rounded text-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="CLOSED">Closed</option>
              </select>
              <Button variant="secondary" onClick={loadData} size="sm">
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading consolidated data...</div>
          ) : filteredPeriods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No budget periods found</p>
              <Link href="/app/budget">
                <Button>Go to Company View</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPeriods.map((period) => (
                <div
                  key={period.id}
                  className="flex items-center justify-between p-4 bg-black/20 border border-white/10 rounded-lg hover:bg-black/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-white font-medium">{period.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(period.type)}`}>
                        {period.type}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(period.status)}`}>
                        {period.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="font-medium text-blue-400">{period.company?.name || 'Unknown'}</span>
                      <span>
                        {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                      </span>
                      <span>{period._count?.lines || 0} entries</span>
                    </div>
                  </div>
                  <Link href={`/app/budget/${period.id}`}>
                    <Button variant="secondary" size="sm">
                      View →
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-sm text-slate-400">
        Showing {filteredPeriods.length} of {periods.length} total periods across {companies.length} companies
      </div>
    </div>
  );
}
