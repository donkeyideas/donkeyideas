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

    // Marble win rates from bet records
    const marbleStats = await prisma.betRecord.groupBy({
      by: ['marbleId'],
      _count: { id: true },
      _sum: { betAmount: true, payout: true },
      _avg: { odds: true },
    });

    const marbleWins = await prisma.betRecord.groupBy({
      by: ['marbleId'],
      _count: { id: true },
      where: { won: true },
    });

    const winMap = marbleWins.reduce(
      (acc: any, m: any) => ({ ...acc, [m.marbleId]: m._count.id }),
      {} as Record<string, number>,
    );

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

    // D1 Retention: players whose lastActiveAt is >= 1 day after createdAt / total players
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const eligibleForD1 = await prisma.gamePlayer.count({
      where: { createdAt: { lte: oneDayAgo } },
    });
    const retainedD1 = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) as count FROM game_players WHERE "createdAt" <= $1 AND "lastActiveAt" >= "createdAt" + interval '1 day'`,
      oneDayAgo,
    );
    const d1RetainedCount = Number(retainedD1[0]?.count ?? 0);
    const d1Retention = eligibleForD1 > 0 ? Math.round((d1RetainedCount / eligibleForD1) * 100) : 0;

    const kpis = {
      racesToday,
      betsToday,
      avgSession: 'N/A',
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

    // --- Retention Curve ---
    const retentionDays = [0, 1, 3, 7, 14, 30, 60, 90];
    const retentionLabels = ['D0', 'D1', 'D3', 'D7', 'D14', 'D30', 'D60', 'D90'];

    const retentionCurve = await Promise.all(
      retentionDays.map(async (days: any, i: number) => {
        if (days === 0) {
          return { label: retentionLabels[i], pct: 100, value: '100%' };
        }
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        // Players created at least X days ago
        const eligible = await prisma.gamePlayer.count({
          where: { createdAt: { lte: cutoffDate } },
        });

        if (eligible === 0) {
          return { label: retentionLabels[i], pct: 0, value: '0%' };
        }

        // Of those, how many have lastActiveAt >= createdAt + X days
        const retained = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM game_players WHERE "createdAt" <= $1 AND "lastActiveAt" >= "createdAt" + interval '${days} days'`,
          cutoffDate,
        );

        const retainedCount = Number(retained[0]?.count ?? 0);
        const pct = Math.round((retainedCount / eligible) * 100);
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

    const featureAdoption = [
      { name: 'Daily Betting', pct: Math.round((playersWithBets.length / activeBase) * 100), barColor: '#2ecc71', textColor: 'text-marble-green' },
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
        const wins = winMap[id] ?? 0;
        return {
          marbleId: id,
          name: id.charAt(0).toUpperCase() + id.slice(1),
          totalBets: s.bets,
          totalWagered: s.wagered,
          totalPaidOut: s.paidOut,
          avgOdds: s.avgOdds,
          wins,
          winRate: s.bets > 0 ? Math.round((wins / s.bets) * 100) : 0,
          color: MARBLE_COLORS[id] || '#ffffff',
          grad: MARBLE_GRADIENTS[id] || 'radial-gradient(circle at 35% 30%, #888, #555)',
        };
      })
      .sort((a, b) => b.winRate - a.winRate || b.totalBets - a.totalBets);

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
    });
  } catch (error: any) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch analytics' } },
      { status: 500 },
    );
  }
}
