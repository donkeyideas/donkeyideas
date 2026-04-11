import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { fetchAppStoreData } from '@/lib/app-store-connect';

// GET /api/companies/:id/app-store
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

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: user.id },
      include: { businessProfile: true },
    });

    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }

    const ascBundleId = company.businessProfile?.ascBundleId;

    if (!ascBundleId) {
      return NextResponse.json({
        connected: false,
        message: 'App Store Connect not configured. Add your iOS bundle ID in Business Profile.',
        data: null,
      });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';

    try {
      const data = await fetchAppStoreData(ascBundleId, dateRange);

      return NextResponse.json({
        connected: true,
        bundleId: ascBundleId,
        dateRange,
        data,
        isRealData: true,
      });
    } catch (ascError: any) {
      console.error('App Store Connect API error:', ascError);

      return NextResponse.json({
        connected: true,
        bundleId: ascBundleId,
        dateRange,
        data: null,
        isRealData: false,
        error: ascError.message || 'Failed to fetch App Store data. Please check your configuration.',
      });
    }
  } catch (error: any) {
    console.error('App Store API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch App Store data' } },
      { status: 500 }
    );
  }
}
