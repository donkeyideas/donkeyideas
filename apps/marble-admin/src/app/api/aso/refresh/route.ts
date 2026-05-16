import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const APP_ID_PLAY = 'com.donkeymarble.racing';

// POST /api/aso/refresh?store=play — re-check all tracked keywords for a store
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const store = request.nextUrl.searchParams.get('store') || 'play';

    const keywords = await prisma.asoKeyword.findMany({ where: { store } });

    if (keywords.length === 0) {
      return NextResponse.json({ updated: 0 });
    }

    const results: { keyword: string; oldRank: number | null; newRank: number | null; topCompetitor: string | null }[] = [];

    if (store === 'play') {
      const gplay = require('google-play-scraper').default;

      for (const kw of keywords) {
        try {
          const searchResults = await gplay.search({ term: kw.keyword, num: 250 });
          const ourIndex = searchResults.findIndex((app: any) => app.appId === APP_ID_PLAY);
          const newRank = ourIndex >= 0 ? ourIndex + 1 : null;
          const competitor = searchResults.find((app: any) => app.appId !== APP_ID_PLAY);
          const topCompetitor = competitor ? competitor.title : null;

          const oldRank = kw.rank;
          const delta7d = oldRank !== null && newRank !== null ? oldRank - newRank : null;

          await prisma.asoKeyword.update({
            where: { id: kw.id },
            data: { rank: newRank, topCompetitor, delta7d },
          });

          results.push({ keyword: kw.keyword, oldRank, newRank, topCompetitor });
        } catch (err: any) {
          console.error(`Failed to refresh keyword "${kw.keyword}":`, err.message);
          results.push({ keyword: kw.keyword, oldRank: kw.rank, newRank: kw.rank, topCompetitor: kw.topCompetitor });
        }
      }
    } else if (store === 'ios') {
      const appStore = require('app-store-scraper');

      for (const kw of keywords) {
        try {
          const searchResults = await appStore.search({ term: kw.keyword, num: 200 });
          // App not on iOS yet
          const competitor = searchResults[0];
          const topCompetitor = competitor ? competitor.title : null;

          await prisma.asoKeyword.update({
            where: { id: kw.id },
            data: { rank: null, topCompetitor },
          });

          results.push({ keyword: kw.keyword, oldRank: kw.rank, newRank: null, topCompetitor });
        } catch (err: any) {
          console.error(`Failed to refresh keyword "${kw.keyword}":`, err.message);
          results.push({ keyword: kw.keyword, oldRank: kw.rank, newRank: kw.rank, topCompetitor: kw.topCompetitor });
        }
      }
    }

    return NextResponse.json({ updated: results.length, results });
  } catch (error: any) {
    console.error('ASO refresh error:', error);
    return NextResponse.json({ error: { message: error.message || 'Refresh failed' } }, { status: 500 });
  }
}
