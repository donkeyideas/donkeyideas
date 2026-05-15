import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const admin = await getUserByToken(token);
    if (!admin) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // Refund data from GamePurchase + flagged players
    const [refundedPurchases, refundStats, flaggedPlayers, recentRefunds] = await Promise.all([
      prisma.gamePurchase.count({ where: { status: 'refunded' } }),
      prisma.gamePurchase.aggregate({
        where: { status: 'refunded' },
        _sum: { priceUsd: true },
        _count: true,
      }),
      prisma.gamePlayer.findMany({
        where: { status: 'flagged' },
        select: {
          id: true,
          playerName: true,
          email: true,
          coins: true,
          totalSpent: true,
          totalRaces: true,
          passTier: true,
          flagReason: true,
          lastActiveAt: true,
          createdAt: true,
        },
        take: 10,
        orderBy: { lastActiveAt: 'desc' },
      }),
      prisma.gamePurchase.findMany({
        where: { status: 'refunded' },
        select: {
          id: true,
          productName: true,
          priceUsd: true,
          platform: true,
          purchasedAt: true,
          refundedAt: true,
          player: { select: { playerName: true } },
        },
        take: 10,
        orderBy: { refundedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      kpis: {
        openTickets: 0,            // No SupportTicket model
        avgResponseTime: 'N/A',    // No SupportTicket model
        resolvedThisWeek: 0,       // No SupportTicket model
        deletionRequests: 0,       // No AccountDeletionRequest model
        refundRequests: refundedPurchases,
        flaggedPlayers: flaggedPlayers.length,
      },
      tickets: [],                 // No SupportTicket model exists yet
      deletionQueue: [],           // No AccountDeletionRequest model exists yet
      refunds: {
        total: Number(refundStats._sum.priceUsd || 0),
        count: refundStats._count,
        recent: recentRefunds.map((r: any) => ({
          id: r.id,
          playerName: r.player?.playerName || 'Unknown',
          product: r.productName,
          amount: Number(r.priceUsd),
          platform: r.platform,
          purchasedAt: r.purchasedAt,
          refundedAt: r.refundedAt,
        })),
      },
      flaggedPlayers: flaggedPlayers,
      notifications: [],           // No PushNotification model exists yet
      reviews: [],                 // No AppStoreReview model exists yet
    });
  } catch (error: any) {
    console.error('Support API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch support data' } },
      { status: 500 },
    );
  }
}
