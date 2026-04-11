import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { fetchPlayStoreData } from '@/lib/google-play';

// GET /api/companies/:id/play-store
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

    const gpPackageName = company.businessProfile?.gpPackageName;

    if (!gpPackageName) {
      return NextResponse.json({
        connected: false,
        message: 'Google Play Console not configured. Add your Android package name in Business Profile.',
        data: null,
      });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';

    try {
      const data = await fetchPlayStoreData(gpPackageName, dateRange);

      return NextResponse.json({
        connected: true,
        packageName: gpPackageName,
        dateRange,
        data,
        isRealData: true,
      });
    } catch (gpError: any) {
      console.error('Play Store API error:', gpError);

      return NextResponse.json({
        connected: true,
        packageName: gpPackageName,
        dateRange,
        data: null,
        isRealData: false,
        error: gpError.message || 'Failed to fetch Play Store data. Please check that the service account has access.',
      });
    }
  } catch (error: any) {
    console.error('Play Store API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch Play Store data' } },
      { status: 500 }
    );
  }
}
