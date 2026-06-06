import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * GET /api/admob/metrics
 *
 * Returns aggregated AdMob revenue/impressions for the admin Financials
 * and Overview pages. Reads only from the local `game_admob_daily_metrics`
 * table — does not hit AdMob. Hit /api/admob/sync to refresh that table.
 *
 * Returns:
 *   - yesterday's revenue + impressions (split by platform)
 *   - month-to-date totals
 *   - lifetime totals
 *   - daily series for the last 30 days (for charting)
 *   - latest syncedAt timestamp
 *   - configured: false if env vars missing (UI shows setup prompt)
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const configured = Boolean(
      process.env.ADMOB_OAUTH_CLIENT_ID &&
      process.env.ADMOB_OAUTH_CLIENT_SECRET &&
      process.env.ADMOB_OAUTH_REFRESH_TOKEN &&
      process.env.ADMOB_PUBLISHER_ID,
    );

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const start30 = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [yesterdayRows, mtdAgg, lifetimeAgg, dailyRows, latest] = await Promise.all([
      prisma.adMobDailyMetric.findMany({
        where: { date: startOfYesterday },
      }),
      prisma.adMobDailyMetric.aggregate({
        where: { date: { gte: startOfMonth } },
        _sum: { earningsUsd: true, impressions: true, clicks: true },
      }),
      prisma.adMobDailyMetric.aggregate({
        _sum: { earningsUsd: true, impressions: true, clicks: true },
      }),
      prisma.adMobDailyMetric.findMany({
        where: { date: { gte: start30 } },
        orderBy: [{ date: 'asc' }, { platform: 'asc' }],
      }),
      prisma.adMobDailyMetric.findFirst({
        orderBy: { syncedAt: 'desc' },
        select: { syncedAt: true },
      }),
    ]);

    // Yesterday: split per platform + total
    const yIos = yesterdayRows.find((r) => r.platform === 'ios');
    const yAnd = yesterdayRows.find((r) => r.platform === 'android');
    const yesterdayRevenue =
      Number(yIos?.earningsUsd ?? 0) + Number(yAnd?.earningsUsd ?? 0);
    const yesterdayImpressions =
      (yIos?.impressions ?? 0) + (yAnd?.impressions ?? 0);

    // Combine daily rows into a per-date series (sum platforms)
    const dailyMap = new Map<string, { date: string; earningsUsd: number; impressions: number; ios: number; android: number }>();
    for (const r of dailyRows) {
      const key = r.date.toISOString().slice(0, 10);
      if (!dailyMap.has(key)) dailyMap.set(key, { date: key, earningsUsd: 0, impressions: 0, ios: 0, android: 0 });
      const acc = dailyMap.get(key)!;
      acc.earningsUsd += Number(r.earningsUsd);
      acc.impressions += r.impressions;
      if (r.platform === 'ios') acc.ios += Number(r.earningsUsd);
      if (r.platform === 'android') acc.android += Number(r.earningsUsd);
    }
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      configured,
      yesterday: {
        date: startOfYesterday.toISOString().slice(0, 10),
        revenueUsd: yesterdayRevenue,
        impressions: yesterdayImpressions,
        ios: { revenueUsd: Number(yIos?.earningsUsd ?? 0), impressions: yIos?.impressions ?? 0, ecpmUsd: Number(yIos?.ecpmUsd ?? 0) },
        android: { revenueUsd: Number(yAnd?.earningsUsd ?? 0), impressions: yAnd?.impressions ?? 0, ecpmUsd: Number(yAnd?.ecpmUsd ?? 0) },
      },
      monthToDate: {
        revenueUsd: Number(mtdAgg._sum.earningsUsd ?? 0),
        impressions: mtdAgg._sum.impressions ?? 0,
        clicks: mtdAgg._sum.clicks ?? 0,
      },
      lifetime: {
        revenueUsd: Number(lifetimeAgg._sum.earningsUsd ?? 0),
        impressions: lifetimeAgg._sum.impressions ?? 0,
        clicks: lifetimeAgg._sum.clicks ?? 0,
      },
      daily,
      lastSyncedAt: latest?.syncedAt?.toISOString() ?? null,
    });
  } catch (error: any) {
    console.error('AdMob metrics error:', error);
    return NextResponse.json(
      { error: { message: error?.message ?? 'Failed to load AdMob metrics' } },
      { status: 500 },
    );
  }
}
