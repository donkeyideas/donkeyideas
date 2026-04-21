'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Button } from '@donkey-ideas/ui';
import api from '@/lib/api-client';
import {
  GPKPICards,
  GPVitalsChart,
  GPInstallChart,
  GPStoreListingCard,
  GPCompanyTable,
  GPAppBreakdownChart,
} from '@/components/play-store';

type DateRange = '7d' | '30d' | '90d' | 'all' | 'custom';
type StoreFilter = 'all' | 'google' | 'apple';

function mergeTimeSeries(playSeries: any[], appleSeries: any[]): any[] {
  const map: Record<string, any> = {};
  for (const d of playSeries) {
    map[d.date] = { ...d };
  }
  for (const d of appleSeries) {
    if (map[d.date]) {
      map[d.date].installs += d.installs || 0;
      map[d.date].uninstalls += d.uninstalls || 0;
      map[d.date].updates += d.updates || 0;
      map[d.date].activeDevices += d.activeDevices || 0;
    } else {
      map[d.date] = { ...d };
    }
  }
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function mergeOverviews(play: any, apple: any): any {
  const playReviews = play?.totalReviews || 0;
  const appleReviews = apple?.totalReviews || 0;
  const totalReviews = playReviews + appleReviews;
  const weightedRating = totalReviews > 0
    ? ((play?.averageRating || 0) * playReviews + (apple?.averageRating || 0) * appleReviews) / totalReviews
    : 0;

  return {
    totalInstalls: (play?.totalInstalls || 0) + (apple?.totalInstalls || 0),
    activeDevices: (play?.activeDevices || 0) + (apple?.activeDevices || 0),
    dailyInstalls: (play?.dailyInstalls || 0) + (apple?.dailyInstalls || 0),
    dailyUninstalls: (play?.dailyUninstalls || 0) + (apple?.dailyUninstalls || 0),
    dailyUpdates: (play?.dailyUpdates || 0) + (apple?.dailyUpdates || 0),
    crashRate: play?.crashRate || 0,
    anrRate: play?.anrRate || 0,
    slowStartRate: play?.slowStartRate || 0,
    slowRenderingRate: play?.slowRenderingRate || 0,
    averageRating: Math.round(weightedRating * 10) / 10,
    totalReviews,
  };
}

function mergeStoreListings(play: any, apple: any): any {
  const visitors = (play?.visitors || 0) + (apple?.visitors || 0);
  const acquisitions = (play?.acquisitions || 0) + (apple?.acquisitions || 0);
  return {
    visitors,
    acquisitions,
    conversionRate: visitors > 0 ? Math.round((acquisitions / visitors) * 10000) / 100 : 0,
  };
}

export default function ConsolidatedAppStoresPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');
  const [playData, setPlayData] = useState<any>(null);
  const [appleData, setAppleData] = useState<any>(null);

  useEffect(() => {
    if (dateRange !== 'custom') {
      loadData();
    }
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    let params = `dateRange=${dateRange}`;
    if (dateRange === 'custom' && customFrom && customTo) {
      params += `&dateFrom=${customFrom}&dateTo=${customTo}`;
    }

    try {
      const [playResp, appleResp] = await Promise.all([
        api.get(`/companies/consolidated/play-store?${params}`).catch(() => ({ data: null })),
        api.get(`/companies/consolidated/app-store?${params}`).catch(() => ({ data: null })),
      ]);
      setPlayData(playResp.data);
      setAppleData(appleResp.data);
    } catch (err: any) {
      setError('Failed to load store data');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      setShowCustomPicker(false);
      loadData();
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
              <div className="text-red-400 mb-2">Error loading store data</div>
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

  // Build display data based on filter
  const playAgg = playData?.aggregated;
  const appleAgg = appleData?.aggregated;
  const hasPlay = !!playAgg;
  const hasApple = !!appleAgg;

  let displayData: any = null;

  if (storeFilter === 'google' && hasPlay) {
    displayData = {
      overview: playAgg.overview,
      installTimeSeries: playAgg.installTimeSeries || [],
      vitalsTimeSeries: playAgg.vitalsTimeSeries || [],
      storeListing: playAgg.storeListing,
      companyBreakdown: (playAgg.companyBreakdown || []).map((c: any) => ({ ...c, store: 'google' })),
    };
  } else if (storeFilter === 'apple' && hasApple) {
    displayData = {
      overview: appleAgg.overview,
      installTimeSeries: appleAgg.installTimeSeries || [],
      vitalsTimeSeries: [],
      storeListing: appleAgg.storeListing,
      companyBreakdown: (appleAgg.companyBreakdown || []).map((c: any) => ({ ...c, store: 'apple' })),
    };
  } else if (storeFilter === 'all' && (hasPlay || hasApple)) {
    displayData = {
      overview: mergeOverviews(playAgg?.overview, appleAgg?.overview),
      installTimeSeries: mergeTimeSeries(
        playAgg?.installTimeSeries || [],
        appleAgg?.installTimeSeries || []
      ),
      vitalsTimeSeries: playAgg?.vitalsTimeSeries || [],
      storeListing: mergeStoreListings(playAgg?.storeListing, appleAgg?.storeListing),
      companyBreakdown: [
        ...(playAgg?.companyBreakdown || []).map((c: any) => ({ ...c, store: 'google' })),
        ...(appleAgg?.companyBreakdown || []).map((c: any) => ({ ...c, store: 'apple' })),
      ].sort((a, b) => (b.totalInstalls || 0) - (a.totalInstalls || 0)),
    };
  }

  // Unconnected companies
  const playCompanies = playData?.companies || [];
  const appleCompanies = appleData?.companies || [];
  const allCompanyNames = new Set([
    ...playCompanies.map((c: any) => c.name),
    ...appleCompanies.map((c: any) => c.name),
  ]);
  const unconnected: { name: string; missing: string }[] = [];
  for (const name of allCompanyNames) {
    const hasPlayConn = playCompanies.find((c: any) => c.name === name)?.connected;
    const hasAppleConn = appleCompanies.find((c: any) => c.name === name)?.connected;
    if (!hasPlayConn && !hasAppleConn) {
      unconnected.push({ name, missing: 'Both Stores' });
    } else if (!hasPlayConn && storeFilter !== 'apple') {
      unconnected.push({ name, missing: 'Play Store' });
    } else if (!hasAppleConn && storeFilter !== 'google') {
      unconnected.push({ name, missing: 'App Store' });
    }
  }

  const subtitles: Record<StoreFilter, string> = {
    all: 'Consolidated app performance across all stores',
    google: 'Consolidated Android app performance',
    apple: 'Consolidated iOS app performance',
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">
            App Stores Overview
          </h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            {subtitles[storeFilter]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          {/* Store Filter */}
          <div className="flex items-center gap-2 bg-white/5 [.light_&]:bg-slate-100 rounded-lg p-1">
            {([
              { key: 'all' as StoreFilter, label: 'All' },
              { key: 'google' as StoreFilter, label: 'Google Play' },
              { key: 'apple' as StoreFilter, label: 'App Store' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStoreFilter(key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  storeFilter === key
                    ? 'bg-blue-500 text-white'
                    : 'text-white/60 [.light_&]:text-slate-600 hover:text-white [.light_&]:hover:text-slate-900'
                }`}
              >
                {key === 'google' && <GooglePlayIcon className="w-3.5 h-3.5" />}
                {key === 'apple' && <AppleIcon className="w-3.5 h-3.5" />}
                {label}
              </button>
            ))}
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 bg-white/5 [.light_&]:bg-slate-100 rounded-lg p-1">
            {([
              { key: '7d' as DateRange, label: '7 Days' },
              { key: '30d' as DateRange, label: '30 Days' },
              { key: '90d' as DateRange, label: '90 Days' },
              { key: 'all' as DateRange, label: 'All' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setDateRange(key); setShowCustomPicker(false); }}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  dateRange === key
                    ? 'bg-blue-500 text-white'
                    : 'text-white/60 [.light_&]:text-slate-600 hover:text-white [.light_&]:hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => {
                setDateRange('custom');
                setShowCustomPicker(true);
                if (!customFrom) {
                  const d = new Date();
                  d.setDate(d.getDate() - 30);
                  setCustomFrom(d.toISOString().split('T')[0]);
                }
                if (!customTo) {
                  setCustomTo(new Date().toISOString().split('T')[0]);
                }
              }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                dateRange === 'custom'
                  ? 'bg-blue-500 text-white'
                  : 'text-white/60 [.light_&]:text-slate-600 hover:text-white [.light_&]:hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>

          <Button variant="secondary" onClick={loadData}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </Button>
        </div>
      </div>

      {/* Custom Date Picker */}
      {showCustomPicker && dateRange === 'custom' && (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <label className="text-sm text-white/60 [.light_&]:text-slate-600">From:</label>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md bg-white/10 [.light_&]:bg-slate-100 border border-white/20 [.light_&]:border-slate-300 text-white [.light_&]:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="text-sm text-white/60 [.light_&]:text-slate-600">To:</label>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-md bg-white/10 [.light_&]:bg-slate-100 border border-white/20 [.light_&]:border-slate-300 text-white [.light_&]:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button variant="primary" onClick={handleCustomApply} className="text-sm">
            Apply
          </Button>
        </div>
      )}

      {/* Aggregated Data */}
      {displayData ? (
        <>
          <div className="mb-6">
            <GPKPICards data={displayData.overview} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <GPInstallChart
              data={displayData.installTimeSeries}
              title="Portfolio Install Trends"
            />
            <GPAppBreakdownChart data={displayData.companyBreakdown} />
          </div>

          {displayData.vitalsTimeSeries?.length > 0 && (
            <div className="mb-6">
              <GPVitalsChart
                data={displayData.vitalsTimeSeries}
                title="Portfolio Vitals Over Time"
              />
            </div>
          )}

          {displayData.storeListing && (displayData.storeListing.visitors > 0 || displayData.storeListing.acquisitions > 0) && (
            <div className="mb-6">
              <GPStoreListingCard data={displayData.storeListing} />
            </div>
          )}

          <div className="mb-6">
            <GPCompanyTable data={displayData.companyBreakdown} />
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
                No Store Data Available
              </h2>
              <p className="text-white/60 [.light_&]:text-slate-600">
                Connect your apps by adding package names or bundle IDs in each company&apos;s Business Profile.
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
              Companies Without Store Connection
            </h3>
            <div className="flex flex-wrap gap-2">
              {unconnected.map((c) => (
                <span
                  key={c.name + c.missing}
                  className="text-xs px-2 py-1 bg-white/5 [.light_&]:bg-slate-100 text-white/50 [.light_&]:text-slate-500 rounded"
                >
                  {c.name} <span className="text-white/30 [.light_&]:text-slate-400">({c.missing})</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Store icons
function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.651 1.535a1 1 0 010 1.732l-2.651 1.535-2.534-2.534 2.534-2.268zM5.864 3.458L16.8 9.79l-2.302 2.302-8.635-8.635z" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
