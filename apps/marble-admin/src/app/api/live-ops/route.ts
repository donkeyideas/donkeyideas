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
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      concurrentUsers,
      racesLastHour,
      betsLastHour,
      errorsLastHour,
      avgResponseTimeResult,
      activeAnnouncements,
      activePromos,
      pendingMessages,
    ] = await Promise.all([
      // Players active in last 5 minutes
      prisma.gamePlayer.count({
        where: { lastActiveAt: { gt: fiveMinutesAgo } },
      }),

      // Races in last hour
      prisma.raceRecord.count({
        where: { racedAt: { gt: oneHourAgo } },
      }),

      // Bets in last hour
      prisma.betRecord.count({
        where: { placedAt: { gt: oneHourAgo } },
      }),

      // API errors in last hour (status >= 400)
      prisma.gameApiLog.count({
        where: {
          statusCode: { gte: 400 },
          createdAt: { gt: oneHourAgo },
        },
      }),

      // Average response time in last hour
      prisma.gameApiLog.aggregate({
        where: { createdAt: { gt: oneHourAgo } },
        _avg: { responseTime: true },
      }),

      // Active announcements (now between startDate and endDate, or endDate is null)
      prisma.gameAnnouncement.count({
        where: {
          active: true,
          startDate: { lte: now },
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      }),

      // Active promos (now between startDate and endDate)
      prisma.gamePromo.count({
        where: {
          active: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),

      // Unread messages
      prisma.gameMessage.count({
        where: { read: false },
      }),
    ]);

    return NextResponse.json({
      concurrentUsers,
      racesLastHour,
      betsLastHour,
      errorsLastHour,
      avgResponseTime: Math.round(avgResponseTimeResult._avg.responseTime || 0),
      activeAnnouncements,
      activePromos,
      pendingMessages,
    });
  } catch (error: any) {
    console.error('Admin live-ops GET error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch live ops status' } },
      { status: 500 },
    );
  }
}
