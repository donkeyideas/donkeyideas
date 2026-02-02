import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

    // Generate analytics for each company
    const companiesAnalytics = companies.map((company) => {
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
        };
      }

      // TODO: Replace with actual Google Analytics Data API calls
      // For now, generate demo data
      const data = generateCompanyAnalytics(dateRange, company.name);

      return {
        id: company.id,
        name: company.name,
        logo: company.logo,
        connected: true,
        gaPropertyId,
        data,
      };
    });

    // Aggregate data from connected companies
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
    });
  } catch (error: any) {
    console.error('Consolidated Analytics API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch consolidated analytics' } },
      { status: 500 }
    );
  }
}

// Generate analytics data for a single company
function generateCompanyAnalytics(dateRange: string, companyName: string) {
  const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;

  // Generate random but consistent data based on company name
  const seed = companyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseUsers = (seed % 500) + 100;
  const baseSessions = Math.floor(baseUsers * 1.3);
  const basePageviews = Math.floor(baseSessions * 2.5);

  // Generate daily sessions data
  const sessionsOverTime = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const variance = 0.7 + Math.random() * 0.6;
    sessionsOverTime.push({
      date: date.toISOString().split('T')[0],
      sessions: Math.floor((baseSessions / days) * variance),
      users: Math.floor((baseUsers / days) * variance),
    });
  }

  return {
    totalUsers: baseUsers,
    newUsers: Math.floor(baseUsers * 0.6),
    sessions: baseSessions,
    pageviews: basePageviews,
    avgSessionDuration: Math.floor(120 + Math.random() * 180),
    bounceRate: Math.floor(35 + Math.random() * 25),
    sessionsOverTime,
    trafficSources: [
      { source: 'Organic Search', sessions: Math.floor(baseSessions * 0.35) },
      { source: 'Direct', sessions: Math.floor(baseSessions * 0.28) },
      { source: 'Social', sessions: Math.floor(baseSessions * 0.18) },
      { source: 'Referral', sessions: Math.floor(baseSessions * 0.12) },
      { source: 'Email', sessions: Math.floor(baseSessions * 0.07) },
    ],
  };
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
