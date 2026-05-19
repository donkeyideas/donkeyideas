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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // Run all queries in parallel
    const [
      totalPlayers,
      activeTodayCount,
      activeWeekCount,
      bannedCount,
      racesToday,
      racesTotal,
      revenueAll,
      revenueToday,
      revenueWeek,
      revenueMonth,
      payingPlayersCount,
      newPlayersToday,
      newPlayersWeek,
      totalCoinsInCirculation,
    ] = await Promise.all([
      prisma.gamePlayer.count(),
      prisma.gamePlayer.count({ where: { lastActiveAt: { gte: todayStart } } }),
      prisma.gamePlayer.count({ where: { lastActiveAt: { gte: weekStart } } }),
      prisma.gamePlayer.count({ where: { status: 'banned' } }),
      prisma.raceRecord.count({ where: { racedAt: { gte: todayStart } } }),
      prisma.raceRecord.count(),
      prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed' } }),
      prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed', purchasedAt: { gte: todayStart } } }),
      prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed', purchasedAt: { gte: weekStart } } }),
      prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed', purchasedAt: { gte: monthStart } } }),
      prisma.gamePlayer.count({ where: { totalSpent: { gt: 0 } } }),
      prisma.gamePlayer.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.gamePlayer.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.gamePlayer.aggregate({ _sum: { coins: true } }),
    ]);

    return NextResponse.json({
      players: {
        total: totalPlayers,
        activeToday: activeTodayCount,
        activeWeek: activeWeekCount,
        banned: bannedCount,
        paying: payingPlayersCount,
        newToday: newPlayersToday,
        newWeek: newPlayersWeek,
      },
      races: {
        today: racesToday,
        total: racesTotal,
      },
      revenue: {
        total: Number(revenueAll._sum.priceUsd ?? 0),
        today: Number(revenueToday._sum.priceUsd ?? 0),
        week: Number(revenueWeek._sum.priceUsd ?? 0),
        month: Number(revenueMonth._sum.priceUsd ?? 0),
      },
      economy: {
        totalCoinsInCirculation: totalCoinsInCirculation._sum.coins ?? 0,
      },
    });
  } catch (error: any) {
    console.error('Admin overview error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch overview' } },
      { status: 500 },
    );
  }
}
