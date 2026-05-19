import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import {
  SEED_KEYWORDS,
  CACHE_KEY,
  APP_IDS,
  type KeywordPlaybookEntry,
  type PlaybookCachePayload,
} from '@/lib/keyword-playbook';
import { enrichKeywords, computeKEI } from '@/lib/keyword-enrichment';
import { checkKeywordRankingAndroid, checkKeywordRankingIOS } from '@/lib/keyword-ranker';

/* ------------------------------------------------------------------ */
/*  POST /api/aso/keywords/sync                                        */
/*                                                                     */
/*  Walks the seed keyword list and queries both stores for the live  */
/*  rank of the Marble Race Bet Game. Sequential with delay between   */
/*  calls so we don't trigger Google Play / iTunes rate limits.       */
/*                                                                     */
/*  Writes the full enriched + ranked result set to GameConfig under  */
/*  CACHE_KEY so the GET route + deck generator can read without re-  */
/*  hitting the stores.                                                */
/*                                                                     */
/*  Runtime: ~30 keywords × (300ms Android + 400ms iOS) ≈ 21 seconds. */
/*  Acceptable for an admin-triggered sync; we don't autoschedule it. */
/* ------------------------------------------------------------------ */

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel function timeout — well under

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const admin = await getUserByToken(token);
    if (!admin) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const enriched = enrichKeywords(SEED_KEYWORDS).map((e) => ({
      ...e,
      kei: computeKEI(e),
    }));

    /* Sequential probe — Android then iOS for each keyword.
     * The delays sit BETWEEN store hits to keep us under the public-API
     * rate limit. Each keyword therefore takes ~700ms total. */
    const ANDROID_DELAY_MS = 300;
    const IOS_DELAY_MS = 400;

    const entries: KeywordPlaybookEntry[] = [];
    const syncedAt = new Date().toISOString();

    for (const e of enriched) {
      const android = await checkKeywordRankingAndroid(e.keyword, APP_IDS.android);
      if (ANDROID_DELAY_MS > 0) await new Promise((r) => setTimeout(r, ANDROID_DELAY_MS));
      const ios = await checkKeywordRankingIOS(e.keyword, APP_IDS.ios);
      if (IOS_DELAY_MS > 0) await new Promise((r) => setTimeout(r, IOS_DELAY_MS));

      entries.push({
        keyword: e.keyword,
        volume: e.volume,
        difficulty: e.difficulty,
        cpc: e.cpc,
        intent: e.intent,
        kei: e.kei,
        androidRank: android.position,
        iosRank: ios.position,
        androidTopCompetitor: android.topCompetitor,
        iosTopCompetitor: ios.topCompetitor,
        lastSyncedAt: syncedAt,
      });
    }

    const payload: PlaybookCachePayload = {
      entries,
      lastSyncedAt: syncedAt,
      androidAppId: APP_IDS.android,
      iosAppId: APP_IDS.ios,
    };

    /* Upsert the cache row. Group = 'aso' so it doesn't pollute the
     * Economy page's config list (which filters to rewards/betting/
     * limits/features). */
    await prisma.gameConfig.upsert({
      where: { key: CACHE_KEY },
      create: {
        key: CACHE_KEY,
        value: JSON.stringify(payload),
        label: 'Keyword playbook cache (ASO)',
        group: 'aso',
        updatedBy: admin.id,
      },
      update: {
        value: JSON.stringify(payload),
        label: 'Keyword playbook cache (ASO)',
        updatedBy: admin.id,
      },
    });

    /* Summary stats for the response so the UI can show "12 ranked"
     * etc. without re-walking the array. */
    const androidRanked = entries.filter((e) => e.androidRank !== null).length;
    const iosRanked = entries.filter((e) => e.iosRank !== null).length;
    const topTen = entries.filter(
      (e) => (e.androidRank ?? 999) <= 10 || (e.iosRank ?? 999) <= 10,
    ).length;

    console.log(
      `[aso/keywords/sync] adminId=${admin.id} ` +
      `total=${entries.length} androidRanked=${androidRanked} iosRanked=${iosRanked} ` +
      `topTen=${topTen}`,
    );

    return NextResponse.json({
      success: true,
      lastSyncedAt: syncedAt,
      summary: {
        total: entries.length,
        androidRanked,
        iosRanked,
        topTen,
      },
      entries,
    });
  } catch (error: any) {
    console.error('ASO keywords sync error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Sync failed' } },
      { status: 500 },
    );
  }
}
