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

/* ------------------------------------------------------------------ */
/*  GET /api/aso/keywords                                              */
/*                                                                     */
/*  Returns the keyword playbook with static enrichment merged in.    */
/*  Live rank columns come from the cache (last sync). If no cache    */
/*  exists, returns enrichment only — operator must click Sync.       */
/* ------------------------------------------------------------------ */

export const dynamic = 'force-dynamic';

export async function GET() {
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

    // Static enrichment first — instant, no network
    const enriched = enrichKeywords(SEED_KEYWORDS).map((e) => ({
      ...e,
      kei: computeKEI(e),
    }));

    // Load cached live ranks (if any)
    const cacheRow = await prisma.gameConfig.findUnique({ where: { key: CACHE_KEY } });
    let cache: PlaybookCachePayload | null = null;
    if (cacheRow?.value) {
      try {
        cache = JSON.parse(cacheRow.value) as PlaybookCachePayload;
      } catch {
        // Stale / corrupt cache — ignore.
      }
    }

    const cacheByKeyword = new Map<string, KeywordPlaybookEntry>();
    if (cache) {
      for (const entry of cache.entries) cacheByKeyword.set(entry.keyword, entry);
    }

    const entries: KeywordPlaybookEntry[] = enriched.map((e) => {
      const cached = cacheByKeyword.get(e.keyword);
      return {
        keyword: e.keyword,
        volume: e.volume,
        difficulty: e.difficulty,
        cpc: e.cpc,
        intent: e.intent,
        kei: e.kei,
        androidRank: cached?.androidRank ?? null,
        iosRank: cached?.iosRank ?? null,
        androidTopCompetitor: cached?.androidTopCompetitor,
        iosTopCompetitor: cached?.iosTopCompetitor,
        lastSyncedAt: cached?.lastSyncedAt,
      };
    });

    return NextResponse.json({
      entries,
      lastSyncedAt: cache?.lastSyncedAt ?? null,
      androidAppId: APP_IDS.android,
      iosAppId: APP_IDS.ios,
    });
  } catch (error: any) {
    console.error('ASO keywords GET error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch keywords' } },
      { status: 500 },
    );
  }
}
