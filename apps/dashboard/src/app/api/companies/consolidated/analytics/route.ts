import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Initialize GA4 Data API client with service account credentials
function getAnalyticsClient() {
  const clientEmail = process.env.GA_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    return null;
  }

  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
}

// Calculate date range
function getDateRange(range: string): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();

  switch (range) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '30d':
    default:
      startDate.setDate(endDate.getDate() - 30);
      break;
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

// Fetch real GA4 data for a single company
async function fetchCompanyAnalytics(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  dateRange: string
) {
  const { startDate, endDate } = getDateRange(dateRange);
  const property = `properties/${propertyId}`;

  // Fetch overview metrics
  const [overviewResponse] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    metrics: [
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
    ],
  });

  // Fetch sessions over time
  const [sessionsOverTimeResponse] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  // Fetch traffic sources
  const [trafficSourcesResponse] = await client.runReport({
    property,
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'sessionDefaultChannelGroup' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 5,
  });

  // Parse overview data
  const overviewRow = overviewResponse.rows?.[0];
  const totalUsers = parseInt(overviewRow?.metricValues?.[0]?.value || '0');
  const newUsers = parseInt(overviewRow?.metricValues?.[1]?.value || '0');
  const sessions = parseInt(overviewRow?.metricValues?.[2]?.value || '0');
  const pageviews = parseInt(overviewRow?.metricValues?.[3]?.value || '0');
  const avgSessionDuration = Math.round(parseFloat(overviewRow?.metricValues?.[4]?.value || '0'));
  const bounceRate = Math.round(parseFloat(overviewRow?.metricValues?.[5]?.value || '0') * 100);

  // Parse sessions over time
  const sessionsOverTime = (sessionsOverTimeResponse.rows || []).map((row) => {
    const dateStr = row.dimensionValues?.[0]?.value || '';
    const formattedDate = dateStr.length === 8
      ? `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
      : dateStr;
    return {
      date: formattedDate,
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
    };
  });

  // Parse traffic sources
  const trafficSources = (trafficSourcesResponse.rows || []).map((row) => ({
    source: row.dimensionValues?.[0]?.value || 'Unknown',
    sessions: parseInt(row.metricValues?.[0]?.value || '0'),
  }));

  return {
    totalUsers,
    newUsers,
    sessions,
    pageviews,
    avgSessionDuration,
    bounceRate,
    sessionsOverTime,
    trafficSources,
  };
}

// GET /api/companies/consolidated/analytics
// Returns aggregated Google Analytics data across all companies
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

    // Get all companies with their business profiles
    const companies = await prisma.company.findMany({
      where: {
        userId: user.id,
        status: 'active',
      },
      include: {
        businessProfile: true,
      },
      orderBy: { name: 'asc' },
    });

    if (companies.length === 0) {
      return NextResponse.json({
        companies: [],
        aggregated: null,
        message: 'No companies found',
      });
    }

    // Get date range from query params (default: last 30 days)
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';

    // Initialize GA client
    const client = getAnalyticsClient();

    // Fetch analytics for each company
    const companiesAnalytics = await Promise.all(
      companies.map(async (company) => {
        const gaPropertyId = company.businessProfile?.gaPropertyId;
        const hasGa = !!gaPropertyId;

        if (!hasGa) {
          return {
            id: company.id,
            name: company.name,
            logo: company.logo,
            connected: false,
            gaPropertyId: null,
            data: null,
            error: null,
          };
        }

        // If no GA client configured, return as not connected
        if (!client) {
          return {
            id: company.id,
            name: company.name,
            logo: company.logo,
            connected: false,
            gaPropertyId,
            data: null,
            error: 'Google Analytics credentials not configured',
          };
        }

        try {
          // Fetch real GA data
          const data = await fetchCompanyAnalytics(client, gaPropertyId, dateRange);
          return {
            id: company.id,
            name: company.name,
            logo: company.logo,
            connected: true,
            gaPropertyId,
            data,
            error: null,
          };
        } catch (err: any) {
          console.error(`Failed to fetch GA data for ${company.name}:`, err.message);
          return {
            id: company.id,
            name: company.name,
            logo: company.logo,
            connected: true,
            gaPropertyId,
            data: null,
            error: err.message || 'Failed to fetch analytics',
          };
        }
      })
    );

    // Aggregate data from connected companies with data
    const connectedCompanies = companiesAnalytics.filter((c) => c.connected && c.data);

    let aggregated = null;
    if (connectedCompanies.length > 0) {
      aggregated = aggregateAnalytics(connectedCompanies);
    }

    return NextResponse.json({
      dateRange,
      totalCompanies: companies.length,
      connectedCompanies: connectedCompanies.length,
      companies: companiesAnalytics,
      aggregated,
      isRealData: true,
    });
  } catch (error: any) {
    console.error('Consolidated Analytics API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch consolidated analytics' } },
      { status: 500 }
    );
  }
}

// Aggregate analytics from multiple companies
function aggregateAnalytics(companies: any[]) {
  const aggregated = {
    totalUsers: 0,
    totalNewUsers: 0,
    totalSessions: 0,
    totalPageviews: 0,
    avgBounceRate: 0,
    avgSessionDuration: 0,
    sessionsOverTime: [] as any[],
    trafficSources: {} as Record<string, number>,
    companyBreakdown: [] as any[],
  };

  // Sum up metrics
  companies.forEach((company) => {
    const data = company.data;
    aggregated.totalUsers += data.totalUsers;
    aggregated.totalNewUsers += data.newUsers;
    aggregated.totalSessions += data.sessions;
    aggregated.totalPageviews += data.pageviews;

    // Weighted averages
    aggregated.avgBounceRate += data.bounceRate * data.sessions;
    aggregated.avgSessionDuration += data.avgSessionDuration * data.sessions;

    // Aggregate traffic sources
    data.trafficSources.forEach((source: any) => {
      aggregated.trafficSources[source.source] =
        (aggregated.trafficSources[source.source] || 0) + source.sessions;
    });

    // Company breakdown for comparison
    aggregated.companyBreakdown.push({
      id: company.id,
      name: company.name,
      logo: company.logo,
      users: data.totalUsers,
      sessions: data.sessions,
      pageviews: data.pageviews,
      bounceRate: data.bounceRate,
      share: 0, // Will calculate after
    });
  });

  // Calculate weighted averages
  if (aggregated.totalSessions > 0) {
    aggregated.avgBounceRate = Math.round(aggregated.avgBounceRate / aggregated.totalSessions);
    aggregated.avgSessionDuration = Math.round(
      aggregated.avgSessionDuration / aggregated.totalSessions
    );
  }

  // Calculate share percentages
  aggregated.companyBreakdown.forEach((company) => {
    company.share =
      aggregated.totalSessions > 0
        ? Math.round((company.sessions / aggregated.totalSessions) * 100)
        : 0;
  });

  // Sort company breakdown by sessions (descending)
  aggregated.companyBreakdown.sort((a, b) => b.sessions - a.sessions);

  // Convert traffic sources to array with percentages
  const trafficSourcesArray = Object.entries(aggregated.trafficSources).map(
    ([source, sessions]) => ({
      source,
      sessions,
      percentage:
        aggregated.totalSessions > 0
          ? Math.round((sessions / aggregated.totalSessions) * 100)
          : 0,
    })
  );
  trafficSourcesArray.sort((a, b) => b.sessions - a.sessions);

  // Aggregate sessions over time
  const timeMap = new Map<string, { sessions: number; users: number }>();
  companies.forEach((company) => {
    company.data.sessionsOverTime.forEach((day: any) => {
      const existing = timeMap.get(day.date) || { sessions: 0, users: 0 };
      timeMap.set(day.date, {
        sessions: existing.sessions + day.sessions,
        users: existing.users + day.users,
      });
    });
  });

  aggregated.sessionsOverTime = Array.from(timeMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    ...aggregated,
    trafficSources: trafficSourcesArray,
  };
}
