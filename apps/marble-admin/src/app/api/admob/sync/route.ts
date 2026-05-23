import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { fetchAdMobDailyReport } from '@/lib/admob';

/**
 * POST /api/admob/sync?days=N
 *
 * Pulls the last N days (default 35, max 90) of AdMob revenue + impressions
 * and upserts into `game_admob_daily_metrics`. Safe to call repeatedly —
 * the upsert keys on (date, platform) so re-runs just overwrite stale data.
 *
 * AdMob revenue lags ~24h; we re-sync the trailing window each time so
 * yesterday's final numbers replace earlier estimates.
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const url = new URL(request.url);
    const daysParam = Number(url.searchParams.get('days') ?? '35');
    const days = Math.max(1, Math.min(90, isFinite(daysParam) ? daysParam : 35));

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const rows = await fetchAdMobDailyReport(startDate, endDate);

    let upserted = 0;
    for (const r of rows) {
      await prisma.adMobDailyMetric.upsert({
        where: { date_platform: { date: new Date(r.date + 'T00:00:00Z'), platform: r.platform } },
        create: {
          date: new Date(r.date + 'T00:00:00Z'),
          platform: r.platform,
          impressions: r.impressions,
          clicks: r.clicks,
          earningsUsd: r.earningsUsd,
          ecpmUsd: r.ecpmUsd,
          matchRate: r.matchRate,
          showRate: r.showRate,
        },
        update: {
          impressions: r.impressions,
          clicks: r.clicks,
          earningsUsd: r.earningsUsd,
          ecpmUsd: r.ecpmUsd,
          matchRate: r.matchRate,
          showRate: r.showRate,
          syncedAt: new Date(),
        },
      });
      upserted += 1;
    }

    return NextResponse.json({
      ok: true,
      daysRequested: days,
      rowsUpserted: upserted,
      syncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('AdMob sync error:', error);
    return NextResponse.json(
      { error: { message: error?.message ?? 'AdMob sync failed' } },
      { status: 500 },
    );
  }
}
