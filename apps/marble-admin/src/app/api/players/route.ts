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
    const pageRaw = parseInt(searchParams.get('page') || '1');
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;
    const limitRaw = parseInt(searchParams.get('limit') || '20');
    const limit = Math.max(
      1,
      Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 20),
    );
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

    // Pre-compute bet-win and bet-total per player so the quick-view modal
    // can show the SAME betWinRate definition as the full detail page.
    // (Earlier the list returned a race-win-rate while the detail returned
    // a bet-win-rate, both called "winRate" — they showed different numbers
    // for the same user.) One groupBy per filtered page is fine.
    const playerIds = players.map((p) => p.id);
    const [betTotalsByPlayer, betWinsByPlayer, adsByPlayer] = playerIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          prisma.betRecord.groupBy({
            by: ['playerId'],
            where: { playerId: { in: playerIds } },
            _count: { id: true },
          }),
          prisma.betRecord.groupBy({
            by: ['playerId'],
            where: { playerId: { in: playerIds }, won: true },
            _count: { id: true },
          }),
          // Rewarded-ad watch count per player on this page. Surfaced as
          // the "ADS" column so admins can spot heavy ad watchers at a
          // glance without opening each profile.
          prisma.gameCoinTransaction.groupBy({
            by: ['playerId'],
            where: { playerId: { in: playerIds }, type: 'reward_ad' },
            _count: { id: true },
          }),
        ]);
    const totalBetMap = new Map(betTotalsByPlayer.map((r) => [r.playerId, r._count.id]));
    const wonBetMap = new Map(betWinsByPlayer.map((r) => [r.playerId, r._count.id]));
    const adsWatchedMap = new Map(adsByPlayer.map((r) => [r.playerId, r._count.id]));

    return NextResponse.json({
      // Use the sandbox-aware per-player non-sandbox spend, not the raw
      // totalSpent column (which double-counts sandbox purchases). The
      // table's "Total Spent" column shows what the player actually paid
      // and that we'd report as revenue.
      //
      // Field naming convention:
      //   raceWinRate — totalWins / totalRaces (their pick finished 1st)
      //   betWinRate  — betsWon / betsPlaced  (their bet paid out)
      // These ARE different metrics; we expose both so every card can
      // pick the one it actually wants and label it correctly.
      players: players.map(p => {
        const tBets = totalBetMap.get(p.id) ?? 0;
        const wBets = wonBetMap.get(p.id) ?? 0;
        return {
          ...p,
          totalSpent: sandbox.spendByPlayer.get(p.id) ?? 0,
          raceWinRate: p.totalRaces > 0 ? Math.round((p.totalWins / p.totalRaces) * 100) : 0,
          betWinRate: tBets > 0 ? Math.round((wBets / tBets) * 100) : 0,
          totalBets: tBets,
          totalBetWins: wBets,
          adsWatched: adsWatchedMap.get(p.id) ?? 0,
          // Deprecated alias — kept so any pre-existing reader that hasn't
          // migrated yet doesn't break. Points at the canonical bet-based
          // value (what the detail page returns). Remove once all callers
          // use betWinRate / raceWinRate explicitly.
          winRate: tBets > 0 ? Math.round((wBets / tBets) * 100) : 0,
        };
      }),
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
