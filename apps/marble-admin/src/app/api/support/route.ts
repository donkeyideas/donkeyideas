import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { getNonSandboxPurchaseFilter } from '@/lib/sandboxFilter';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const admin = await getUserByToken(token);
    if (!admin) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    // Sandbox/TestFlight exclusion so support refund stats match Financials.
    const excludePurchaseTest = await getNonSandboxPurchaseFilter();

    const [
      tickets,
      openCount,
      resolvedThisWeekCount,
      urgentCount,
      refundedPurchases,
      refundStats,
      flaggedPlayers,
      recentRefunds,
    ] = await Promise.all([
      prisma.supportTicket.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
      prisma.supportTicket.count({ where: { status: { in: ['open', 'pending'] } } }),
      prisma.supportTicket.count({ where: { status: 'resolved', resolvedAt: { gte: weekStart } } }),
      prisma.supportTicket.count({ where: { priority: 'urgent', status: { not: 'resolved' } } }),
      prisma.gamePurchase.count({ where: { status: 'refunded', ...excludePurchaseTest } }),
      prisma.gamePurchase.aggregate({
        where: { status: 'refunded', ...excludePurchaseTest },
        _sum: { priceUsd: true },
        _count: true,
      }),
      prisma.gamePlayer.findMany({
        where: { status: 'flagged' },
        select: {
          id: true, playerName: true, email: true, coins: true,
          totalSpent: true, totalRaces: true, passTier: true,
          flagReason: true, lastActiveAt: true, createdAt: true,
        },
        take: 10,
        orderBy: { lastActiveAt: 'desc' },
      }),
      prisma.gamePurchase.findMany({
        where: { status: 'refunded', ...excludePurchaseTest },
        select: {
          id: true, productName: true, priceUsd: true, platform: true,
          purchasedAt: true, refundedAt: true,
          player: { select: { playerName: true } },
        },
        take: 10,
        orderBy: { refundedAt: 'desc' },
      }),
    ]);

    // Avg response time
    const ticketsWithReply = tickets.filter((t) =>
      t.messages.some((m) => m.authorType === 'admin'),
    );
    let avgResponseMs = 0;
    if (ticketsWithReply.length > 0) {
      const totalMs = ticketsWithReply.reduce((sum, t) => {
        const first = t.messages.find((m) => m.authorType === 'admin');
        return first ? sum + (first.createdAt.getTime() - t.createdAt.getTime()) : sum;
      }, 0);
      avgResponseMs = totalMs / ticketsWithReply.length;
    }
    const avgHours = avgResponseMs > 0 ? (avgResponseMs / 3_600_000).toFixed(1) + 'h' : 'N/A';

    return NextResponse.json({
      kpis: {
        openTickets: openCount,
        avgResponseTime: avgHours,
        resolvedThisWeek: resolvedThisWeekCount,
        urgentCount,
        refundRequests: refundedPurchases,
        flaggedPlayers: flaggedPlayers.length,
      },
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        playerId: t.playerId,
        playerName: t.playerName,
        playerEmail: t.playerEmail,
        platform: t.platform,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        assignedTo: t.assignedTo,
        resolution: t.resolution,
        createdAt: t.createdAt,
        resolvedAt: t.resolvedAt,
        messageCount: t.messages.length,
        messages: t.messages.map((m) => ({
          id: m.id,
          authorName: m.authorName,
          authorType: m.authorType,
          content: m.content,
          createdAt: m.createdAt,
        })),
      })),
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
      flaggedPlayers,
    });
  } catch (error: any) {
    console.error('Support API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch support data' } },
      { status: 500 },
    );
  }
}
