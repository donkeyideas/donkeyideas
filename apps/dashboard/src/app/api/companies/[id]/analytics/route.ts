import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/companies/:id/analytics
// Returns Google Analytics data for a company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        businessProfile: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }

    const gaPropertyId = company.businessProfile?.gaPropertyId;

    if (!gaPropertyId) {
      return NextResponse.json({
        connected: false,
        message: 'Google Analytics not configured. Add your GA4 Property ID in Business Profile.',
        data: null,
      });
    }

    // Get date range from query params (default: last 30 days)
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';

    // TODO: Replace with actual Google Analytics Data API call
    // For now, return demo data structure
    // When implementing real API:
    // 1. Import @google-analytics/data
    // 2. Use OAuth2 or service account credentials
    // 3. Call runReport with propertyId

    const demoData = generateDemoAnalytics(dateRange, company.name);

    return NextResponse.json({
      connected: true,
      propertyId: gaPropertyId,
      dateRange,
      data: demoData,
    });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch analytics' } },
      { status: 500 }
    );
  }
}

// Generate demo analytics data
function generateDemoAnalytics(dateRange: string, companyName: string) {
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
    const variance = 0.7 + Math.random() * 0.6; // 70% to 130% variance
    sessionsOverTime.push({
      date: date.toISOString().split('T')[0],
      sessions: Math.floor((baseSessions / days) * variance),
      users: Math.floor((baseUsers / days) * variance),
      pageviews: Math.floor((basePageviews / days) * variance),
    });
  }

  return {
    overview: {
      totalUsers: baseUsers,
      newUsers: Math.floor(baseUsers * 0.6),
      returningUsers: Math.floor(baseUsers * 0.4),
      sessions: baseSessions,
      pageviews: basePageviews,
      avgSessionDuration: Math.floor(120 + Math.random() * 180), // 2-5 minutes in seconds
      bounceRate: Math.floor(35 + Math.random() * 25), // 35-60%
      engagementRate: Math.floor(40 + Math.random() * 30), // 40-70%
    },
    sessionsOverTime,
    trafficSources: [
      { source: 'Organic Search', sessions: Math.floor(baseSessions * 0.35), percentage: 35 },
      { source: 'Direct', sessions: Math.floor(baseSessions * 0.28), percentage: 28 },
      { source: 'Social', sessions: Math.floor(baseSessions * 0.18), percentage: 18 },
      { source: 'Referral', sessions: Math.floor(baseSessions * 0.12), percentage: 12 },
      { source: 'Email', sessions: Math.floor(baseSessions * 0.07), percentage: 7 },
    ],
    topPages: [
      { page: '/', title: 'Home', pageviews: Math.floor(basePageviews * 0.25), avgTimeOnPage: 45 },
      { page: '/products', title: 'Products', pageviews: Math.floor(basePageviews * 0.18), avgTimeOnPage: 120 },
      { page: '/about', title: 'About Us', pageviews: Math.floor(basePageviews * 0.12), avgTimeOnPage: 90 },
      { page: '/contact', title: 'Contact', pageviews: Math.floor(basePageviews * 0.10), avgTimeOnPage: 60 },
      { page: '/blog', title: 'Blog', pageviews: Math.floor(basePageviews * 0.08), avgTimeOnPage: 180 },
    ],
    devices: [
      { device: 'Desktop', sessions: Math.floor(baseSessions * 0.55), percentage: 55 },
      { device: 'Mobile', sessions: Math.floor(baseSessions * 0.38), percentage: 38 },
      { device: 'Tablet', sessions: Math.floor(baseSessions * 0.07), percentage: 7 },
    ],
    countries: [
      { country: 'United States', sessions: Math.floor(baseSessions * 0.40), percentage: 40 },
      { country: 'United Kingdom', sessions: Math.floor(baseSessions * 0.15), percentage: 15 },
      { country: 'Canada', sessions: Math.floor(baseSessions * 0.10), percentage: 10 },
      { country: 'Germany', sessions: Math.floor(baseSessions * 0.08), percentage: 8 },
      { country: 'Australia', sessions: Math.floor(baseSessions * 0.07), percentage: 7 },
    ],
  };
}
