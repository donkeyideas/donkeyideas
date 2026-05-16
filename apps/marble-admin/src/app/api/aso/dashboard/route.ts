import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const APP_ID = 'com.donkeymarble.racing';

const COMPETITOR_IDS = [
  'bouncymarble.worldmarblerace',
  'bouncymarble.simplemarblerace',
  'com.jelles.marble.runs',
  'com.bro.marble.race',
  'com.Bluza.MarbleRaceUltimate',
];

// GET /api/aso/dashboard?store=play — fetch our app + competitors in one call
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const store = request.nextUrl.searchParams.get('store') || 'play';

    if (store === 'play') {
      const gplay = require('google-play-scraper').default || require('google-play-scraper');

      // Fetch our app and all competitors in parallel
      const [ourApp, ...competitorApps] = await Promise.all([
        gplay.app({ appId: APP_ID }).catch(() => null),
        ...COMPETITOR_IDS.map((id: string) => gplay.app({ appId: id }).catch(() => null)),
      ]);

      const mapApp = (app: any) => {
        if (!app) return null;
        return {
          appId: app.appId,
          title: app.title,
          score: app.score ?? null,
          ratings: app.ratings ?? 0,
          reviews: app.reviews ?? 0,
          installs: app.installs ?? '0',
          minInstalls: app.minInstalls ?? 0,
          maxInstalls: app.maxInstalls ?? 0,
          version: app.version ?? null,
          updated: app.updated ? new Date(app.updated).toISOString() : null,
          genre: app.genre ?? null,
          developer: app.developer ?? null,
          icon: app.icon ?? null,
          headerImage: app.headerImage ?? null,
          screenshots: app.screenshots?.slice(0, 8) ?? [],
          summary: app.summary ?? null,
          description: app.description?.substring(0, 300) ?? null,
          contentRating: app.contentRating ?? null,
          free: app.free ?? true,
          price: app.price ?? 0,
          histogram: app.histogram ?? {},
          recentChanges: app.recentChanges ?? null,
          adSupported: app.adSupported ?? false,
        };
      };

      return NextResponse.json({
        store: 'play',
        ourApp: mapApp(ourApp),
        competitors: competitorApps.map(mapApp).filter(Boolean),
        fetchedAt: new Date().toISOString(),
      });
    }

    if (store === 'ios') {
      // App not on App Store yet
      return NextResponse.json({
        store: 'ios',
        ourApp: null,
        competitors: [],
        notListed: true,
        message: 'App not yet listed on the App Store',
        fetchedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: { message: 'Invalid store' } }, { status: 400 });
  } catch (error: any) {
    console.error('ASO dashboard error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to fetch' } }, { status: 500 });
  }
}
