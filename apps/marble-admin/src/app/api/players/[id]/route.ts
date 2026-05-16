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
    const totalSpentNum = Number(player.totalSpent);
    const isPaying = totalSpentNum > 0;

    const lastActiveAt = player.lastActiveAt ? new Date(player.lastActiveAt) : createdAt;
    const daysSinceActive = Math.floor((now.getTime() - lastActiveAt.getTime()) / (1000 * 60 * 60 * 24));
    const churnRisk = daysSinceActive <= 7 ? 'Low' : daysSinceActive <= 30 ? 'Medium' : 'High';
    const churnRiskLevel = daysSinceActive <= 7 ? 2 : daysSinceActive <= 30 ? 3 : 5;

    const kpis = [
      { label: 'ARPPU', value: isPaying ? `$${(totalSpentNum / monthsSinceCreation).toFixed(2)}` : 'N/A', color: 'gold' },
      { label: 'Lifetime Value', value: `$${totalSpentNum.toFixed(2)}`, color: 'green' },
      { label: 'Avg Session', value: 'N/A', color: 'blue' },
      { label: 'Bet Win Rate', value: `${winRate}%`, color: 'purple' },
      { label: 'Sessions / Day', value: (player.totalRaces / daysSinceCreation).toFixed(1), color: 'white' },
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
    const txAmounts = recentTransactions.map((t) => Number(t.amount));
    const coinBars = txAmounts.length > 0 ? txAmounts.reverse() : [];
    const totalIn = recentTransactions.filter((t) => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0);
    const totalOut = recentTransactions.filter((t) => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

    // Build a running balance from transactions (approximate)
    let runningBalance = player.coins;
    const balanceBars: number[] = [];
    // Walk backwards through transactions to reconstruct balance history
    const sortedTx = [...recentTransactions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const tx of sortedTx) {
      balanceBars.push(Math.max(0, runningBalance));
      runningBalance = runningBalance - Number(tx.amount);
    }
    // If no transactions, just show current balance
    const finalBars = balanceBars.length > 0 ? balanceBars : [player.coins];

    const coinHistory = {
      bars: finalBars,
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
        totalSpent: Number(player.totalSpent),
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
