'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface BudgetPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'BUDGET' | 'FORECAST' | 'ACTUALS';
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  _count: {
    lines: number;
  };
}

export default function BudgetPage() {
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      loadPeriods();
    }
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      const data = await response.json();
      setCompanies(data);
      if (data.length > 0) {
        setSelectedCompany(data[0].id);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/budget/periods?companyId=${selectedCompany}`);
      const data = await response.json();
      setPeriods(data);
    } catch (error) {
      console.error('Error loading periods:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Budget & Forecast</h1>
          <p className="text-slate-400 mt-1">
            Plan, track, and approve your budget, forecasts, and actuals
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/app/budget/categories">
            <Button variant="outline">
              Manage Categories
            </Button>
          </Link>
          <Link href="/app/budget/new">
            <Button>
              + New Period
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select Company</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full p-3 bg-black/30 border border-white/20 rounded text-white"
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-400">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-white">
              {periods.filter(p => p.type === 'BUDGET').length}
            </div>
            <div className="text-sm text-slate-400">Planning periods</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-purple-400">Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-white">
              {periods.filter(p => p.type === 'FORECAST').length}
            </div>
            <div className="text-sm text-slate-400">Forecast periods</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-green-400">Actuals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-white">
              {periods.filter(p => p.type === 'ACTUALS').length}
            </div>
            <div className="text-sm text-slate-400">Actuals periods</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Periods</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : periods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No budget periods yet</p>
              <Link href="/app/budget/new">
                <Button>Create Your First Period</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {periods.map((period) => (
                <div
                  key={period.id}
                  className="flex items-center justify-between p-4 bg-black/20 border border-white/10 rounded-lg hover:bg-black/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded text-xs font-medium ${getTypeColor(period.type)}`}>
                      {period.type}
                    </div>
                    <div>
                      <div className="text-white font-medium">{period.name}</div>
                      <div className="text-sm text-slate-400">
                        {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`px-3 py-1 rounded text-xs font-medium border ${getStatusColor(period.status)}`}>
                      {period.status}
                    </div>
                    <div className="text-sm text-slate-400">
                      {period._count.lines} entries
                    </div>
                    <Link href={`/app/budget/${period.id}`}>
                      <Button size="sm">Edit</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
