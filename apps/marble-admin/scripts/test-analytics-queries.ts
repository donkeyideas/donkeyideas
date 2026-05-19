/**
 * Diagnostic script — runs each query from analytics/route.ts in order,
 * wrapped in try/catch, so we can identify exactly which one throws.
 * Run with: cd apps/marble-admin && npx tsx scripts/test-analytics-queries.ts
 */

import { prisma } from '@donkey-ideas/database';
import { getSandboxAwareReport } from '../src/lib/sandboxFilter';

async function step(name: string, fn: () => Promise<unknown>) {
  process.stdout.write(`[${name}] running... `);
  try {
    const t0 = Date.now();
    const result = await fn();
    const ms = Date.now() - t0;
    const summary = Array.isArray(result)
      ? `${result.length} rows`
      : typeof result === 'object' && result !== null
        ? Object.keys(result).join(',').slice(0, 60)
        : String(result);
    console.log(`✓ ok (${ms}ms) — ${summary}`);
    return result;
  } catch (err: any) {
    console.log(`✗ FAILED`);
    console.log(`  code: ${err?.code}`);
    console.log(`  message: ${err?.message}`);
    console.log(`  stack:`);
    console.log((err?.stack ?? '').split('\n').slice(0, 5).map((l: string) => '    ' + l).join('\n'));
    throw err;
  }
}

async function main() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const twoWeeksAgo = new Date(todayStart);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  await step('sandbox.getSandboxAwareReport', () => getSandboxAwareReport());

  await step('marbleStats groupBy', () =>
    prisma.betRecord.groupBy({
      by: ['marbleId'],
      _count: { id: true },
      _sum: { betAmount: true, payout: true },
      _avg: { odds: true },
    }),
  );

  await step('raceWinnerGroups $queryRawUnsafe', () =>
    prisma.$queryRawUnsafe(
      `SELECT "finishOrder"->>0 AS winner, COUNT(*) AS wins FROM game_race_records GROUP BY winner`,
    ),
  );

  await step('totalRacesForWinRate count', () => prisma.raceRecord.count());

  await step('modeStats groupBy', () =>
    prisma.raceRecord.groupBy({ by: ['gameMode'], _count: { id: true } }),
  );

  await step('courseStats groupBy with orderBy _count', () =>
    prisma.raceRecord.groupBy({
      by: ['courseId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  );

  await step('totalBets', () => prisma.betRecord.count());
  await step('totalWins', () => prisma.betRecord.count({ where: { won: true } }));
  await step('avgBet', () => prisma.betRecord.aggregate({ _avg: { betAmount: true } }));
  await step('biggestWin', () => prisma.betRecord.aggregate({ _max: { payout: true } }));

  await step('racesThisWeek', () =>
    prisma.raceRecord.count({ where: { racedAt: { gte: weekStart } } }),
  );

  await step('racesToday', () =>
    prisma.raceRecord.count({ where: { racedAt: { gte: todayStart } } }),
  );

  await step('betsToday', () =>
    prisma.betRecord.count({ where: { placedAt: { gte: todayStart } } }),
  );

  await step('totalPlayersCount', () => prisma.gamePlayer.count());

  await step('d1EligibleRows raw', () =>
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM game_players gp WHERE gp."createdAt" + interval '2 days' <= now()`,
    ),
  );

  await step('d1RetainedRows raw', () =>
    prisma.$queryRawUnsafe(
      `SELECT COUNT(DISTINCT gp.id) as count FROM game_players gp
       WHERE gp."createdAt" + interval '2 days' <= now()
       AND EXISTS (SELECT 1 FROM game_race_records rr WHERE rr."playerId" = gp.id
         AND rr."racedAt" >= gp."createdAt" + interval '1 day'
         AND rr."racedAt" <  gp."createdAt" + interval '2 days')`,
    ),
  );

  await step('sessionAgg (try/catch in route)', async () => {
    const sessionWindowStart = new Date();
    sessionWindowStart.setDate(sessionWindowStart.getDate() - 30);
    try {
      return await prisma.gameAppSession.aggregate({
        where: { createdAt: { gte: sessionWindowStart } },
        _avg: { durationSecs: true },
        _count: { id: true },
      });
    } catch (e: any) {
      console.log(`  (route swallows this; error was: ${e?.code} ${e?.message?.slice(0, 80)})`);
      return null;
    }
  });

  await step('betDistribution counts (fixed: open-ended top bucket)', () =>
    Promise.all([
      prisma.betRecord.count({ where: { betAmount: { gte: 0, lte: 24 } } }),
      prisma.betRecord.count({ where: { betAmount: { gte: 25, lte: 50 } } }),
      prisma.betRecord.count({ where: { betAmount: { gte: 501 } } }),
    ]),
  );

  await step('retentionCurve D0', () => {
    const sql = `SELECT COUNT(*) as count FROM game_players gp
      WHERE gp."createdAt" + (($1::int + 1) * interval '1 day') <= now()`;
    return prisma.$queryRawUnsafe(sql, 0);
  });

  await step('activePlayers count', () =>
    prisma.gamePlayer.count({
      where: { OR: [{ totalRaces: { gt: 0 } }, { totalWins: { gt: 0 } }] },
    }),
  );

  await step('playersWithBets groupBy', () =>
    prisma.betRecord.groupBy({ by: ['playerId'], _count: { id: true } }),
  );

  await step('playersWithSeason groupBy', () =>
    prisma.raceRecord.groupBy({ by: ['playerId'], where: { gameMode: 'season' } }),
  );

  await step('playersWithQuickRace groupBy', () =>
    prisma.raceRecord.groupBy({ by: ['playerId'], where: { gameMode: 'quick_race' } }),
  );

  await step('playersWithTournament groupBy', () =>
    prisma.raceRecord.groupBy({ by: ['playerId'], where: { gameMode: 'tournament' } }),
  );

  const sandbox = await getSandboxAwareReport();
  const excludePurchaseTest = sandbox.excludeFilter;

  await step('playersWithPurchases groupBy (sandbox-aware)', () =>
    prisma.gamePurchase.groupBy({
      by: ['playerId'],
      where: excludePurchaseTest,
      _count: { id: true },
    }),
  );

  await step('playersWithPass count (active scoped)', () =>
    prisma.gamePlayer.count({
      where: {
        passTier: { not: 'free' },
        OR: [{ totalRaces: { gt: 0 } }, { totalWins: { gt: 0 } }],
      },
    }),
  );

  await step('playersWithNational groupBy', () =>
    prisma.raceRecord.groupBy({ by: ['playerId'], where: { gameMode: 'national_race' } }),
  );

  await step('playersWithPlayoff groupBy', () =>
    prisma.raceRecord.groupBy({ by: ['playerId'], where: { gameMode: 'playoff' } }),
  );

  await step('purchaseRepeatRate (client-side filter)', () =>
    prisma.gamePurchase.groupBy({
      by: ['playerId'],
      where: { status: 'completed', ...excludePurchaseTest },
      _count: { id: true },
    }).then((rows) => rows.filter((r) => r._count.id >= 2).length),
  );

  await step('engagementVelocity sample', () =>
    Promise.all([
      prisma.raceRecord.count({ where: { racedAt: { gte: weekStart } } }),
      prisma.raceRecord.count({ where: { racedAt: { gte: twoWeeksAgo, lt: weekStart } } }),
    ]),
  );

  console.log('\n✓ ALL QUERIES PASSED — the 500 must be elsewhere (env / build issue)');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('\n✗ DIAGNOSTIC FAILED:', err?.message);
  process.exit(1);
});
