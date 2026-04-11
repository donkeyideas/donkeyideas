'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '@donkey-ideas/ui';
import { EmptyState } from '@donkey-ideas/ui';
import { useAppStore } from '@/lib/store';
import api from '@/lib/api-client';
import {
  GPKPICards,
  GPVitalsChart,
  GPInstallChart,
  GPStoreListingCard,
  GPRatingDistribution,
  GPReviewsList,
  GPRecommendationsCard,
} from '@/components/play-store';

type DateRange = '7d' | '30d' | '90d';

export default function AppStorePage() {
  const { currentCompany } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [appData, setAppData] = useState<any>(null);

  useEffect(() => {
    if (currentCompany) {
      loadAppData();
    }
  }, [currentCompany?.id, dateRange]);

  const loadAppData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/companies/${currentCompany.id}/app-store?dateRange=${dateRange}`);
      setAppData(response.data);
    } catch (err: any) {
      console.error('Failed to load App Store data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load App Store data');
    } finally {
      setLoading(false);
    }
  };

  if (!currentCompany) {
    return (
      <EmptyState
        icon={
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        }
        title="No company selected"
        description="Select a company from the sidebar to view App Store data"
      />
    );
  }

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
              <Button variant="primary" onClick={loadAppData} className="mt-4">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appData?.connected) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">
            App Store
          </h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            {currentCompany.name} — iOS app performance
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white [.light_&]:text-slate-900 mb-2">
                App Store Not Connected
              </h2>
              <p className="text-white/60 [.light_&]:text-slate-600 mb-6">
                {appData?.message || 'Add your iOS bundle ID in the Business Profile to start tracking App Store data.'}
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
      </div>
    );
  }

  if (appData?.connected && !appData?.data) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">
            App Store
          </h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            {currentCompany.name} — iOS app performance
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white [.light_&]:text-slate-900 mb-2">
                Unable to Fetch App Store Data
              </h2>
              <p className="text-white/60 [.light_&]:text-slate-600 mb-4">
                {appData?.error || 'Could not retrieve data from App Store Connect.'}
              </p>
              <p className="text-sm text-white/40 [.light_&]:text-slate-500 mb-6">
                Bundle ID: {appData?.bundleId}
              </p>
              <Button variant="primary" onClick={loadAppData}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data } = appData;

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">
            App Store
          </h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            {currentCompany.name} — iOS app performance
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
          <Button variant="secondary" onClick={loadAppData}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Bundle ID Badge */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs text-white/40 [.light_&]:text-slate-500">Bundle ID:</span>
        <span className="text-xs font-mono bg-white/5 [.light_&]:bg-slate-100 px-2 py-1 rounded text-white/70 [.light_&]:text-slate-700">
          {appData.bundleId}
        </span>
        <span className="text-xs text-green-400 flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Connected
        </span>
      </div>

      {/* KPI Cards */}
      <div className="mb-6">
        <GPKPICards data={data.overview} />
      </div>

      {/* AI Recommendations */}
      <div className="mb-6">
        <GPRecommendationsCard companyId={currentCompany.id} apiBasePath="/app-store" />
      </div>

      {/* Row 1: Install Trends + Store Listing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GPInstallChart data={data.installTimeSeries} title="Download Trends" />
        <GPStoreListingCard data={data.storeListing} />
      </div>

      {/* Row 2: Rating Distribution + Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GPRatingDistribution
          data={data.ratingDistribution}
          averageRating={data.overview.averageRating}
        />
        <GPReviewsList reviews={data.reviews} />
      </div>
    </div>
  );
}
