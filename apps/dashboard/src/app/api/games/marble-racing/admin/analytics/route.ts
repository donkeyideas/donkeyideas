import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { requireAdmin } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await requireAdmin(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
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
      (acc, m) => ({ ...acc, [m.marbleId]: m._count.id }),
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

    return NextResponse.json({
      marbles: marbleStats.map((m) => ({
        marbleId: m.marbleId,
        totalBets: m._count.id,
        totalWagered: Number(m._sum.betAmount ?? 0),
        totalPaidOut: Number(m._sum.payout ?? 0),
        avgOdds: Number(m._avg.odds ?? 0),
        wins: winMap[m.marbleId] ?? 0,
        winRate: m._count.id > 0
          ? Math.round(((winMap[m.marbleId] ?? 0) / m._count.id) * 100)
          : 0,
      })),
      gameModes: modeStats.map((m) => ({
        mode: m.gameMode,
        races: m._count.id,
      })),
      topCourses: courseStats.map((c) => ({
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
    });
  } catch (error: any) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch analytics' } },
      { status: 500 },
    );
  }
}
