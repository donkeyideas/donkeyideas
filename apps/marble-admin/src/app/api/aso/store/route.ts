import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const APP_ID = 'com.donkeymarble.racing';

// GET /api/aso/store?store=play — fetch latest snapshot or trigger refresh
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const store = request.nextUrl.searchParams.get('store') || 'play';

    // Return most recent snapshot
    const snapshot = await prisma.asoStoreSnapshot.findFirst({
      where: { store },
      orderBy: { fetchedAt: 'desc' },
    });

    return NextResponse.json({ snapshot });
  } catch (error: any) {
    console.error('ASO store GET error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed' } }, { status: 500 });
  }
}

// POST /api/aso/store?store=play — fetch fresh data from store
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const store = request.nextUrl.searchParams.get('store') || 'play';

    if (store === 'play') {
      const gplay = require('google-play-scraper').default || require('google-play-scraper');
      const app = await gplay.app({ appId: APP_ID });

      const snapshot = await prisma.asoStoreSnapshot.create({
        data: {
          store: 'play',
          rating: app.score ?? null,
          reviews: app.reviews ?? 0,
          installs: app.installs ?? null,
          version: app.version ?? null,
          lastUpdated: app.updated ? new Date(app.updated).toISOString() : null,
          genre: app.genre ?? null,
          developer: app.developer ?? null,
          rawData: {
            title: app.title,
            summary: app.summary,
            description: app.description?.substring(0, 500),
            icon: app.icon,
            headerImage: app.headerImage,
            screenshots: app.screenshots?.slice(0, 5),
            minInstalls: app.minInstalls,
            maxInstalls: app.maxInstalls,
            ratings: app.ratings,
            histogram: app.histogram,
            price: app.price,
            free: app.free,
            contentRating: app.contentRating,
            adSupported: app.adSupported,
            recentChanges: app.recentChanges,
          },
        },
      });

      return NextResponse.json({ snapshot });
    }

    if (store === 'ios') {
      const appStore = require('app-store-scraper');
      const app = await appStore.app({ id: APP_ID });

      const snapshot = await prisma.asoStoreSnapshot.create({
        data: {
          store: 'ios',
          rating: app.score ?? null,
          reviews: app.reviews ?? 0,
          installs: null,
          version: app.version ?? null,
          lastUpdated: app.currentVersionReleaseDate ?? null,
          genre: app.primaryGenre ?? null,
          developer: app.developer ?? null,
          rawData: {
            title: app.title,
            description: app.description?.substring(0, 500),
            icon: app.icon,
            screenshots: app.screenshots?.slice(0, 5),
            ratings: app.ratings,
            price: app.price,
            free: app.free,
            contentRating: app.contentRating,
          },
        },
      });

      return NextResponse.json({ snapshot });
    }

    return NextResponse.json({ error: { message: 'Invalid store' } }, { status: 400 });
  } catch (error: any) {
    console.error('ASO store POST error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to fetch store data' } }, { status: 500 });
  }
}
