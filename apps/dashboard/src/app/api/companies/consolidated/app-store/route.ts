import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { fetchAppStoreData, hasASCCredentials } from '@/lib/app-store-connect';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const companies = await prisma.company.findMany({
      where: { userId: user.id, status: 'active' },
      include: { businessProfile: true },
      orderBy: { name: 'asc' },
    });

    if (companies.length === 0) {
      return NextResponse.json({ companies: [], aggregated: null, message: 'No companies found' });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';
    const hasCredentials = hasASCCredentials();

    const companiesAppData = await Promise.all(
      companies.map(async (company) => {
        const ascBundleId = company.businessProfile?.ascBundleId;

        if (!ascBundleId) {
          return {
            id: company.id, name: company.name, logo: company.logo,
            connected: false, bundleId: null, data: null, error: null,
          };
        }

        if (!hasCredentials) {
          return {
            id: company.id, name: company.name, logo: company.logo,
            connected: true, bundleId: ascBundleId, data: null,
            error: 'App Store Connect credentials not configured',
          };
        }

        try {
          const data = await fetchAppStoreData(ascBundleId, dateRange);
          return {
            id: company.id, name: company.name, logo: company.logo,
            connected: true, bundleId: ascBundleId, data, error: null,
          };
        } catch (err: any) {
          console.error(`Failed to fetch App Store data for ${company.name}:`, err.message);
          return {
            id: company.id, name: company.name, logo: company.logo,
            connected: true, bundleId: ascBundleId, data: null,
            error: err.message || 'Failed to fetch App Store data',
          };
        }
      })
    );

    const connectedCompanies = companiesAppData.filter((c) => c.connected && c.data);

    let aggregated = null;
    if (connectedCompanies.length > 0) {
      aggregated = aggregateAppData(connectedCompanies);
    }

    return NextResponse.json({
      dateRange,
      totalCompanies: companies.length,
      connectedCompanies: connectedCompanies.length,
      companies: companiesAppData,
      aggregated,
      isRealData: true,
    });
  } catch (error: any) {
    console.error('Consolidated App Store API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch consolidated App Store data' } },
      { status: 500 }
    );
  }
}

function aggregateAppData(companies: any[]) {
  let totalActiveDevices = 0;
  let totalReviews = 0;
  let weightedRating = 0;
  let totalWeight = 0;
  let totalInstalls = 0;
  let totalDailyInstalls = 0;
  let totalStoreVisitors = 0;
  let totalStoreAcquisitions = 0;

  const companyBreakdown: any[] = [];

  companies.forEach((company) => {
    const { overview } = company.data;
    const weight = overview.activeDevices || 1;

    totalActiveDevices += overview.activeDevices;
    totalReviews += overview.totalReviews;
    weightedRating += overview.averageRating * weight;
    totalWeight += weight;
    totalInstalls += overview.totalInstalls || 0;
    totalDailyInstalls += overview.dailyInstalls || 0;

    const storeListing = company.data.storeListing;
    if (storeListing) {
      totalStoreVisitors += storeListing.visitors || 0;
      totalStoreAcquisitions += storeListing.acquisitions || 0;
    }

    companyBreakdown.push({
      id: company.id, name: company.name, logo: company.logo,
      packageName: company.bundleId,
      crashRate: overview.crashRate, anrRate: overview.anrRate,
      activeDevices: overview.activeDevices, rating: overview.averageRating,
      reviews: overview.totalReviews, totalInstalls: overview.totalInstalls || 0,
      dailyInstalls: overview.dailyInstalls || 0, dailyUninstalls: 0,
      storeVisitors: storeListing?.visitors || 0,
      storeAcquisitions: storeListing?.acquisitions || 0,
      conversionRate: storeListing?.conversionRate || 0,
      share: 0,
    });
  });

  const avgRating = totalWeight > 0 ? weightedRating / totalWeight : 0;

  companyBreakdown.forEach((c) => {
    c.share = totalActiveDevices > 0 ? Math.round((c.activeDevices / totalActiveDevices) * 100) : 0;
  });
  companyBreakdown.sort((a, b) => b.activeDevices - a.activeDevices);

  // Merge install time series
  const installMap = new Map<string, { installs: number; uninstalls: number; updates: number }>();
  companies.forEach((company) => {
    (company.data.installTimeSeries || []).forEach((day: any) => {
      const existing = installMap.get(day.date) || { installs: 0, uninstalls: 0, updates: 0 };
      installMap.set(day.date, {
        installs: existing.installs + (day.installs || 0),
        uninstalls: existing.uninstalls + (day.uninstalls || 0),
        updates: existing.updates + (day.updates || 0),
      });
    });
  });

  const installTimeSeries = Array.from(installMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    overview: {
      crashRate: 0, anrRate: 0,
      activeDevices: totalActiveDevices,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews,
      totalInstalls,
      dailyInstalls: totalDailyInstalls,
      dailyUninstalls: 0,
      dailyUpdates: 0,
    },
    vitalsTimeSeries: [],
    installTimeSeries,
    storeListing: {
      visitors: totalStoreVisitors,
      acquisitions: totalStoreAcquisitions,
      conversionRate: totalStoreVisitors > 0
        ? Math.round((totalStoreAcquisitions / totalStoreVisitors) * 10000) / 100
        : 0,
    },
    companyBreakdown,
  };
}
