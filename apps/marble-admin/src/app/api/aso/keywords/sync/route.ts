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
/*  rank of the Marble Race Bet Game. Each keyword's Android + iOS    */
/*  pair runs sequentially with delays (per-store pacing), but a small */
/*  pool of keyword workers runs in parallel so total wall-time stays  */
/*  well under the Vercel function timeout.                            */
/*                                                                     */
/*  Writes the full enriched + ranked result set to GameConfig under  */
/*  CACHE_KEY so the GET route + deck generator can read without re-  */
/*  hitting the stores.                                                */
/*                                                                     */
/*  Runtime: 30 kw / 3 concurrency × ~3s per kw ≈ 30s typical.         */
/* ------------------------------------------------------------------ */

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel Pro max — safety margin over typical ~30s

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

    const ANDROID_DELAY_MS = 300;
    const IOS_DELAY_MS = 400;
    const CONCURRENCY = 3;

    const syncedAt = new Date().toISOString();
    const entries: KeywordPlaybookEntry[] = new Array(enriched.length);

    let cursor = 0;
    const worker = async () => {
      while (true) {
        const i = cursor++;
        if (i >= enriched.length) return;
        const e = enriched[i];
        const android = await checkKeywordRankingAndroid(e.keyword, APP_IDS.android);
        if (ANDROID_DELAY_MS > 0) await new Promise((r) => setTimeout(r, ANDROID_DELAY_MS));
        const ios = await checkKeywordRankingIOS(e.keyword, APP_IDS.ios);
        if (IOS_DELAY_MS > 0) await new Promise((r) => setTimeout(r, IOS_DELAY_MS));
        entries[i] = {
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
        };
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

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
