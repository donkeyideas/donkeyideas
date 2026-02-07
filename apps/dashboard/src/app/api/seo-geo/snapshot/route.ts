import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/seo-geo/snapshot?days=90
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

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    sinceDate.setHours(0, 0, 0, 0);

    const snapshots = await prisma.seoGeoSnapshot.findMany({
      where: { date: { gte: sinceDate } },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        totalClicks: true,
        totalImpressions: true,
        avgCtr: true,
        avgPosition: true,
        performanceScore: true,
        seoScore: true,
        geoOverallScore: true,
        seoAuditScore: true,
        lcp: true,
        cls: true,
      },
    });

    return NextResponse.json({ snapshots });
  } catch (error: any) {
    console.error('Snapshot API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to load snapshots' } },
      { status: 500 }
    );
  }
}
