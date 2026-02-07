import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { fetchTopKeywords, type GSCKeyword } from '@/lib/google-search-console';

// GET /api/seo-geo/keywords?dateRange=30d&limit=50
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
    const dateRange = searchParams.get('dateRange') || '30d';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Fetch fresh keywords from GSC
    let keywords: GSCKeyword[] = [];
    let gscError = null;
    try {
      keywords = await fetchTopKeywords(dateRange, limit);
    } catch (e: any) {
      gscError = e.message;
    }

    // Get historical data for position changes
    let history: any[] = [];
    try {
      const prevDate = new Date();
      prevDate.setDate(prevDate.getDate() - (dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30));
      prevDate.setHours(0, 0, 0, 0);

      history = await prisma.keywordTracking.findMany({
        where: { date: prevDate },
        select: { keyword: true, position: true, clicks: true },
      });
    } catch { /* table might not exist */ }

    // Build a map for position changes
    const prevPositions = new Map(history.map((h: any) => [h.keyword, Number(h.position)]));

    const keywordsWithChange = keywords.map(kw => ({
      ...kw,
      previousPosition: prevPositions.get(kw.keyword) || null,
      positionChange: prevPositions.has(kw.keyword)
        ? Math.round((prevPositions.get(kw.keyword)! - kw.position) * 10) / 10
        : null,
    }));

    return NextResponse.json({
      keywords: keywordsWithChange,
      total: keywordsWithChange.length,
      error: gscError,
    });
  } catch (error: any) {
    console.error('Keywords API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to load keywords' } },
      { status: 500 }
    );
  }
}
