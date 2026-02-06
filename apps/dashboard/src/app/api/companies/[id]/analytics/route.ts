import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { fetchRealAnalytics } from '@/lib/google-analytics';

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

    const { id: companyId } = await params;

    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
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

    try {
      // Fetch real GA4 data
      const realData = await fetchRealAnalytics(gaPropertyId, dateRange);

      return NextResponse.json({
        connected: true,
        propertyId: gaPropertyId,
        dateRange,
        data: realData,
        isRealData: true,
      });
    } catch (gaError: any) {
      console.error('GA API error:', gaError);

      // Return error with specific message
      return NextResponse.json({
        connected: true,
        propertyId: gaPropertyId,
        dateRange,
        data: null,
        isRealData: false,
        error: gaError.message || 'Failed to fetch analytics data. Please check that the service account has access to this property.',
      });
    }
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch analytics' } },
      { status: 500 }
    );
  }
}
