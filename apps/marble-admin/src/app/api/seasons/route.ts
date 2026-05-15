import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    // Get current season number (highest)
    const latestSeason = await prisma.playerSeasonProgress.findFirst({
      orderBy: { seasonNumber: 'desc' },
      select: { seasonNumber: true },
    });

    const currentSeason = latestSeason?.seasonNumber || 1;

    // Season participation stats
    const seasonPlayers = await prisma.playerSeasonProgress.count({
      where: { seasonNumber: currentSeason },
    });

    const seasonStats = await prisma.playerSeasonProgress.aggregate({
      where: { seasonNumber: currentSeason },
      _sum: { racesCompleted: true, betsPlaced: true, coinsPaid: true },
      _avg: { racesCompleted: true },
    });

    // Pass adoption (grouped by tier)
    const passTiers = await prisma.gamePlayer.groupBy({
      by: ['passTier'],
      _count: { id: true },
    });

    // --- passKpis ---
    const tierCounts: Record<string, number> = {};
    passTiers.forEach((t: any) => {
      tierCounts[t.passTier || 'free'] = t._count.id;
    });
    const totalPlayers = Object.values(tierCounts).reduce((s, c) => s + c, 0);
    const freeCount = tierCounts['free'] || 0;
    const premiumCount = tierCounts['premium'] || 0;
    const plusCount = tierCounts['plus'] || 0;

    // Pass revenue: sum of GamePurchase where productName contains 'pass' or 'season'
    const passRevenue = await prisma.gamePurchase.aggregate({
      where: {
        OR: [
          { productName: { contains: 'pass', mode: 'insensitive' } },
          { productName: { contains: 'season', mode: 'insensitive' } },
        ],
      },
      _sum: { priceUsd: true },
    });

    // Avg pass level completion (assuming 30 levels)
    const avgPassLevel = await prisma.gamePlayer.aggregate({
      _avg: { passLevel: true },
    });
    const avgLevel = Number(avgPassLevel._avg.passLevel ?? 0);
    const completionPct = Math.round((avgLevel / 30) * 100);

    const passKpis = [
      {
        label: 'Free Users',
        value: freeCount.toLocaleString(),
        sub: totalPlayers > 0 ? `${((freeCount / totalPlayers) * 100).toFixed(1)}%` : '0%',
        color: 'text-white',
        border: 'border-white/[0.08]',
      },
      {
        label: 'Premium Pass',
        value: premiumCount.toLocaleString(),
        sub: totalPlayers > 0 ? `${((premiumCount / totalPlayers) * 100).toFixed(1)}%` : '0%',
        color: 'text-marble-blue',
        border: 'border-marble-blue/20',
      },
      {
        label: 'Plus Pass',
        value: plusCount.toLocaleString(),
        sub: totalPlayers > 0 ? `${((plusCount / totalPlayers) * 100).toFixed(1)}%` : '0%',
        color: 'text-[#c39bd3]',
        border: 'border-[#c39bd3]/20',
      },
      {
        label: 'Pass Revenue',
        value: `$${(Number(passRevenue._sum.priceUsd ?? 0) / 1000).toFixed(1)}K`,
        sub: 'This season',
        color: 'text-marble-green',
        border: 'border-marble-green/20',
      },
      {
        label: 'Avg Completion',
        value: `${completionPct}%`,
        sub: `Level ${avgLevel.toFixed(1)} avg`,
        color: 'text-gold',
        border: 'border-gold/20',
      },
    ];

    // --- Marble standings from season races ---
    const marbleWins = await prisma.raceRecord.groupBy({
      by: ['playerPickId'],
      where: { gameMode: 'season', won: true },
      _count: { id: true },
    });

    const marbleRaces = await prisma.raceRecord.groupBy({
      by: ['playerPickId'],
      where: { gameMode: 'season' },
      _count: { id: true },
    });

    const raceMap = marbleRaces.reduce((acc: Record<string, number>, r: any) => {
      if (r.playerPickId) acc[r.playerPickId] = r._count.id;
      return acc;
    }, {} as Record<string, number>);

    const winMap = marbleWins.reduce((acc: Record<string, number>, r: any) => {
      if (r.playerPickId) acc[r.playerPickId] = r._count.id;
      return acc;
    }, {} as Record<string, number>);

    const standings = Object.keys(raceMap)
      .map((marbleId: any) => {
        const races = raceMap[marbleId];
        const wins = winMap[marbleId] || 0;
        const losses = races - wins;
        return {
          marbleId,
          races,
          wins,
          losses,
          record: `${wins}-${losses}`,
          winRate: races > 0 ? Math.round((wins / races) * 100) : 0,
          color: MARBLE_COLORS[marbleId] || '#ffffff',
        };
      })
      .sort((a: any, b: any) => b.wins - a.wins)
      .map((s: any, i: number) => ({ ...s, rank: i + 1 }));

    // --- seasonMeta ---
    // Find earliest progress record for this season to estimate start date
    const earliestProgress = await prisma.playerSeasonProgress.findFirst({
      where: { seasonNumber: currentSeason },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const seasonStartDate = earliestProgress?.createdAt || new Date();
    const now = new Date();
    const daysSinceStart = Math.max(0, Math.floor((now.getTime() - seasonStartDate.getTime()) / (1000 * 60 * 60 * 24)));
    const week = Math.min(10, Math.max(1, Math.ceil(daysSinceStart / 7) || 1));
    const totalWeeks = 10;
    const daysRemaining = Math.max(0, (totalWeeks * 7) - daysSinceStart);
    const progressPct = Math.round((week / totalWeeks) * 100);

    const seasonMeta = {
      seasonName: `Season ${currentSeason}`,
      week,
      totalWeeks,
      daysRemaining,
      progressPct,
    };

    // --- courses ---
    // Course data lives in the game app at data/courses.ts, not in the DB
    const courses: any[] = [];

    return NextResponse.json({
      currentSeason,
      players: seasonPlayers,
      stats: {
        totalRaces: seasonStats._sum.racesCompleted ?? 0,
        totalBets: seasonStats._sum.betsPlaced ?? 0,
        coinsWon: Number(seasonStats._sum.coinsPaid ?? 0),
        avgRacesPerPlayer: Math.round(Number(seasonStats._avg.racesCompleted ?? 0)),
      },
      passTiers: passTiers.map((t: any) => ({ tier: t.passTier || 'free', count: t._count.id })),
      standings,
      passKpis,
      seasonMeta,
      courses,
    });
  } catch (error: any) {
    console.error('Seasons error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed' } }, { status: 500 });
  }
}
