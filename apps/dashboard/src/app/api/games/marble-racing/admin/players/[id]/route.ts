import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    const player = await prisma.gamePlayer.findUnique({ where: { id } });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }

    // Fetch related data in parallel
    const [
      recentRaces,
      recentBets,
      recentTransactions,
      purchases,
      seasonProgress,
      betStats,
      marbleBets,
    ] = await Promise.all([
      prisma.raceRecord.findMany({
        where: { playerId: id },
        orderBy: { racedAt: 'desc' },
        take: 20,
      }),
      prisma.betRecord.findMany({
        where: { playerId: id },
        orderBy: { placedAt: 'desc' },
        take: 20,
      }),
      prisma.gameCoinTransaction.findMany({
        where: { playerId: id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.gamePurchase.findMany({
        where: { playerId: id },
        orderBy: { purchasedAt: 'desc' },
      }),
      prisma.playerSeasonProgress.findMany({
        where: { playerId: id },
        orderBy: { seasonNumber: 'desc' },
      }),
      prisma.betRecord.aggregate({
        where: { playerId: id },
        _count: { id: true },
        _sum: { betAmount: true, payout: true },
        _avg: { betAmount: true },
        _max: { payout: true },
      }),
      prisma.betRecord.groupBy({
        by: ['marbleId'],
        where: { playerId: id },
        _count: { id: true },
        _sum: { betAmount: true, payout: true },
      }),
    ]);

    // Calculate betting wins
    const totalBetWins = await prisma.betRecord.count({
      where: { playerId: id, won: true },
    });

    // Marble preferences with win/loss
    const marbleWinCounts = await prisma.betRecord.groupBy({
      by: ['marbleId'],
      where: { playerId: id, won: true },
      _count: { id: true },
    });
    const winMap = marbleWinCounts.reduce(
      (acc, m) => ({ ...acc, [m.marbleId]: m._count.id }),
      {} as Record<string, number>,
    );

    const totalBets = betStats._count.id;
    const totalWagered = Number(betStats._sum.betAmount ?? 0);
    const totalWon = Number(betStats._sum.payout ?? 0);

    return NextResponse.json({
      player: {
        ...player,
        totalSpent: Number(player.totalSpent),
      },
      betting: {
        totalBets,
        wins: totalBetWins,
        losses: totalBets - totalBetWins,
        winRate: totalBets > 0 ? Math.round((totalBetWins / totalBets) * 100) : 0,
        totalWagered,
        totalWon,
        netPL: totalWon - totalWagered,
        avgBetSize: Math.round(Number(betStats._avg.betAmount ?? 0)),
        biggestWin: betStats._max.payout ?? 0,
      },
      marblePreferences: marbleBets.map((m) => ({
        marbleId: m.marbleId,
        bets: m._count.id,
        wagered: Number(m._sum.betAmount ?? 0),
        paidOut: Number(m._sum.payout ?? 0),
        wins: winMap[m.marbleId] ?? 0,
        winRate: m._count.id > 0
          ? Math.round(((winMap[m.marbleId] ?? 0) / m._count.id) * 100)
          : 0,
      })),
      purchases: purchases.map((p) => ({
        ...p,
        priceUsd: Number(p.priceUsd),
      })),
      recentRaces,
      recentBets: recentBets.map((b) => ({
        ...b,
        odds: Number(b.odds),
      })),
      recentTransactions,
      seasonProgress,
    });
  } catch (error: any) {
    console.error('Admin player detail error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch player' } },
      { status: 500 },
    );
  }
}
