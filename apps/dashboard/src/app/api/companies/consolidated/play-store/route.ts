import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { fetchPlayStoreData, getPlayClients } from '@/lib/google-play';

// Throttle concurrent requests
async function throttledFetch<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task()
      .then((value) => {
        results.push({ status: 'fulfilled', value });
      })
      .catch((reason) => {
        results.push({ status: 'rejected', reason });
      });

    executing.push(p);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Clean up resolved promises
      const resolvedIndices: number[] = [];
      for (let i = 0; i < executing.length; i++) {
        const settled = await Promise.race([
          executing[i].then(() => true),
          Promise.resolve(false),
        ]);
        if (settled) resolvedIndices.push(i);
      }
      for (let i = resolvedIndices.length - 1; i >= 0; i--) {
        executing.splice(resolvedIndices[i], 1);
      }
    }
  }

  await Promise.all(executing);
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid session' } },
        { status: 401 }
      );
    }

    const companies = await prisma.company.findMany({
      where: { userId: user.id, status: 'active' },
      include: { businessProfile: true },
      orderBy: { name: 'asc' },
    });

    if (companies.length === 0) {
      return NextResponse.json({
        companies: [],
        aggregated: null,
        message: 'No companies found',
      });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const clients = getPlayClients();

    const companiesPlayData = await Promise.all(
      companies.map(async (company) => {
        const gpPackageName = company.businessProfile?.gpPackageName;

        if (!gpPackageName) {
          return {
            id: company.id,
            name: company.name,
            logo: company.logo,
            connected: false,
            packageName: null,
            data: null,
            error: null,
          };
        }

        if (!clients) {
          return {
            id: company.id,
            name: company.name,
            logo: company.logo,
            connected: true,
            packageName: gpPackageName,
            data: null,
            error: 'Google Play Console server credentials not configured',
          };
        }

        try {
          const data = await fetchPlayStoreData(gpPackageName, dateRange, dateFrom, dateTo);
          return {
            id: company.id,
            name: company.name,
            logo: company.logo,
            connected: true,
            packageName: gpPackageName,
            data,
            error: null,
          };
        } catch (err: any) {
          console.error(`Failed to fetch Play Store data for ${company.name}:`, err.message);
          return {
            id: company.id,
            name: company.name,
            logo: company.logo,
            connected: true,
            packageName: gpPackageName,
            data: null,
            error: err.message || 'Failed to fetch Play Store data',
          };
        }
      })
    );

    const connectedCompanies = companiesPlayData.filter((c) => c.connected && c.data);

    let aggregated = null;
    if (connectedCompanies.length > 0) {
      aggregated = aggregatePlayData(connectedCompanies);
    }

    return NextResponse.json({
      dateRange,
      totalCompanies: companies.length,
      connectedCompanies: connectedCompanies.length,
      companies: companiesPlayData,
      aggregated,
      isRealData: true,
    });
  } catch (error: any) {
    console.error('Consolidated Play Store API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch consolidated Play Store data' } },
      { status: 500 }
    );
  }
}

function aggregatePlayData(companies: any[]) {
  let totalActiveDevices = 0;
  let totalReviews = 0;
  let weightedCrashRate = 0;
  let weightedAnrRate = 0;
  let weightedRating = 0;
  let totalWeight = 0;
  let totalInstalls = 0;
  let totalDailyInstalls = 0;
  let totalDailyUninstalls = 0;
  let totalDailyUpdates = 0;
  let totalStoreVisitors = 0;
  let totalStoreAcquisitions = 0;

  const companyBreakdown: any[] = [];

  companies.forEach((company) => {
    const { overview } = company.data;
    const weight = overview.activeDevices || 1;

    totalActiveDevices += overview.activeDevices;
    totalReviews += overview.totalReviews;
    weightedCrashRate += overview.crashRate * weight;
    weightedAnrRate += overview.anrRate * weight;
    weightedRating += overview.averageRating * weight;
    totalWeight += weight;

    // GCS install metrics
    totalInstalls += overview.totalInstalls || 0;
    totalDailyInstalls += overview.dailyInstalls || 0;
    totalDailyUninstalls += overview.dailyUninstalls || 0;
    totalDailyUpdates += overview.dailyUpdates || 0;

    // Store listing metrics
    const storeListing = company.data.storeListing;
    if (storeListing) {
      totalStoreVisitors += storeListing.visitors || 0;
      totalStoreAcquisitions += storeListing.acquisitions || 0;
    }

    companyBreakdown.push({
      id: company.id,
      name: company.name,
      logo: company.logo,
      packageName: company.packageName,
      crashRate: overview.crashRate,
      anrRate: overview.anrRate,
      activeDevices: overview.activeDevices,
      rating: overview.averageRating,
      reviews: overview.totalReviews,
      totalInstalls: overview.totalInstalls || 0,
      dailyInstalls: overview.dailyInstalls || 0,
      dailyUninstalls: overview.dailyUninstalls || 0,
      storeVisitors: storeListing?.visitors || 0,
      storeAcquisitions: storeListing?.acquisitions || 0,
      conversionRate: storeListing?.conversionRate || 0,
      share: 0,
    });
  });

  // Calculate weighted averages
  const avgCrashRate = totalWeight > 0 ? weightedCrashRate / totalWeight : 0;
  const avgAnrRate = totalWeight > 0 ? weightedAnrRate / totalWeight : 0;
  const avgRating = totalWeight > 0 ? weightedRating / totalWeight : 0;

  // Calculate shares
  companyBreakdown.forEach((c) => {
    c.share = totalActiveDevices > 0
      ? Math.round((c.activeDevices / totalActiveDevices) * 100)
      : 0;
  });

  companyBreakdown.sort((a, b) => b.activeDevices - a.activeDevices);

  // Merge vitals time series
  const timeMap = new Map<string, { crashRate: number; anrRate: number; weight: number }>();
  companies.forEach((company) => {
    const weight = company.data.overview.activeDevices || 1;
    (company.data.vitalsTimeSeries || []).forEach((day: any) => {
      const existing = timeMap.get(day.date) || { crashRate: 0, anrRate: 0, weight: 0 };
      timeMap.set(day.date, {
        crashRate: existing.crashRate + day.crashRate * weight,
        anrRate: existing.anrRate + day.anrRate * weight,
        weight: existing.weight + weight,
      });
    });
  });

  const vitalsTimeSeries = Array.from(timeMap.entries())
    .map(([date, data]) => ({
      date,
      crashRate: data.weight > 0 ? data.crashRate / data.weight : 0,
      anrRate: data.weight > 0 ? data.anrRate / data.weight : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

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
    .map(([date, data]) => ({
      date,
      installs: data.installs,
      uninstalls: data.uninstalls,
      updates: data.updates,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    overview: {
      crashRate: Math.round(avgCrashRate * 1000) / 1000,
      anrRate: Math.round(avgAnrRate * 1000) / 1000,
      activeDevices: totalActiveDevices,
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews,
      totalInstalls,
      dailyInstalls: totalDailyInstalls,
      dailyUninstalls: totalDailyUninstalls,
      dailyUpdates: totalDailyUpdates,
    },
    vitalsTimeSeries,
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
