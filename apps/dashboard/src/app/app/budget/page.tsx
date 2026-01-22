'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@donkey-ideas/ui';
import Link from 'next/link';
import { useAppStore } from '@/lib/store';
import { useRouter, useSearchParams } from 'next/navigation';

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
  const { currentCompany } = useAppStore();
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const manageMode = searchParams.get('manage') === '1';

  useEffect(() => {
    if (currentCompany) {
      loadPeriods();
    }
  }, [currentCompany]);

  const loadPeriods = async () => {
    if (!currentCompany) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/budget/periods?companyId=${currentCompany.id}`);
      const data = await response.json();
      setPeriods(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading periods:', error);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const latestPeriod = useMemo(() => {
    if (!periods.length) return null;
    return [...periods].sort((a, b) => {
      const aDate = new Date(a.endDate).getTime();
      const bDate = new Date(b.endDate).getTime();
      return bDate - aDate;
    })[0];
  }, [periods]);

  useEffect(() => {
    if (!manageMode && latestPeriod && !loading) {
      router.replace(`/app/budget/${latestPeriod.id}`);
    }
  }, [manageMode, latestPeriod, loading, router]);

  const handleDeletePeriod = async (period: BudgetPeriod) => {
    const confirmed = window.confirm(
      `Delete "${period.name}"?\n\nThis will permanently remove the period and all ${period._count.lines} entries.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(period.id);
      const response = await fetch(`/api/budget/periods/${period.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        alert(`Error: ${error.error || 'Failed to delete period'}`);
        return;
      }
      await loadPeriods();
    } catch (error) {
      console.error('Error deleting period:', error);
      alert('Failed to delete period');
    } finally {
      setDeletingId(null);
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

  if (!currentCompany) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg">Please select a company from the sidebar to view budgets</p>
        </div>
      </div>
    );
  }

  if (!manageMode && latestPeriod) {
    return (
      <div className="p-8">
        <div className="text-center text-slate-400">Loading period...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Budget & Forecast</h1>
          <p className="text-slate-400 mt-1">
            Managing budgets for <span className="text-blue-400 font-medium">{currentCompany.name}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/app/budget/categories">
            <Button variant="secondary">
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

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-400">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light text-white">
              {periods?.filter(p => p.type === 'BUDGET').length || 0}
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
              {periods?.filter(p => p.type === 'FORECAST').length || 0}
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
              {periods?.filter(p => p.type === 'ACTUALS').length || 0}
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
          ) : !periods || periods.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No budget periods yet</p>
              <Link href="/app/budget/new">
                <Button>Create Your First Period</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {periods?.map((period) => (
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
                      {period._count.lines} entries
                    </div>
                    <Link href={`/app/budget/${period.id}`}>
                      <Button size="sm">Edit</Button>
                    </Link>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
