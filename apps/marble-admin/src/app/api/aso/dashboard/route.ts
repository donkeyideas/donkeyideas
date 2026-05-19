import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { APP_IDS } from '@/lib/keyword-playbook';

const APP_ID = APP_IDS.android;
const IOS_APP_ID = APP_IDS.ios;

const COMPETITOR_IDS = [
  'bouncymarble.worldmarblerace',
  'bouncymarble.simplemarblerace',
  'com.jelles.marble.runs',
  'com.bro.marble.race',
  'com.Bluza.MarbleRaceUltimate',
];

/* iOS competitor trackIds. Empty for now — populate with numeric iTunes
 * trackIds (find via itunes.apple.com/lookup?bundleId=... or by URL) when
 * we want the same competitor cards on the App Store view. */
const IOS_COMPETITOR_IDS: string[] = [];

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
      /* iTunes Lookup API — single endpoint, comma-joined ids returns
       * all apps in one request. country=us matches the storefront the
       * marketing copy + keyword ranks target. */
      const allIds = [IOS_APP_ID, ...IOS_COMPETITOR_IDS].join(',');
      const lookupUrl = `https://itunes.apple.com/lookup?id=${allIds}&country=us`;
      const res = await fetch(lookupUrl, { cache: 'no-store' });
      const lookup = res.ok ? await res.json() : { results: [] };
      const byTrackId: Record<string, any> = {};
      for (const r of lookup.results ?? []) {
        if (r.trackId != null) byTrackId[String(r.trackId)] = r;
      }

      const mapIos = (app: any) => {
        if (!app) return null;
        const rating = typeof app.averageUserRating === 'number' ? app.averageUserRating : null;
        const ratingCount = app.userRatingCount ?? 0;
        return {
          appId: String(app.trackId),
          title: app.trackName ?? app.trackCensoredName ?? null,
          score: rating,
          ratings: ratingCount,
          reviews: ratingCount, // iTunes Lookup doesn't split ratings vs reviews
          installs: '—',          // not exposed by iTunes
          minInstalls: 0,
          maxInstalls: 0,
          version: app.version ?? null,
          updated: app.currentVersionReleaseDate ?? app.releaseDate ?? null,
          genre: app.primaryGenreName ?? null,
          developer: app.artistName ?? app.sellerName ?? null,
          icon: app.artworkUrl512 ?? app.artworkUrl100 ?? app.artworkUrl60 ?? null,
          headerImage: null,
          screenshots: (app.screenshotUrls ?? []).slice(0, 8),
          summary: null,
          description: app.description?.substring(0, 300) ?? null,
          contentRating: app.contentAdvisoryRating ?? app.trackContentRating ?? null,
          free: (app.price ?? 0) === 0,
          price: app.price ?? 0,
          histogram: {}, // not exposed by iTunes Lookup
          recentChanges: app.releaseNotes ?? null,
          adSupported: false,
        };
      };

      const ourApp = mapIos(byTrackId[IOS_APP_ID]);
      const competitors = IOS_COMPETITOR_IDS
        .map((id) => mapIos(byTrackId[id]))
        .filter(Boolean);

      if (!ourApp) {
        return NextResponse.json({
          store: 'ios',
          ourApp: null,
          competitors: [],
          notListed: true,
          message: `App ${IOS_APP_ID} not found on the App Store (US storefront)`,
          fetchedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        store: 'ios',
        ourApp,
        competitors,
        fetchedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: { message: 'Invalid store' } }, { status: 400 });
  } catch (error: any) {
    console.error('ASO dashboard error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to fetch' } }, { status: 500 });
  }
}
