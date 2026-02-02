'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import {
  GAKPICards,
  GASessionsChart,
  GATrafficSources,
  GACompanyTable,
} from '@/components/analytics';

type DateRange = '7d' | '30d' | '90d';

export default function ConsolidatedAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/companies/consolidated/analytics?dateRange=${dateRange}`);
      setAnalyticsData(response.data);
    } catch (err: any) {
      console.error('Failed to load consolidated analytics:', err);
      setError(err.response?.data?.error?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-red-400 mb-2">Error loading analytics</div>
              <div className="text-white/60 text-sm">{error}</div>
              <Button variant="primary" onClick={loadAnalytics} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasConnectedCompanies = analyticsData?.connectedCompanies > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">
            Consolidated Analytics
          </h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            Aggregated website analytics across all portfolio companies
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 bg-white/5 [.light_&]:bg-slate-100 rounded-lg p-1">
            {(['7d', '30d', '90d'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  dateRange === range
                    ? 'bg-blue-500 text-white'
                    : 'text-white/60 [.light_&]:text-slate-600 hover:text-white [.light_&]:hover:text-slate-900'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={loadAnalytics}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Portfolio Status */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-white/50 [.light_&]:text-slate-500">Total Companies</p>
                <p className="text-xl font-bold text-blue-400">{analyticsData?.totalCompanies || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-white/50 [.light_&]:text-slate-500">GA Connected</p>
                <p className="text-xl font-bold text-green-400">
                  {analyticsData?.connectedCompanies || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs text-white/50 [.light_&]:text-slate-500">Not Connected</p>
                <p className="text-xl font-bold text-yellow-400">
                  {(analyticsData?.totalCompanies || 0) - (analyticsData?.connectedCompanies || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!hasConnectedCompanies ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white [.light_&]:text-slate-900 mb-2">
                No Companies Connected
              </h2>
              <p className="text-white/60 [.light_&]:text-slate-600 mb-6">
                Connect Google Analytics to your companies by adding a GA4 Property ID in each
                company's Business Profile.
              </p>
              <Button
                variant="primary"
                onClick={() => (window.location.href = '/app/business-profile')}
              >
                Go to Business Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Aggregated KPIs */}
          <div className="mb-6">
            <GAKPICards
              data={{
                totalUsers: analyticsData.aggregated?.totalUsers || 0,
                newUsers: analyticsData.aggregated?.totalNewUsers || 0,
                sessions: analyticsData.aggregated?.totalSessions || 0,
                pageviews: analyticsData.aggregated?.totalPageviews || 0,
                avgSessionDuration: analyticsData.aggregated?.avgSessionDuration || 0,
                bounceRate: analyticsData.aggregated?.avgBounceRate || 0,
              }}
              showEngagement={false}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <GASessionsChart
              data={analyticsData.aggregated?.sessionsOverTime || []}
              title="Portfolio Sessions Over Time"
            />
            <GATrafficSources
              data={analyticsData.aggregated?.trafficSources || []}
              title="Portfolio Traffic Sources"
            />
          </div>

          {/* Company Breakdown Table */}
          <div className="mb-6">
            <GACompanyTable data={analyticsData.aggregated?.companyBreakdown || []} />
          </div>

          {/* Not Connected Companies */}
          {analyticsData?.companies?.some((c: any) => !c.connected) && (
            <Card>
              <CardHeader>
                <CardTitle>Companies Without Google Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.companies
                    .filter((c: any) => !c.connected)
                    .map((company: any) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-3 bg-white/5 [.light_&]:bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {company.logo ? (
                            <img
                              src={company.logo}
                              alt={company.name}
                              className="w-8 h-8 rounded-lg object-contain bg-white/5 p-1"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
                              <span className="text-slate-400 text-sm font-bold">
                                {company.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-medium text-white [.light_&]:text-slate-900">
                            {company.name}
                          </span>
                        </div>
                        <span className="text-xs text-yellow-400 flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          Not Connected
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
