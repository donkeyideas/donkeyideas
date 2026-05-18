import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

    const [
      totalCoins,
      avgCoins,
      playerCount,
      mintedToday,
      burnedToday,
      lowBalancePlayers,
      config,
    ] = await Promise.all([
      prisma.gamePlayer.aggregate({ _sum: { coins: true } }),
      prisma.gamePlayer.aggregate({ _avg: { coins: true } }),
      prisma.gamePlayer.count(),
      prisma.gameCoinTransaction.aggregate({
        _sum: { amount: true },
        where: { amount: { gt: 0 }, createdAt: { gte: todayStart } },
      }),
      // The card label says "Coins Burned Today (Bets)" so we filter to
       // bet-type transactions only. Previously this summed ALL negative
       // transactions (payouts, admin adjustments, etc.) and overstated the
       // bet sink.
      prisma.gameCoinTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'bet', amount: { lt: 0 }, createdAt: { gte: todayStart } },
      }),
      prisma.gamePlayer.count({ where: { coins: { lt: 100 } } }),
      prisma.gameConfig.findMany({ orderBy: { group: 'asc' } }),
    ]);

    // Balance distribution tiers
    const tiers = [
      { min: 0, max: 99, label: '0-99' },
      { min: 100, max: 499, label: '100-499' },
      { min: 500, max: 999, label: '500-999' },
      { min: 1000, max: 4999, label: '1K-5K' },
      { min: 5000, max: 9999, label: '5K-10K' },
      { min: 10000, max: 49999, label: '10K-50K' },
      { min: 50000, max: 999999999, label: '50K+' },
    ];

    const distribution = await Promise.all(
      tiers.map(async (tier) => ({
        label: tier.label,
        count: await prisma.gamePlayer.count({
          where: { coins: { gte: tier.min, lte: tier.max } },
        }),
      })),
    );

    return NextResponse.json({
      totalCoinsInCirculation: totalCoins._sum.coins ?? 0,
      avgBalance: Math.round(Number(avgCoins._avg.coins ?? 0)),
      playerCount,
      coinsMintedToday: mintedToday._sum.amount ?? 0,
      coinsBurnedToday: Math.abs(Number(burnedToday._sum.amount ?? 0)),
      netCoinFlowToday: (mintedToday._sum.amount ?? 0) + (Number(burnedToday._sum.amount) ?? 0),
      lowBalancePlayers,
      distribution,
      config: config.reduce(
        (acc, c) => {
          if (!acc[c.group]) acc[c.group] = [];
          acc[c.group].push({ key: c.key, value: c.value, label: c.label });
          return acc;
        },
        {} as Record<string, { key: string; value: string; label: string }[]>,
      ),
    });
  } catch (error: any) {
    console.error('Admin economy error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch economy data' } },
      { status: 500 },
    );
  }
}
