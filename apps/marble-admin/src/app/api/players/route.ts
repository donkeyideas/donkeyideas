import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { getSandboxAwareReport } from '@/lib/sandboxFilter';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const sort = searchParams.get('sort') || 'lastActiveAt';
    const dir = searchParams.get('dir') || 'desc';
    const skip = (page - 1) * limit;

    // Sandbox-aware payer set. We use this instead of player.totalSpent
    // for paying/free filtering and the headline count because totalSpent
    // is incremented on sandbox purchases too — so a TestFlight tester
    // would always be misclassified as "paying" otherwise.
    const sandbox = await getSandboxAwareReport();
    const payerIdsArr = [...sandbox.payerIds];

    // Build where clause
    const where: any = {};
    if (search) {
      where.OR = [
        { playerName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { id: { contains: search } },
      ];
    }
    if (filter === 'paying') {
      where.id = payerIdsArr.length > 0 ? { in: payerIdsArr } : { in: ['__no_payers__'] };
    } else if (filter === 'free') {
      where.id = payerIdsArr.length > 0 ? { notIn: payerIdsArr } : undefined;
    } else if (filter === 'banned') where.status = 'banned';
    else if (filter === 'flagged') where.status = 'flagged';

    // Build orderBy
    const orderBy: any = {};
    const allowedSortFields = ['createdAt', 'lastActiveAt', 'coins', 'totalRaces', 'totalWins', 'totalSpent', 'playerName'];
    if (allowedSortFields.includes(sort)) {
      orderBy[sort] = dir === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.lastActiveAt = 'desc';
    }

    const [players, total, payingCount, bannedCount, flaggedCount] = await Promise.all([
      prisma.gamePlayer.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          deviceId: true,
          playerName: true,
          email: true,
          platform: true,
          coins: true,
          totalSpent: true,
          totalRaces: true,
          totalWins: true,
          currentStreak: true,
          passLevel: true,
          passTier: true,
          status: true,
          lastActiveAt: true,
          createdAt: true,
          bannedAt: true,
        },
      }),
      prisma.gamePlayer.count({ where }),
      // Headline "paying" KPI matches the filter pill semantics
      Promise.resolve(sandbox.payerIds.size),
      prisma.gamePlayer.count({ where: { status: 'banned' } }),
      prisma.gamePlayer.count({ where: { status: 'flagged' } }),
    ]);

    return NextResponse.json({
      // Use the sandbox-aware per-player non-sandbox spend, not the raw
      // totalSpent column (which double-counts sandbox purchases). The
      // table's "Total Spent" column shows what the player actually paid
      // and that we'd report as revenue.
      players: players.map(p => ({
        ...p,
        totalSpent: sandbox.spendByPlayer.get(p.id) ?? 0,
        winRate: p.totalRaces > 0 ? Math.round((p.totalWins / p.totalRaces) * 100) : 0,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        paying: payingCount,
        banned: bannedCount,
        flagged: flaggedCount,
      },
    });
  } catch (error: any) {
    console.error('Admin players error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch players' } },
      { status: 500 },
    );
  }
}
