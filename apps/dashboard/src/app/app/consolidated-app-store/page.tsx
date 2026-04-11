'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import {
  GPKPICards,
  GPInstallChart,
  GPStoreListingCard,
  GPCompanyTable,
  GPAppBreakdownChart,
} from '@/components/play-store';

type DateRange = '7d' | '30d' | '90d';

export default function ConsolidatedAppStorePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/companies/consolidated/app-store?dateRange=${dateRange}`);
      setData(response.data);
    } catch (err: any) {
      console.error('Failed to load consolidated App Store data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load data');
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
              <div className="text-red-400 mb-2">Error loading App Store data</div>
              <div className="text-white/60 [.light_&]:text-slate-500 text-sm">{error}</div>
              <Button variant="primary" onClick={loadData} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unconnected = (data?.companies || []).filter((c: any) => !c.connected);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">
            App Store Overview
          </h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            Consolidated iOS app performance across all companies
          </p>
        </div>
        <div className="flex items-center gap-4">
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
          <Button variant="secondary" onClick={loadData}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Aggregated Data */}
      {data?.aggregated ? (
        <>
          {/* KPI Cards */}
          <div className="mb-6">
            <GPKPICards data={data.aggregated.overview} />
          </div>

          {/* Install Trends + App Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <GPInstallChart
              data={data.aggregated.installTimeSeries || []}
              title="Portfolio Download Trends"
            />
            <GPAppBreakdownChart data={data.aggregated.companyBreakdown || []} />
          </div>

          {/* Store Listing (if available) */}
          {data.aggregated.storeListing && (data.aggregated.storeListing.visitors > 0 || data.aggregated.storeListing.acquisitions > 0) && (
            <div className="mb-6">
              <GPStoreListingCard data={data.aggregated.storeListing} />
            </div>
          )}

          {/* Company Breakdown Table */}
          <div className="mb-6">
            <GPCompanyTable data={data.aggregated.companyBreakdown} />
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white [.light_&]:text-slate-900 mb-2">
                No App Store Data Available
              </h2>
              <p className="text-white/60 [.light_&]:text-slate-600">
                Connect your iOS apps by adding bundle IDs in each company&apos;s Business Profile.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unconnected Companies */}
      {unconnected.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-white/60 [.light_&]:text-slate-600 mb-3">
              Companies Without App Store Connection
            </h3>
            <div className="flex flex-wrap gap-2">
              {unconnected.map((company: any) => (
                <span
                  key={company.id}
                  className="text-xs px-2 py-1 bg-white/5 [.light_&]:bg-slate-100 text-white/50 [.light_&]:text-slate-500 rounded"
                >
                  {company.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
