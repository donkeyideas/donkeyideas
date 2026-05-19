import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { getSandboxAwareReport } from '@/lib/sandboxFilter';
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

    // Explicit select so we don't blow up on environments where newer
    // additive columns (e.g. pushToken, pushTokenPlatform, pushTokenUpdatedAt
    // from the push-delivery migration) haven't been applied yet. Without
    // this, Prisma issues SELECT * and Postgres throws "column does not
    // exist", returning 500 on every player detail load.
    const player = await prisma.gamePlayer.findUnique({
      where: { id },
      select: {
        id: true,
        deviceId: true,
        playerName: true,
        email: true,
        platform: true,
        appVersion: true,
        deviceModel: true,
        coins: true,
        totalSpent: true,
        totalRaces: true,
        totalWins: true,
        currentStreak: true,
        bestStreak: true,
        dailyStreak: true,
        passLevel: true,
        passXp: true,
        passTier: true,
        status: true,
        banReason: true,
        bannedAt: true,
        bannedBy: true,
        flagReason: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }

    // Fetch related data in parallel. Session metrics are kept OUT of this
    // Promise.all because the game_app_sessions table may not exist yet on
    // older environments (the push-delivery migration that introduced it
    // hasn't been applied everywhere). A throw there would tank the whole
    // detail response with a 500 and the modal would show "Failed to load
    // player data." We swallow + log instead so the rest of the page still
    // renders.
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
        take: 100,
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

    // Optional session metrics — gracefully degrades when the table isn't
    // present on this DB.
    let avgSessionSecs = 0;
    let totalSessions = 0;
    let distinctSessionDays = 1;
    try {
      const sessionStats = await prisma.gameAppSession.aggregate({
        where: { playerId: id },
        _count: { id: true },
        _avg: { durationSecs: true },
      });
      totalSessions = sessionStats._count?.id ?? 0;
      avgSessionSecs = Math.round(Number(sessionStats._avg?.durationSecs ?? 0));
      if (totalSessions > 0) {
        const days = await prisma.$queryRaw<{ day: Date }[]>`
          SELECT DISTINCT DATE_TRUNC('day', "createdAt") AS day
          FROM "game_app_sessions"
          WHERE "playerId" = ${id}
        `;
        distinctSessionDays = Math.max(1, days.length);
      }
    } catch (sessionErr: any) {
      console.warn(
        `[players/${id}] session metrics unavailable — table missing or query failed:`,
        sessionErr?.message ?? sessionErr,
      );
    }

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
    const winRate = totalBets > 0 ? Math.round((totalBetWins / totalBets) * 100) : 0;

    // ---- Compute KPIs ----
    const now = new Date();
    const createdAt = new Date(player.createdAt);
    const monthsSinceCreation = Math.max(1, (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const daysSinceCreation = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    // Use sandbox-aware non-sandbox spend instead of player.totalSpent
    // (which is polluted by sandbox / TestFlight purchases). Keeps this
    // player's LTV / ARPPU / paying status in lockstep with the rest of
    // the dashboard.
    const sandbox = await getSandboxAwareReport();
    const totalSpentNum = sandbox.spendByPlayer.get(id) ?? 0;
    const isPaying = sandbox.payerIds.has(id);

    const lastActiveAt = player.lastActiveAt ? new Date(player.lastActiveAt) : createdAt;
    const daysSinceActive = Math.floor((now.getTime() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24));
    const churnRisk = daysSinceActive <= 7 ? 'Low' : daysSinceActive <= 30 ? 'Medium' : 'High';
    const churnRiskLevel = daysSinceActive <= 7 ? 2 : daysSinceActive <= 30 ? 3 : 5;

    /* Avg Session: mean foreground-session duration in mm:ss format.
     * Falls back to "N/A" when the player has no recorded sessions (older
     * installs from before the session tracker shipped, or environments
     * where the game_app_sessions table isn't present yet — caught above).
     *
     * Sessions / Day: total recorded sessions divided by distinct calendar
     * days the player has had ANY session. Previously this label held
     * `totalRaces / daysSinceCreation`, which is races/day mislabeled
     * (a player who hasn't opened the app in 30 days would show a
     * deceptively-low number, AND races aren't sessions).
     *
     * Monthly Spend: replaces the per-user "ARPPU" label, which is a
     * population-level metric and is meaningless on a single player row.
     * For one user, what the dashboard actually wants is what they spent
     * per month on average — that's LTV / months active. Shown only for
     * paying users; non-payers see "N/A".
     */
    const fmtMMSS = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    };
    const avgSessionLabel = totalSessions > 0 ? fmtMMSS(avgSessionSecs) : 'N/A';
    const sessionsPerDay = totalSessions > 0
      ? (totalSessions / distinctSessionDays).toFixed(1)
      : 'N/A';

    const kpis = [
      { label: 'Monthly Spend', value: isPaying ? `$${(totalSpentNum / monthsSinceCreation).toFixed(2)}` : 'N/A', color: 'gold' },
      { label: 'Lifetime Value', value: `$${totalSpentNum.toFixed(2)}`, color: 'green' },
      { label: 'Avg Session', value: avgSessionLabel, color: 'blue' },
      { label: 'Bet Win Rate', value: `${winRate}%`, color: 'purple' },
      { label: 'Sessions / Day', value: sessionsPerDay, color: 'white' },
      { label: 'Churn Risk', value: churnRisk, color: churnRisk === 'Low' ? 'green' : churnRisk === 'Medium' ? 'gold' : 'red', riskLevel: churnRiskLevel },
    ];

    // ---- Compute Heatmap (7x24 grid) ----
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const heatGrid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    // Count activity from bets and races
    for (const bet of recentBets) {
      const d = new Date(bet.placedAt);
      const dow = (d.getDay() + 6) % 7; // Monday=0
      const hr = d.getHours();
      heatGrid[dow][hr]++;
    }
    for (const race of recentRaces) {
      const d = new Date(race.racedAt);
      const dow = (d.getDay() + 6) % 7;
      const hr = d.getHours();
      heatGrid[dow][hr]++;
    }

    // Scale to 0-4
    const maxHeat = Math.max(1, ...heatGrid.flat());
    const scaledGrid = heatGrid.map((row) => row.map((v) => Math.min(4, Math.round((v / maxHeat) * 4))));

    // Peak time and most active day
    let peakHour = 0;
    let peakCount = 0;
    const hourTotals = Array(24).fill(0);
    const dayTotals = Array(7).fill(0);
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        hourTotals[h] += heatGrid[d][h];
        dayTotals[d] += heatGrid[d][h];
        if (heatGrid[d][h] > peakCount) {
          peakCount = heatGrid[d][h];
          peakHour = h;
        }
      }
    }
    const mostActiveDayIdx = dayTotals.indexOf(Math.max(...dayTotals));
    const peakEndHour = Math.min(23, peakHour + 2);
    const fmtHour = (h: number) => {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12} ${ampm}`;
    };

    const heatmap = {
      days: dayNames,
      grid: scaledGrid,
      peakTime: `${fmtHour(peakHour)}-${fmtHour(peakEndHour)}`,
      mostActiveDay: dayNames[mostActiveDayIdx],
    };

    // ---- Compute Coin History ----
    // recentTransactions is fetched newest-first. Reverse to oldest-first so
    // the chart reads left-to-right as time advances. Use the LEDGER'S
    // recorded `balance` snapshot (post-tx balance) instead of re-deriving
    // by subtracting amounts: the old code initialised runningBalance to
    // `player.coins` then walked oldest→newest while SUBTRACTING each amount,
    // which produces a backwards reconstruction (final value ends up equal
    // to balance-before-oldest-tx, not current). Plus the bars displayed
    // were each off-by-one in time. tx.balance is authoritative and is
    // written atomically with the coin update everywhere (admin adjust-coins,
    // economy/transaction, sync/race, sync/purchase — see Wave 1).
    const sortedTx = [...recentTransactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const coinBars = sortedTx.map((t) => Number(t.amount));
    const balanceBars = sortedTx.map((t) => Math.max(0, Number(t.balance)));
    const finalBars = balanceBars.length > 0 ? balanceBars : [player.coins];

    const totalIn = recentTransactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = recentTransactions
      .filter((t) => Number(t.amount) < 0)
      .reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    const coinHistory = {
      bars: finalBars,
      amounts: coinBars,
      high: finalBars.length > 0 ? Math.max(...finalBars) : player.coins,
      low: finalBars.length > 0 ? Math.min(...finalBars) : player.coins,
      current: player.coins,
      totalIn,
      totalOut,
    };

    // ---- Compute Race Stats ----
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const racesToday = await prisma.raceRecord.count({
      where: { playerId: id, racedAt: { gte: todayStart } },
    });

    const gameModeBreakdown = await prisma.raceRecord.groupBy({
      by: ['gameMode'],
      where: { playerId: id },
      _count: { id: true },
    });

    const raceStats = [
      { label: 'Races Today', value: String(racesToday) },
      { label: 'Win Rate', value: `${winRate}%` },
      { label: 'Avg Bet Size', value: String(Math.round(Number(betStats._avg.betAmount ?? 0))) },
      { label: 'Net P/L', value: `${totalWon - totalWagered >= 0 ? '+' : ''}${Math.round(totalWon - totalWagered)}` },
    ];

    // ---- Admin Notes (no model yet) ----
    const adminNotes: any[] = [];

    return NextResponse.json({
      player: {
        ...player,
        // Use sandbox-aware non-sandbox spend so the modal matches what
        // Financials counts as revenue for this player.
        totalSpent: totalSpentNum,
      },
      betting: {
        totalBets,
        wins: totalBetWins,
        losses: totalBets - totalBetWins,
        winRate,
        totalWagered,
        totalWon,
        netPL: totalWon - totalWagered,
        avgBetSize: Math.round(Number(betStats._avg.betAmount ?? 0)),
        biggestWin: betStats._max.payout ?? 0,
      },
      kpis,
      heatmap,
      coinHistory,
      raceStats,
      gameModes: gameModeBreakdown.map((g) => ({
        mode: g.gameMode,
        count: g._count.id,
      })),
      adminNotes,
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
