import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const APP_ID_PLAY = 'com.donkeymarble.racing';
// const APP_ID_IOS = ''; // Not on App Store yet

// POST /api/aso/search — search a keyword on the store and find our rank
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const body = await request.json();
    const { keyword, store, track } = body;

    if (!keyword || !store) {
      return NextResponse.json({ error: { message: 'keyword and store required' } }, { status: 400 });
    }

    let rank: number | null = null;
    let topCompetitor: string | null = null;
    let totalResults = 0;

    if (store === 'play') {
      const gplay = require('google-play-scraper').default;
      const results = await gplay.search({ term: keyword, num: 250 });
      totalResults = results.length;

      const ourIndex = results.findIndex((app: any) => app.appId === APP_ID_PLAY);
      rank = ourIndex >= 0 ? ourIndex + 1 : null;

      // Top competitor = first result that isn't us
      const competitor = results.find((app: any) => app.appId !== APP_ID_PLAY);
      topCompetitor = competitor ? competitor.title : null;
    } else if (store === 'ios') {
      const appStore = require('app-store-scraper');
      const results = await appStore.search({ term: keyword, num: 200 });
      totalResults = results.length;

      // App not on iOS yet, so rank will always be null
      rank = null;
      const competitor = results[0];
      topCompetitor = competitor ? competitor.title : null;
    }

    // Optionally save/update the keyword in DB
    if (track) {
      await prisma.asoKeyword.upsert({
        where: { store_keyword: { store, keyword } },
        create: {
          store,
          keyword,
          rank,
          topCompetitor,
        },
        update: {
          rank,
          topCompetitor,
        },
      });
    }

    return NextResponse.json({ keyword, store, rank, topCompetitor, totalResults });
  } catch (error: any) {
    console.error('ASO search error:', error);
    return NextResponse.json({ error: { message: error.message || 'Search failed' } }, { status: 500 });
  }
}
