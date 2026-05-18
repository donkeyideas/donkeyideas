import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const ALL_MARBLES = ['dash', 'spike', 'rocky', 'lucky', 'frosty', 'nova', 'shadow', 'aqua'];

const MARBLE_COLORS: Record<string, string> = {
  dash: '#e74c3c',
  spike: '#f39c12',
  rocky: '#8b4513',
  lucky: '#2ecc71',
  frosty: '#6ec1ff',
  nova: '#9b59b6',
  shadow: '#2c3e50',
  aqua: '#1abc9c',
};

const MARBLE_GRADIENTS: Record<string, string> = {
  dash: 'radial-gradient(circle at 35% 30%, #ff6b35, #cc4400)',
  lucky: 'radial-gradient(circle at 35% 30%, #ffd700, #daa520)',
  rocky: 'radial-gradient(circle at 35% 30%, #8b4513, #5c2d0e)',
  spike: 'radial-gradient(circle at 35% 30%, #4ecdc4, #2a9d8f)',
  aqua: 'radial-gradient(circle at 35% 30%, #00ced1, #008b8b)',
  nova: 'radial-gradient(circle at 35% 30%, #ff69b4, #c71585)',
  shadow: 'radial-gradient(circle at 35% 30%, #6a0dad, #2d0050)',
  frosty: 'radial-gradient(circle at 35% 30%, #87ceeb, #4169e1)',
};

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // Per-marble betting stats (used by Betting Analytics card for Most/Least
    // Bet-On). These are bet-side numbers, NOT race outcomes.
    const marbleStats = await prisma.betRecord.groupBy({
      by: ['marbleId'],
      _count: { id: true },
      _sum: { betAmount: true, payout: true },
      _avg: { odds: true },
    });

    // True marble win rate = % of races where the marble finished first.
    // finishOrder is a JSON array of marble ids; index 0 is the winner.
    // Previously this card derived "wins" from BetRecord.won, which is
    // actually the bet-hit rate — marbles that nobody bets on (Shadow, Aqua)
    // always reported 0% even when they were winning races.
    const raceWinnerGroups = await prisma.$queryRawUnsafe<{ winner: string | null; wins: bigint }[]>(
      `SELECT "finishOrder"->>0 AS winner, COUNT(*) AS wins
       FROM game_race_records
       GROUP BY winner`,
    );
    const totalRacesForWinRate = await prisma.raceRecord.count();
    const raceWinMap: Record<string, number> = {};
    for (const row of raceWinnerGroups) {
      if (row.winner) raceWinMap[row.winner] = Number(row.wins);
    }

    // Game mode distribution
    const modeStats = await prisma.raceRecord.groupBy({
      by: ['gameMode'],
      _count: { id: true },
    });

    // Course popularity (top 10)
    const courseStats = await prisma.raceRecord.groupBy({
      by: ['courseId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Betting stats
    const [totalBets, totalWins, avgBet, biggestWin] = await Promise.all([
      prisma.betRecord.count(),
      prisma.betRecord.count({ where: { won: true } }),
      prisma.betRecord.aggregate({ _avg: { betAmount: true } }),
      prisma.betRecord.aggregate({ _max: { payout: true } }),
    ]);

    // Races in last 7 days
    const racesThisWeek = await prisma.raceRecord.count({
      where: { racedAt: { gte: weekStart } },
    });

    // --- KPIs ---
    const [racesToday, betsToday, totalPlayersCount] = await Promise.all([
      prisma.raceRecord.count({ where: { racedAt: { gte: todayStart } } }),
      prisma.betRecord.count({ where: { placedAt: { gte: todayStart } } }),
      prisma.gamePlayer.count(),
    ]);

    // D1 Retention KPI: true cohort window — player raced in [D1, D2)
    // after install. Mirrors the retention curve math below.
    const [d1EligibleRows, d1RetainedRows] = await Promise.all([
      prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count
         FROM game_players gp
         WHERE gp."createdAt" + interval '2 days' <= now()`,
      ),
      prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(DISTINCT gp.id) as count
         FROM game_players gp
         WHERE gp."createdAt" + interval '2 days' <= now()
         AND EXISTS (
           SELECT 1 FROM game_race_records rr
           WHERE rr."playerId" = gp.id
           AND rr."racedAt" >= gp."createdAt" + interval '1 day'
           AND rr."racedAt" <  gp."createdAt" + interval '2 days'
         )`,
      ),
    ]);
    const eligibleForD1 = Number(d1EligibleRows[0]?.count ?? 0);
    const d1RetainedCount = Number(d1RetainedRows[0]?.count ?? 0);
    const d1Retention = eligibleForD1 > 0 ? Math.round((d1RetainedCount / eligibleForD1) * 100) : 0;

    // Avg Session length over the last 30 days, derived from real
    // foreground/background sessions recorded by the mobile tracker.
    const sessionWindowStart = new Date();
    sessionWindowStart.setDate(sessionWindowStart.getDate() - 30);
    const sessionAgg = await prisma.gameAppSession.aggregate({
      where: { createdAt: { gte: sessionWindowStart } },
      _avg: { durationSecs: true },
      _count: { id: true },
    });
    const avgSessSecs = Math.round(Number(sessionAgg._avg.durationSecs ?? 0));
    const avgSession = sessionAgg._count.id === 0
      ? 'N/A'
      : avgSessSecs >= 60
        ? `${Math.floor(avgSessSecs / 60)}m ${avgSessSecs % 60}s`
        : `${avgSessSecs}s`;

    const kpis = {
      racesToday,
      betsToday,
      avgSession,
      d1Retention,
    };

    // --- Bet Distribution ---
    const betRanges = [
      { label: '25-50', min: 25, max: 50 },
      { label: '51-100', min: 51, max: 100 },
      { label: '101-250', min: 101, max: 250 },
      { label: '251-500', min: 251, max: 500 },
    ];

    const betDistributionResults = await Promise.all(
      betRanges.map((range: any) =>
        prisma.betRecord.count({
          where: { betAmount: { gte: range.min, lte: range.max } },
        }),
      ),
    );

    const totalBetsForDist = betDistributionResults.reduce((s: number, c: number) => s + c, 0);
    const betDistribution = betRanges.map((range: any, i: number) => ({
      label: range.label,
      count: betDistributionResults[i],
      pct: totalBetsForDist > 0 ? Math.round((betDistributionResults[i] / totalBetsForDist) * 100) : 0,
    }));

    // --- Retention Curve (true cohort window) ---
    // For day N, count players who had ANY race in the 24-hour window
    // starting at createdAt + N days. Denominator is players whose cohort
    // window has fully elapsed (createdAt + N + 1 days <= now). This is
    // strict cohort retention, not the looser "ever active after N days"
    // proxy used previously, which overstated retention by counting any
    // future activity as a hit.
    const retentionDays = [0, 1, 3, 7, 14, 30, 60, 90];
    const retentionLabels = ['D0', 'D1', 'D3', 'D7', 'D14', 'D30', 'D60', 'D90'];

    const retentionCurve = await Promise.all(
      retentionDays.map(async (days: number, i: number) => {
        // D0 = "did the player race on their install day at all". Same query
        // structure as the others, just with a 0-day offset.
        const eligibleSql = `SELECT COUNT(*) as count
          FROM game_players gp
          WHERE gp."createdAt" + (($1::int + 1) * interval '1 day') <= now()`;
        const retainedSql = `SELECT COUNT(DISTINCT gp.id) as count
          FROM game_players gp
          WHERE gp."createdAt" + (($1::int + 1) * interval '1 day') <= now()
          AND EXISTS (
            SELECT 1 FROM game_race_records rr
            WHERE rr."playerId" = gp.id
            AND rr."racedAt" >= gp."createdAt" + ($1::int * interval '1 day')
            AND rr."racedAt" <  gp."createdAt" + (($1::int + 1) * interval '1 day')
          )`;

        const [eligibleRows, retainedRows] = await Promise.all([
          prisma.$queryRawUnsafe<{ count: bigint }[]>(eligibleSql, days),
          prisma.$queryRawUnsafe<{ count: bigint }[]>(retainedSql, days),
        ]);

        const eligible = Number(eligibleRows[0]?.count ?? 0);
        const retained = Number(retainedRows[0]?.count ?? 0);
        if (eligible === 0) {
          return { label: retentionLabels[i], pct: 0, value: '—' };
        }
        const pct = Math.round((retained / eligible) * 100);
        return { label: retentionLabels[i], pct, value: `${pct}%` };
      }),
    );

    // --- Feature Adoption ---
    // Active players = those with at least 1 race or bet
    const activePlayers = await prisma.gamePlayer.count({
      where: {
        OR: [{ totalRaces: { gt: 0 } }, { totalWins: { gt: 0 } }],
      },
    });
    const activeBase = activePlayers || 1; // avoid div by 0

    // Daily Betting: players with at least 1 BetRecord
    const playersWithBets = await prisma.betRecord.groupBy({
      by: ['playerId'],
      _count: { id: true },
    });

    // Season Mode: players with at least 1 RaceRecord where gameMode='season'
    const playersWithSeason = await prisma.raceRecord.groupBy({
      by: ['playerId'],
      where: { gameMode: 'season' },
    });

    // Quick Race
    const playersWithQuickRace = await prisma.raceRecord.groupBy({
      by: ['playerId'],
      where: { gameMode: 'quick_race' },
    });

    // Tournaments
    const playersWithTournament = await prisma.raceRecord.groupBy({
      by: ['playerId'],
      where: { gameMode: 'tournament' },
    });

    // Coin Purchases
    const playersWithPurchases = await prisma.gamePurchase.groupBy({
      by: ['playerId'],
      _count: { id: true },
    });

    // Season Pass (passTier != 'free')
    const playersWithPass = await prisma.gamePlayer.count({
      where: { passTier: { not: 'free' } },
    });

    // National Races
    const playersWithNational = await prisma.raceRecord.groupBy({
      by: ['playerId'],
      where: { gameMode: 'national_race' },
    });

    // Playoffs
    const playersWithPlayoff = await prisma.raceRecord.groupBy({
      by: ['playerId'],
      where: { gameMode: 'playoff' },
    });

    // Each metric is "% of active players who have used the feature at least
    // once, lifetime". The "Daily Betting" label previously implied a 24h
    // window which didn't match the underlying lifetime aggregation; renamed
    // to "Placed a Bet" to match the math.
    const featureAdoption = [
      { name: 'Placed a Bet', pct: Math.round((playersWithBets.length / activeBase) * 100), barColor: '#2ecc71', textColor: 'text-marble-green' },
      { name: 'Season Mode', pct: Math.round((playersWithSeason.length / activeBase) * 100), barColor: '#ffc220', textColor: 'text-gold' },
      { name: 'Quick Race', pct: Math.round((playersWithQuickRace.length / activeBase) * 100), barColor: '#ffc220', textColor: 'text-gold' },
      { name: 'Tournaments', pct: Math.round((playersWithTournament.length / activeBase) * 100), barColor: '#6ec1ff', textColor: 'text-marble-blue' },
      { name: 'Coin Purchases', pct: Math.round((playersWithPurchases.length / activeBase) * 100), barColor: '#ffc220', textColor: 'text-gold' },
      { name: 'Season Pass', pct: Math.round((playersWithPass / activeBase) * 100), barColor: '#6ec1ff', textColor: 'text-marble-blue' },
      { name: 'National Races', pct: Math.round((playersWithNational.length / activeBase) * 100), barColor: '#c39bd3', textColor: 'text-[#c39bd3]' },
      { name: 'Playoffs', pct: Math.round((playersWithPlayoff.length / activeBase) * 100), barColor: '#c39bd3', textColor: 'text-[#c39bd3]' },
    ];

    // --- Marble win rates: always show all 8, merge DB data ---
    const statsMap: Record<string, { bets: number; wagered: number; paidOut: number; avgOdds: number }> = {};
    marbleStats.forEach((m) => {
      statsMap[m.marbleId] = {
        bets: m._count.id,
        wagered: Number(m._sum.betAmount ?? 0),
        paidOut: Number(m._sum.payout ?? 0),
        avgOdds: Number(m._avg.odds ?? 0),
      };
    });

    const marbleWinRates = ALL_MARBLES
      .map((id) => {
        const s = statsMap[id] || { bets: 0, wagered: 0, paidOut: 0, avgOdds: 0 };
        const raceWins = raceWinMap[id] ?? 0;
        return {
          marbleId: id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          totalBets: s.bets,
          totalWagered: s.wagered,
          totalPaidOut: s.paidOut,
          avgOdds: s.avgOdds,
          wins: raceWins,
          winRate: totalRacesForWinRate > 0
            ? Math.round((raceWins / totalRacesForWinRate) * 100)
            : 0,
          color: MARBLE_COLORS[id] || '#ffffff',
          grad: MARBLE_GRADIENTS[id] || 'radial-gradient(circle at 35% 30%, #888, #555)',
        };
      })
      .sort((a, b) => b.winRate - a.winRate || b.totalBets - a.totalBets);

    // --- Funnel Analytics ---
    const playersWithRaces = await prisma.gamePlayer.count({ where: { totalRaces: { gt: 0 } } });
    const playersWithBetsCount = playersWithBets.length;
    const playersWithPurchasesCount = playersWithPurchases.length;

    const funnel = [
      { step: 'Installed', count: totalPlayersCount, pct: 100 },
      { step: 'First Race', count: playersWithRaces, pct: totalPlayersCount > 0 ? Math.round((playersWithRaces / totalPlayersCount) * 100) : 0 },
      { step: 'First Bet', count: playersWithBetsCount, pct: totalPlayersCount > 0 ? Math.round((playersWithBetsCount / totalPlayersCount) * 100) : 0 },
      { step: 'First Purchase', count: playersWithPurchasesCount, pct: totalPlayersCount > 0 ? Math.round((playersWithPurchasesCount / totalPlayersCount) * 100) : 0 },
    ];

    // --- Player Segments ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Segments are mutually exclusive: a player belongs to exactly one bucket.
    // Spend tiers (Whale/Dolphin/Minnow/Free) require lastActiveAt within the
    // 30-day window; anyone inactive 30+ days lands in Churned regardless of
    // spend. Without the active filter on the spend tiers, a $50 whale who
    // hasn't opened the app in two months would be counted in BOTH Whale and
    // Churned, and the segment bar would sum to >100% of unique players.
    const activeWhere = { lastActiveAt: { gte: thirtyDaysAgo }, status: { not: 'banned' as const } };
    const [whaleCount, dolphinCount, minnowCount, freeCount, churnedCount] = await Promise.all([
      // Whale: totalSpent > $20, active
      prisma.gamePlayer.count({ where: { ...activeWhere, totalSpent: { gt: 20 } } }),
      // Dolphin: totalSpent $5–$20, active
      prisma.gamePlayer.count({ where: { ...activeWhere, totalSpent: { gte: 5, lte: 20 } } }),
      // Minnow: totalSpent $0.01–$4.99, active
      prisma.gamePlayer.count({ where: { ...activeWhere, totalSpent: { gt: 0, lt: 5 } } }),
      // Free: totalSpent = 0, active in last 30 days
      prisma.gamePlayer.count({ where: { ...activeWhere, totalSpent: { equals: 0 } } }),
      // Churned: inactive 30+ days (any spend level)
      prisma.gamePlayer.count({ where: { lastActiveAt: { lt: thirtyDaysAgo }, status: { not: 'banned' } } }),
    ]);

    const segments = [
      { name: 'Whale', count: whaleCount, color: '#ffc220', desc: '$20+ spent' },
      { name: 'Dolphin', count: dolphinCount, color: '#6ec1ff', desc: '$5–$20 spent' },
      { name: 'Minnow', count: minnowCount, color: '#2ecc71', desc: '<$5 spent' },
      { name: 'Free', count: freeCount, color: '#9b59b6', desc: 'No purchases, active' },
      { name: 'Churned', count: churnedCount, color: '#e74c3c', desc: 'Inactive 30+ days' },
    ];

    // --- Revenue by week (last 8 weeks) ---
    const revenueWeeks: { week: string; revenue: number; count: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      const wStart = new Date();
      wStart.setDate(wStart.getDate() - (w + 1) * 7);
      const wEnd = new Date();
      wEnd.setDate(wEnd.getDate() - w * 7);
      const agg = await prisma.gamePurchase.aggregate({
        where: { purchasedAt: { gte: wStart, lt: wEnd }, status: 'completed' },
        _sum: { priceUsd: true },
        _count: { id: true },
      });
      const weekLabel = `${(wStart.getMonth() + 1)}/${wStart.getDate()}`;
      revenueWeeks.push({
        week: weekLabel,
        revenue: Number(agg._sum.priceUsd ?? 0),
        count: agg._count.id,
      });
    }

    // --- Engagement & Health Metrics ---
    const twoWeeksAgo = new Date(todayStart);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [
      spectatorRaces,
      totalRacesWeek,
      heavyBettors,
      activePlayersToday,
      stuckRichCount,
      totalActiveLastWeek,
      activeThisWeekCount,
      playersWithMultiplePurchases,
      totalPayersEver,
      racesThisWeekForVelocity,
      racesLastWeekForVelocity,
      activePlayersThisWeekForVelocity,
      activePlayersLastWeekForVelocity,
    ] = await Promise.all([
      // spectatorRatio: races with betAmount=0 (quick_race mode) in last 7 days
      prisma.raceRecord.count({
        where: { racedAt: { gte: weekStart }, gameMode: 'quick_race' },
      }),
      // total races in last 7 days (already have racesThisWeek but need fresh for ratio)
      prisma.raceRecord.count({
        where: { racedAt: { gte: weekStart } },
      }),
      // betLimitHitRate: players with 10+ bets today
      prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM (
          SELECT "playerId" FROM game_bet_records
          WHERE "placedAt" >= $1
          GROUP BY "playerId"
          HAVING COUNT(*) >= 10
        ) sub`,
        todayStart,
      ),
      // active players today for betLimitHitRate denominator
      prisma.gamePlayer.count({
        where: { lastActiveAt: { gte: todayStart } },
      }),
      // stuckRichPlayers: 50000+ coins, 0 bets in last 7 days
      prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM game_players gp
         WHERE gp.coins >= 50000
         AND NOT EXISTS (
           SELECT 1 FROM game_bet_records br
           WHERE br."playerId" = gp.id
           AND br."placedAt" >= $1
         )`,
        weekStart,
      ),
      // churnRate: distinct players who raced last week (7-14 days ago)
      prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(DISTINCT "playerId") as count FROM game_race_records
         WHERE "racedAt" >= $1 AND "racedAt" < $2`,
        twoWeeksAgo,
        weekStart,
      ),
      // players who had activity last week AND also have activity this week
      // Use race_records to check for activity in both weeks (lastActiveAt only stores the latest timestamp)
      prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(DISTINCT rr1."playerId") as count
         FROM game_race_records rr1
         WHERE rr1."racedAt" >= $1 AND rr1."racedAt" < $2
         AND EXISTS (
           SELECT 1 FROM game_race_records rr2
           WHERE rr2."playerId" = rr1."playerId"
           AND rr2."racedAt" >= $2
         )`,
        twoWeeksAgo,
        weekStart,
      ),
      // purchaseRepeatRate: payers with 2+ purchases
      prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM (
           SELECT "playerId" FROM game_purchases
           WHERE "status" = 'completed'
           GROUP BY "playerId"
           HAVING COUNT(*) >= 2
         ) sub`,
      ),
      // total payers ever
      prisma.gamePlayer.count({ where: { totalSpent: { gt: 0 } } }),
      // engagementVelocity: races this week
      prisma.raceRecord.count({ where: { racedAt: { gte: weekStart } } }),
      // races last week
      prisma.raceRecord.count({ where: { racedAt: { gte: twoWeeksAgo, lt: weekStart } } }),
      // active players this week
      prisma.gamePlayer.count({ where: { lastActiveAt: { gte: weekStart } } }),
      // active players last week
      prisma.gamePlayer.count({ where: { lastActiveAt: { gte: twoWeeksAgo, lt: weekStart } } }),
    ]);

    // Compute derived engagement metrics
    const spectatorRatio = totalRacesWeek > 0
      ? Math.round((spectatorRaces / totalRacesWeek) * 100 * 10) / 10
      : 0;

    const heavyBettorsCount = Number((heavyBettors as any)[0]?.count ?? 0);
    const betLimitHitRate = activePlayersToday > 0
      ? Math.round((heavyBettorsCount / activePlayersToday) * 100 * 10) / 10
      : 0;

    const stuckRichRaw = Number((stuckRichCount as any)[0]?.count ?? 0);
    const stuckRichPct = totalPlayersCount > 0
      ? Math.round((stuckRichRaw / totalPlayersCount) * 100 * 10) / 10
      : 0;
    const stuckRichPlayers = { count: stuckRichRaw, pct: stuckRichPct };

    // churnRate: % of last-week actives who did NOT come back this week
    // totalActiveLastWeek = distinct players who raced 7-14 days ago
    // activeThisWeekCount raw query = those from last week who also raced this week
    const totalActiveLastWeekCount = Number((totalActiveLastWeek as any)[0]?.count ?? 0);
    const returnedCount = Number((activeThisWeekCount as any)[0]?.count ?? 0);
    const churnRate = totalActiveLastWeekCount > 0
      ? Math.round(((totalActiveLastWeekCount - returnedCount) / totalActiveLastWeekCount) * 100 * 10) / 10
      : 0;

    const repeatPurchasersCount = Number((playersWithMultiplePurchases as any)[0]?.count ?? 0);
    const purchaseRepeatRate = totalPayersEver > 0
      ? Math.round((repeatPurchasersCount / totalPayersEver) * 100 * 10) / 10
      : 0;

    const velocityThisWeek = activePlayersThisWeekForVelocity > 0
      ? Math.round((racesThisWeekForVelocity / activePlayersThisWeekForVelocity) * 100) / 100
      : 0;
    const velocityLastWeek = activePlayersLastWeekForVelocity > 0
      ? Math.round((racesLastWeekForVelocity / activePlayersLastWeekForVelocity) * 100) / 100
      : 0;
    const velocityChange = velocityLastWeek > 0
      ? Math.round(((velocityThisWeek - velocityLastWeek) / velocityLastWeek) * 100 * 10) / 10
      : (velocityThisWeek > 0 ? 100 : 0);
    const engagementVelocity = {
      thisWeek: velocityThisWeek,
      lastWeek: velocityLastWeek,
      change: velocityChange,
    };

    return NextResponse.json({
      marbles: marbleWinRates,
      marbleWinRates,
      gameModes: modeStats.map((m: any) => ({
        mode: m.gameMode,
        races: m._count.id,
      })),
      topCourses: courseStats.map((c: any) => ({
        courseId: c.courseId,
        races: c._count.id,
      })),
      betting: {
        totalBets,
        totalWins,
        winRate: totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0,
        avgBetSize: Math.round(Number(avgBet._avg.betAmount ?? 0)),
        biggestWin: biggestWin._max.payout ?? 0,
      },
      racesThisWeek,
      kpis,
      betDistribution,
      retentionCurve,
      featureAdoption,
      funnel,
      segments,
      revenueWeeks,
      spectatorRatio,
      betLimitHitRate,
      stuckRichPlayers,
      churnRate,
      purchaseRepeatRate,
      engagementVelocity,
    });
  } catch (error: any) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch analytics' } },
      { status: 500 },
    );
  }
}
