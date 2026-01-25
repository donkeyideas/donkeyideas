'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { NotificationModal } from '@/components/ui/notification-modal';
import { useAppStore } from '@/lib/store';
import { CreateCompanyModal } from '@/components/companies/create-company-modal';
import { AIAssistant } from '@/components/ai/ai-assistant';
import { useConsolidatedData } from '@/lib/hooks/use-consolidated-data';
import { StatsGridSkeleton, CardSkeleton } from '@/components/ui/loading-skeleton';
import api from '@/lib/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ConsolidatedData {
  totalRevenue: number;
  totalCOGS: number;
  totalOperatingExpenses: number;
  totalExpenses: number;
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalCashBalance: number;
  totalValuation: number;
  activeCompanies: number;
  totalTeamMembers: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { companies, currentCompany } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>(''); // Format: YYYY-MM or empty for all
  const [showRebuildConfirm, setShowRebuildConfirm] = useState(false);
  const [rebuildLoading, setRebuildLoading] = useState(false);
  const [notification, setNotification] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
  });

  // Use React Query for data fetching (cached, optimized)
  const { data: consolidatedData, isLoading: loading, refetch } = useConsolidatedData(
    monthFilter || undefined
  ) as { data: ConsolidatedData | undefined; isLoading: boolean; refetch: () => void };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Chart data - must be at top level, not inside JSX
  const financialOverviewData = useMemo(() => {
    const revenue = consolidatedData?.totalRevenue || 0;
    const cogs = consolidatedData?.totalCOGS || 0;
    const opex = consolidatedData?.totalOperatingExpenses || 0;
    const profit = consolidatedData?.netProfit || 0;

    return [
      { name: 'Revenue', value: revenue, type: 'Revenue' },
      { name: 'COGS', value: cogs, type: 'Expenses' },
      { name: 'OpEx', value: opex, type: 'Expenses' },
      { name: 'Net Profit', value: profit, type: 'Profit' },
    ];
  }, [consolidatedData]);

  const expenseBreakdownData = useMemo(() => {
    const cogs = consolidatedData?.totalCOGS || 0;
    const opex = consolidatedData?.totalOperatingExpenses || 0;

    if (cogs === 0 && opex === 0) {
      return [{ name: 'No Data', value: 1 }];
    }

    return [
      { name: 'COGS', value: cogs },
      { name: 'Operating Expenses', value: opex },
    ].filter(item => item.value > 0);
  }, [consolidatedData]);

  const handleRebuildAll = async () => {
    setRebuildLoading(true);
    try {
      const response = await api.post('/companies/consolidated/rebuild-all-balance-sheets');
      setNotification({
        isOpen: true,
        title: 'Success',
        message: response.data.message || 'Balance sheets rebuilt successfully for all companies',
        type: 'success',
      });
      await refetch();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Error',
        message: error.response?.data?.error?.message || 'Failed to rebuild balance sheets',
        type: 'error',
      });
    } finally {
      setRebuildLoading(false);
    }
  };

  // Show empty state if no companies
  if (companies.length === 0) {
    return (
      <>
        <EmptyState
          icon="🏢"
          title="No companies yet"
          description="Create your first company to start tracking your ventures"
          action={
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create Your First Company
            </Button>
          }
        />
        <CreateCompanyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">Dashboard Overview</h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            Donkey Ideas — Consolidated metrics across all companies
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/60 [.light_&]:text-slate-600">Filter by Month:</label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white text-sm focus:outline-none focus:border-blue-500 [&>option]:bg-[#0F0F0F] [&>option]:text-white [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&_option]:bg-white [.light_&_option]:text-slate-900 placeholder:text-white/50 [.light_&]:bg-white [.light_&]:border-slate-300 [.light_&]:text-slate-900 [.light_&]:placeholder:text-slate-500"
            >
              <option value="">All Time</option>
              {(() => {
                const monthsList: string[] = [];
                const now = new Date();
                for (let i = 0; i < 12; i++) {
                  const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  monthsList.push(monthKey);
                }
                return monthsList.map((month) => {
                  const [year, monthNum] = month.split('-');
                  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                  const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  return (
                    <option key={month} value={month}>
                      {monthName}
                    </option>
                  );
                });
              })()}
            </select>
          </div>
          <Button 
            variant="secondary" 
            onClick={() => setShowRebuildConfirm(true)}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
            disabled={rebuildLoading}
          >
            {rebuildLoading ? 'Rebuilding...' : 'Rebuild All Balance Sheets'}
          </Button>
          <Button variant="secondary" onClick={() => setShowAIAssistant(true)}>
            Ask AI
          </Button>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + New Project
          </Button>
        </div>
      </div>

      {/* Consolidated Stats Grid */}
      {loading ? (
        <StatsGridSkeleton />
      ) : (
        <div className="grid grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-white/50 [.light_&]:text-slate-500 uppercase tracking-wider mb-2">
              Total Revenue
            </div>
            <div className="text-3xl font-bold mb-1 text-white [.light_&]:text-slate-900">
              {formatCurrency(consolidatedData?.totalRevenue || 0)}
            </div>
            <div className="text-sm text-green-500 [.light_&]:text-green-600">
              {consolidatedData && consolidatedData.totalRevenue > 0
                ? '↑ Consolidated across all companies'
                : 'No data yet'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-white/50 [.light_&]:text-slate-500 uppercase tracking-wider mb-2">
              Total Expenses
            </div>
            <div className="text-3xl font-bold mb-1 text-red-400 [.light_&]:text-red-600">
              {formatCurrency(consolidatedData?.totalExpenses || 0)}
            </div>
            <div className="text-sm text-white/60 [.light_&]:text-slate-600">
              {consolidatedData && consolidatedData.totalExpenses > 0
                ? 'COGS + Operating expenses'
                : 'No data yet'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-white/50 [.light_&]:text-slate-500 uppercase tracking-wider mb-2">
              Active Projects
            </div>
            <div className="text-3xl font-bold mb-1 text-white [.light_&]:text-slate-900">
              {consolidatedData?.activeCompanies || companies.length}
            </div>
            <div className="text-sm text-white/60 [.light_&]:text-slate-600">
              {consolidatedData && consolidatedData.activeCompanies > 0
                ? `${consolidatedData.activeCompanies} companies`
                : 'Companies'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-white/50 [.light_&]:text-slate-500 uppercase tracking-wider mb-2">
              Total Cash
            </div>
            <div className="text-3xl font-bold mb-1 text-blue-400 [.light_&]:text-blue-600">
              {formatCurrency(consolidatedData?.totalCashBalance || 0)}
            </div>
            <div className="text-sm text-white/60 [.light_&]:text-slate-600">
              {consolidatedData && consolidatedData.totalCashBalance > 0
                ? 'Cash across all companies'
                : 'No cash data'}
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Consolidated Financials Section */}
      {loading ? (
        <CardSkeleton />
      ) : (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Consolidated Financials</CardTitle>
              <Link href="/app/consolidated">
                <Button variant="ghost" size="sm">
                  View Full Report →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white [.light_&]:text-slate-900 mb-4 pb-2 border-b border-white/10 [.light_&]:border-slate-200">
                P&L Statement
              </h3>
              <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2">Total Revenue</div>
              <div className="text-2xl font-bold mb-4 text-white [.light_&]:text-slate-900">
                {formatCurrency(consolidatedData?.totalRevenue || 0)}
              </div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2">COGS</div>
              <div className="text-xl font-semibold text-orange-400 [.light_&]:text-orange-600 mb-4">
                {formatCurrency(consolidatedData?.totalCOGS || 0)}
              </div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2">Operating Expenses</div>
              <div className="text-xl font-semibold text-red-400 [.light_&]:text-red-600 mb-4">
                {formatCurrency(consolidatedData?.totalOperatingExpenses || 0)}
              </div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2">Net Profit</div>
              <div className={`text-xl font-semibold ${(consolidatedData?.netProfit || 0) >= 0 ? 'text-green-500 [.light_&]:text-green-600' : 'text-red-500 [.light_&]:text-red-600'}`}>
                {formatCurrency(consolidatedData?.netProfit || 0)}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white [.light_&]:text-slate-900 mb-4 pb-2 border-b border-white/10 [.light_&]:border-slate-200">
                Balance Sheet
              </h3>
              <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2">Total Assets</div>
              <div className="text-2xl font-bold mb-4 text-white [.light_&]:text-slate-900">
                {formatCurrency(consolidatedData?.totalAssets || 0)}
              </div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2">Total Liabilities</div>
              <div className="text-xl font-semibold text-red-400 [.light_&]:text-red-600 mb-4">
                {formatCurrency(consolidatedData?.totalLiabilities || 0)}
              </div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2">Total Equity</div>
              <div className="text-xl font-semibold text-green-500 [.light_&]:text-green-600 mb-4">
                {formatCurrency(consolidatedData?.totalEquity || 0)}
              </div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2 pt-2 border-t border-white/10 [.light_&]:border-slate-200">
                Liabilities + Equity
              </div>
              <div className="text-xl font-semibold text-white [.light_&]:text-slate-900">
                {formatCurrency((consolidatedData?.totalLiabilities || 0) + (consolidatedData?.totalEquity || 0))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Financial Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue vs Expenses Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={financialOverviewData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, fill: '#60a5fa' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expenseBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: 'rgba(255,255,255,0.5)' }}
                >
                  {[
                    { name: 'COGS', color: '#f97316' },
                    { name: 'Operating Expenses', color: '#ef4444' },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                />
                <Legend
                  wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }}
                  formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <CreateCompanyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <AIAssistant isOpen={showAIAssistant} onClose={() => setShowAIAssistant(false)} />

      {/* Confirm Rebuild Modal */}
      <ConfirmModal
        isOpen={showRebuildConfirm}
        onClose={() => setShowRebuildConfirm(false)}
        onConfirm={handleRebuildAll}
        title="Rebuild All Balance Sheets"
        message="This will rebuild balance sheets and cash flow for ALL companies. This may take a few moments. Continue?"
        confirmText="Rebuild All"
        cancelText="Cancel"
        variant="info"
        loading={rebuildLoading}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ ...notification, isOpen: false })}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  );
}

