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
  GPDeviceBreakdown,
  GPVersionBreakdown,
  GPErrorsTable,
  GPRecommendationsCard,
} from '@/components/play-store';

type DateRange = '7d' | '30d' | '90d';
type StoreFilter = 'all' | 'google' | 'apple';

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

function mergeTimeSeries(a: any[], b: any[]): any[] {
  const map: Record<string, any> = {};
  for (const d of a) map[d.date] = { ...d };
  for (const d of b) {
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

export default function AppStoresDetailPage() {
  const { currentCompany } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [storeFilter, setStoreFilter] = useState<StoreFilter>('all');
  const [playData, setPlayData] = useState<any>(null);
  const [appleData, setAppleData] = useState<any>(null);

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany?.id, dateRange]);

  const loadData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    setError(null);

    try {
      const [playResp, appleResp] = await Promise.all([
        api.get(`/companies/${currentCompany.id}/play-store?dateRange=${dateRange}`).catch(() => ({ data: null })),
        api.get(`/companies/${currentCompany.id}/app-store?dateRange=${dateRange}`).catch(() => ({ data: null })),
      ]);
      setPlayData(playResp.data);
      setAppleData(appleResp.data);
    } catch (err: any) {
      setError('Failed to load store data');
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
        description="Select a company from the sidebar to view store data"
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
              <div className="text-red-400 mb-2">Error loading store data</div>
              <div className="text-white/60 [.light_&]:text-slate-500 text-sm">{error}</div>
              <Button variant="primary" onClick={loadData} className="mt-4">Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const playConnected = playData?.connected && playData?.data;
  const appleConnected = appleData?.connected && appleData?.data;

  if (!playConnected && !appleConnected) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">App Stores</h1>
          <p className="text-white/60 [.light_&]:text-slate-600">{currentCompany.name} — app performance</p>
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white [.light_&]:text-slate-900 mb-2">No Stores Connected</h2>
              <p className="text-white/60 [.light_&]:text-slate-600 mb-6">
                Add your Android package name or iOS bundle ID in the Business Profile to start tracking.
              </p>
              <Button variant="primary" onClick={() => (window.location.href = '/app/business-profile')}>
                Go to Business Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine what data to show based on filter
  const play = playConnected ? playData.data : null;
  const apple = appleConnected ? appleData.data : null;

  let overview: any, installTS: any[], vitalsTS: any[], storeListing: any;
  let reviews: any[] = [], ratingDist: any[] = [], avgRating = 0;
  let deviceBreakdown: any[] = [], versionBreakdown: any[] = [], errorIssues: any[] = [];
  let showPlay = false, showApple = false;

  if (storeFilter === 'google' && play) {
    overview = play.overview;
    installTS = play.installTimeSeries || [];
    vitalsTS = play.vitalsTimeSeries || [];
    storeListing = play.storeListing;
    reviews = play.reviews || [];
    ratingDist = play.ratingDistribution || [];
    avgRating = play.overview?.averageRating || 0;
    deviceBreakdown = play.deviceBreakdown || [];
    versionBreakdown = play.versionBreakdown || [];
    errorIssues = play.errorIssues || [];
    showPlay = true;
  } else if (storeFilter === 'apple' && apple) {
    overview = apple.overview;
    installTS = apple.installTimeSeries || [];
    vitalsTS = [];
    storeListing = apple.storeListing;
    reviews = apple.reviews || [];
    ratingDist = apple.ratingDistribution || [];
    avgRating = apple.overview?.averageRating || 0;
    showApple = true;
  } else {
    // All
    overview = mergeOverviews(play?.overview, apple?.overview);
    installTS = mergeTimeSeries(play?.installTimeSeries || [], apple?.installTimeSeries || []);
    vitalsTS = play?.vitalsTimeSeries || [];
    const pSL = play?.storeListing;
    const aSL = apple?.storeListing;
    const v = (pSL?.visitors || 0) + (aSL?.visitors || 0);
    const a = (pSL?.acquisitions || 0) + (aSL?.acquisitions || 0);
    storeListing = { visitors: v, acquisitions: a, conversionRate: v > 0 ? Math.round((a / v) * 10000) / 100 : 0 };
    reviews = [...(play?.reviews || []), ...(apple?.reviews || [])].sort(
      (a: any, b: any) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
    ratingDist = play?.ratingDistribution || apple?.ratingDistribution || [];
    avgRating = overview.averageRating;
    deviceBreakdown = play?.deviceBreakdown || [];
    versionBreakdown = play?.versionBreakdown || [];
    errorIssues = play?.errorIssues || [];
    showPlay = !!play;
    showApple = !!apple;
  }

  // If filtered to a store that isn't connected, show message
  if (storeFilter === 'google' && !play) {
    return <NotConnectedMsg store="Play Store" company={currentCompany.name} />;
  }
  if (storeFilter === 'apple' && !apple) {
    return <NotConnectedMsg store="App Store" company={currentCompany.name} />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">App Stores</h1>
          <p className="text-white/60 [.light_&]:text-slate-600">
            {currentCompany.name} — {storeFilter === 'google' ? 'Android' : storeFilter === 'apple' ? 'iOS' : 'all platforms'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 [.light_&]:bg-slate-100 rounded-lg p-1">
            {([
              { key: 'all' as StoreFilter, label: 'All' },
              { key: 'google' as StoreFilter, label: 'Google Play' },
              { key: 'apple' as StoreFilter, label: 'App Store' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStoreFilter(key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  storeFilter === key
                    ? 'bg-blue-500 text-white'
                    : 'text-white/60 [.light_&]:text-slate-600 hover:text-white [.light_&]:hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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

      {/* Connection badges */}
      <div className="mb-6 flex items-center gap-4">
        {playData?.connected && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 [.light_&]:text-slate-500">Android:</span>
            <span className="text-xs font-mono bg-white/5 [.light_&]:bg-slate-100 px-2 py-1 rounded text-white/70 [.light_&]:text-slate-700">
              {playData.packageName}
            </span>
            <span className="w-2 h-2 bg-green-400 rounded-full" />
          </div>
        )}
        {appleData?.connected && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 [.light_&]:text-slate-500">iOS:</span>
            <span className="text-xs font-mono bg-white/5 [.light_&]:bg-slate-100 px-2 py-1 rounded text-white/70 [.light_&]:text-slate-700">
              {appleData.bundleId}
            </span>
            <span className="w-2 h-2 bg-green-400 rounded-full" />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="mb-6">
        <GPKPICards data={overview} />
      </div>

      {/* AI Recommendations */}
      {(showPlay || storeFilter === 'google') && (
        <div className="mb-6">
          <GPRecommendationsCard companyId={currentCompany.id} />
        </div>
      )}

      {/* Install Trends + Vitals/Store Listing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <GPInstallChart data={installTS} title="Install Trends" />
        {vitalsTS.length > 0 ? (
          <GPVitalsChart data={vitalsTS} />
        ) : (
          <GPStoreListingCard data={storeListing} />
        )}
      </div>

      {/* Store Listing (if vitals shown above) */}
      {vitalsTS.length > 0 && storeListing && (storeListing.visitors > 0 || storeListing.acquisitions > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <GPStoreListingCard data={storeListing} />
          <GPRatingDistribution data={ratingDist} averageRating={avgRating} />
        </div>
      )}

      {/* Rating + Reviews (if no vitals) */}
      {vitalsTS.length === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <GPRatingDistribution data={ratingDist} averageRating={avgRating} />
          <GPReviewsList reviews={reviews} />
        </div>
      )}

      {/* Reviews + Device (if vitals shown) */}
      {vitalsTS.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <GPReviewsList reviews={reviews} />
          <GPDeviceBreakdown data={deviceBreakdown} />
        </div>
      )}

      {/* Version + Errors (Play Store only) */}
      {(versionBreakdown.length > 0 || errorIssues.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GPVersionBreakdown data={versionBreakdown} />
          <GPErrorsTable data={errorIssues} />
        </div>
      )}
    </div>
  );
}

function NotConnectedMsg({ store, company }: { store: string; company: string }) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white [.light_&]:text-slate-900">App Stores</h1>
        <p className="text-white/60 [.light_&]:text-slate-600">{company}</p>
      </div>
      <Card>
        <CardContent className="p-8">
          <div className="text-center max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-white [.light_&]:text-slate-900 mb-2">{store} Not Connected</h2>
            <p className="text-white/60 [.light_&]:text-slate-600 mb-6">
              Add the {store === 'Play Store' ? 'Android package name' : 'iOS bundle ID'} in Business Profile.
            </p>
            <Button variant="primary" onClick={() => (window.location.href = '/app/business-profile')}>
              Go to Business Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
