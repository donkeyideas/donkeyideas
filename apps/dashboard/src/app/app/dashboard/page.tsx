'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { useAppStore } from '@/lib/store';
import { CreateCompanyModal } from '@/components/companies/create-company-modal';
import { AIAssistant } from '@/components/ai/ai-assistant';
import { useConsolidatedData } from '@/lib/hooks/use-consolidated-data';
import { StatsGridSkeleton, CardSkeleton } from '@/components/ui/loading-skeleton';
import api from '@/lib/api-client';
import Link from 'next/link';

interface ConsolidatedData {
  totalRevenue: number;
  totalCOGS: number;
  totalOperatingExpenses: number;
  totalExpenses: number;
  netProfit: number;
  totalAssets: number;
  totalEquity: number;
  totalCashBalance: number;
  totalValuation: number;
  activeCompanies: number;
  totalTeamMembers: number;
}

export default function DashboardPage() {
  const { companies, currentCompany } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [monthFilter, setMonthFilter] = useState<string>(''); // Format: YYYY-MM or empty for all

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
            onClick={async () => {
              try {
                await api.post('/companies/consolidated/rebuild-cashflow');
                refetch(); // Refetch data after rebuild
                alert('Cash flow statements rebuilt successfully for all companies');
              } catch (error: any) {
                alert(error.response?.data?.error?.message || 'Failed to rebuild cash flow');
              }
            }}
          >
            Rebuild Cash Flow
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
              Portfolio Value
            </div>
            <div className="text-3xl font-bold mb-1 text-white [.light_&]:text-slate-900">
              {formatCurrency(consolidatedData?.totalValuation || 0)}
            </div>
            <div className="text-sm text-green-500 [.light_&]:text-green-600">
              {consolidatedData && consolidatedData.totalValuation > 0
                ? '↑ Combined valuation'
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
              Team Members
            </div>
            <div className="text-3xl font-bold mb-1 text-white [.light_&]:text-slate-900">
              {consolidatedData?.totalTeamMembers || 0}
            </div>
            <div className="text-sm text-white/60 [.light_&]:text-slate-600">
              {consolidatedData && consolidatedData.totalTeamMembers > 0
                ? 'Across all companies'
                : 'No team members'}
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
              <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2">Total Assets</div>
              <div className="text-2xl font-bold mb-4 text-white [.light_&]:text-slate-900">
                {formatCurrency(consolidatedData?.totalAssets || 0)}
              </div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2">Cash Balance</div>
              <div className="text-xl font-semibold text-blue-400 [.light_&]:text-blue-600 mb-4">
                {formatCurrency(consolidatedData?.totalCashBalance || 0)}
              </div>
              <div className="text-sm text-white/60 [.light_&]:text-slate-600 mb-2">Total Equity</div>
              <div className="text-xl font-semibold text-green-500 [.light_&]:text-green-600">
                {formatCurrency(consolidatedData?.totalEquity || 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => window.location.href = '/app/financials'}
            >
              Update Financials
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => window.location.href = '/app/deck-builder'}
            >
              Generate Deck
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => window.location.href = '/app/investor-portal'}
            >
              Send Update
            </Button>
          </div>
        </CardContent>
      </Card>

      <CreateCompanyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <AIAssistant isOpen={showAIAssistant} onClose={() => setShowAIAssistant(false)} />
    </div>
  );
}

