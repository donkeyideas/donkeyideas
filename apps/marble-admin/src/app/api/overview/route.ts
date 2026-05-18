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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    // ── Core queries (parallel) ──
    const [
      totalPlayers,
      activeTodayCount,
      activeYesterdayCount,
      activeWeekCount,
      bannedCount,
      racesToday,
      racesTotal,
      revenueAll,
      revenueToday,
      revenueYesterday,
      revenueWeek,
      revenueMonth,
      payingPlayersCount,
      payingPlayersThisWeek,
      payingPlayersLastWeek,
      newPlayersToday,
      newPlayersWeek,
      totalCoinsInCirculation,
      betsToday,
      refundedToday,
    ] = await Promise.all([
      prisma.gamePlayer.count(),
      prisma.gamePlayer.count({ where: { lastActiveAt: { gte: todayStart } } }),
      prisma.gamePlayer.count({ where: { lastActiveAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.gamePlayer.count({ where: { lastActiveAt: { gte: weekStart } } }),
      prisma.gamePlayer.count({ where: { status: 'banned' } }),
      prisma.raceRecord.count({ where: { racedAt: { gte: todayStart } } }),
      prisma.raceRecord.count(),
      prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed' } }),
      prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed', purchasedAt: { gte: todayStart } } }),
      prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed', purchasedAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed', purchasedAt: { gte: weekStart } } }),
      prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed', purchasedAt: { gte: monthStart } } }),
      prisma.gamePlayer.count({ where: { totalSpent: { gt: 0 } } }),
      prisma.gamePlayer.count({ where: { totalSpent: { gt: 0 }, createdAt: { gte: weekStart } } }),
      prisma.gamePlayer.count({ where: { totalSpent: { gt: 0 }, createdAt: { gte: lastWeekStart, lt: weekStart } } }),
      prisma.gamePlayer.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.gamePlayer.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.gamePlayer.aggregate({ _sum: { coins: true } }),
      prisma.betRecord.count({ where: { placedAt: { gte: todayStart } } }),
      prisma.gamePurchase.count({ where: { status: 'refunded', refundedAt: { gte: todayStart } } }),
    ]);

    // ── Anomaly Detection: 7-day daily metrics ──
    const anomalyDays: { dau: number; races: number; bets: number; revenue: number }[] = [];
    for (let i = 7; i >= 1; i--) {
      const dayStart = new Date(todayStart);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [dayDau, dayRaces, dayBets, dayRev] = await Promise.all([
        prisma.gamePlayer.count({ where: { lastActiveAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.raceRecord.count({ where: { racedAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.betRecord.count({ where: { placedAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.gamePurchase.aggregate({ _sum: { priceUsd: true }, where: { status: 'completed', purchasedAt: { gte: dayStart, lt: dayEnd } } }),
      ]);

      anomalyDays.push({
        dau: dayDau,
        races: dayRaces,
        bets: dayBets,
        revenue: Number(dayRev._sum.priceUsd ?? 0),
      });
    }

    // ── Concurrent users (active in last 5 min) ──
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const concurrentUsers = await prisma.gamePlayer.count({
      where: { lastActiveAt: { gte: fiveMinAgo } },
    });

    // ── ARPDAU & ARPPU (today) ──
    const payingPlayersToday = await prisma.gamePurchase.groupBy({
      by: ['playerId'],
      where: { status: 'completed', purchasedAt: { gte: todayStart } },
    });
    const payingPlayersTodayCount = payingPlayersToday.length;

    // ── Monthly revenue chart (last 12 months) ──
    const revenueChart: { month: string; revenue: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const agg = await prisma.gamePurchase.aggregate({
        _sum: { priceUsd: true },
        where: { status: 'completed', purchasedAt: { gte: mStart, lt: mEnd } },
      });
      revenueChart.push({
        month: monthNames[mStart.getMonth()],
        revenue: Number(agg._sum.priceUsd ?? 0),
      });
    }

    // ── User growth (last 6 months): new signups per month + cumulative total ──
    const userGrowthChart: { month: string; newUsers: number; totalUsers: number }[] = [];
    const sixMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const baselineTotal = await prisma.gamePlayer.count({
      where: { createdAt: { lt: sixMonthsAgoStart } },
    });
    let runningTotal = baselineTotal;
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const newUsers = await prisma.gamePlayer.count({
        where: { createdAt: { gte: mStart, lt: mEnd } },
      });
      runningTotal += newUsers;
      userGrowthChart.push({
        month: monthNames[mStart.getMonth()],
        newUsers,
        totalUsers: runningTotal,
      });
    }

    // ── Revenue by product (donut chart) ──
    const productGroups = await prisma.gamePurchase.groupBy({
      by: ['productName'],
      _sum: { priceUsd: true },
      where: { status: 'completed' },
      orderBy: { _sum: { priceUsd: 'desc' } },
    });
    const donutColors = ['#ffc220', '#6ec1ff', '#c39bd3', '#2ecc71', '#e74c3c', '#f39c12', '#1abc9c', '#e67e22'];
    const revenueByProduct = productGroups.map((g, idx) => ({
      name: g.productName,
      value: Number(g._sum.priceUsd ?? 0),
      color: donutColors[idx % donutColors.length],
    }));

    // ── Derived values ──
    const revTotal = Number(revenueAll._sum.priceUsd ?? 0);
    const revToday = Number(revenueToday._sum.priceUsd ?? 0);
    const revYesterday = Number(revenueYesterday._sum.priceUsd ?? 0);
    const revWeek = Number(revenueWeek._sum.priceUsd ?? 0);
    const revMonth = Number(revenueMonth._sum.priceUsd ?? 0);

    const conversionRate = totalPlayers > 0 ? (payingPlayersCount / totalPlayers * 100) : 0;
    const arpu = totalPlayers > 0 ? revTotal / totalPlayers : 0;
    const arppu = payingPlayersCount > 0 ? revTotal / payingPlayersCount : 0;
    const ltv = totalPlayers > 0 ? revTotal / totalPlayers : 0;

    // Avg Session Length over the last 30 days, computed from
    // game_app_sessions written by the mobile session tracker. Shows N/A
    // when no sessions have been recorded yet (e.g. before the next mobile
    // build ships with the tracker, or for a brand-new env).
    const avgSessionAgg = await prisma.gameAppSession.aggregate({
      where: { createdAt: { gte: monthStart } },
      _avg: { durationSecs: true },
      _count: { id: true },
    });
    const avgSessionSecs = Math.round(Number(avgSessionAgg._avg.durationSecs ?? 0));
    const avgSessionLabel = avgSessionAgg._count.id === 0
      ? 'N/A'
      : avgSessionSecs >= 60
        ? `${Math.floor(avgSessionSecs / 60)}m ${avgSessionSecs % 60}s`
        : `${avgSessionSecs}s`;

    // ── Quick Stats ──
    const quickStats = [
      { name: 'Total Registered Users', value: totalPlayers.toLocaleString(), color: 'text-white' },
      { name: 'Conversion Rate', value: `${conversionRate.toFixed(1)}%`, color: 'text-marble-green' },
      { name: 'ARPU', value: `$${arpu.toFixed(2)}`, color: 'text-gold' },
      { name: 'ARPPU', value: `$${arppu.toFixed(2)}`, color: 'text-gold' },
      { name: 'LTV', value: `$${ltv.toFixed(2)}`, color: 'text-marble-blue' },
      { name: 'Races Today', value: racesToday.toLocaleString(), color: 'text-white' },
      { name: 'Bets Placed Today', value: betsToday.toLocaleString(), color: 'text-white' },
      { name: 'Avg Session Length', value: avgSessionLabel, color: 'text-marble-blue' },
    ];

    // ── Alerts ──
    const alerts: { type: 'warning' | 'danger' | 'info' | 'success'; title: string; message: string; time: string }[] = [];

    if (bannedCount > 0) {
      alerts.push({
        type: 'warning',
        title: 'Banned Players',
        message: `${bannedCount} player${bannedCount === 1 ? '' : 's'} currently banned`,
        time: 'Now',
      });
    }

    if (refundedToday > 0) {
      alerts.push({
        type: 'danger',
        title: 'Refunds Today',
        message: `${refundedToday} refunded purchase${refundedToday === 1 ? '' : 's'} today`,
        time: 'Today',
      });
    }

    if (newPlayersToday > 10) {
      alerts.push({
        type: 'info',
        title: 'Player Growth',
        message: `${newPlayersToday} new players registered today`,
        time: 'Today',
      });
    }

    if (conversionRate < 5 && totalPlayers > 0) {
      alerts.push({
        type: 'warning',
        title: 'Low Conversion',
        message: `Paying conversion rate is ${conversionRate.toFixed(1)}% (below 5% target)`,
        time: 'Now',
      });
    }

    // If no alerts, add a success message
    if (alerts.length === 0) {
      alerts.push({
        type: 'success',
        title: 'All Clear',
        message: 'No issues detected. Everything is running smoothly.',
        time: 'Now',
      });
    }

    // ── System-wide Activity Heatmap (last 30 days) ──
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [heatRaces, heatBets] = await Promise.all([
      prisma.raceRecord.findMany({
        where: { racedAt: { gte: thirtyDaysAgo } },
        select: { racedAt: true },
      }),
      prisma.betRecord.findMany({
        where: { placedAt: { gte: thirtyDaysAgo } },
        select: { placedAt: true },
      }),
    ]);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const heatGrid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const r of heatRaces) {
      const d = new Date(r.racedAt);
      const dow = (d.getDay() + 6) % 7; // Monday=0
      heatGrid[dow][d.getHours()]++;
    }
    for (const b of heatBets) {
      const d = new Date(b.placedAt);
      const dow = (d.getDay() + 6) % 7;
      heatGrid[dow][d.getHours()]++;
    }

    // Scale to 0-5
    const maxHeat = Math.max(1, ...heatGrid.flat());
    const scaledGrid = heatGrid.map((row) => row.map((v) => Math.min(5, Math.round((v / maxHeat) * 5))));

    // Peak time + most active day
    const hourTotals = Array(24).fill(0);
    const dayTotals = Array(7).fill(0);
    let peakHour = 0;
    let peakCount = 0;
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
    const fmtHour = (h: number) => `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`;
    const totalActivity = heatRaces.length + heatBets.length;

    const heatmap = {
      days: dayNames,
      grid: scaledGrid,
      peakTime: `${fmtHour(peakHour)}-${fmtHour(Math.min(23, peakHour + 2))}`,
      mostActiveDay: dayNames[mostActiveDayIdx],
      totalEvents: totalActivity,
      totalRaces: heatRaces.length,
      totalBets: heatBets.length,
    };

    // ── Game Mode Distribution ──
    const gameModeDistribution = await prisma.raceRecord.groupBy({
      by: ['gameMode'],
      _count: { id: true },
    });

    // ── Trend percentages ──
    const revenueTrend = revYesterday > 0
      ? ((revToday - revYesterday) / revYesterday * 100)
      : (revToday > 0 ? 100 : 0);

    const dauTrend = activeYesterdayCount > 0
      ? ((activeTodayCount - activeYesterdayCount) / activeYesterdayCount * 100)
      : (activeTodayCount > 0 ? 100 : 0);

    const payingTrend = payingPlayersLastWeek > 0
      ? ((payingPlayersThisWeek - payingPlayersLastWeek) / payingPlayersLastWeek * 100)
      : (payingPlayersThisWeek > 0 ? 100 : 0);

    // ── Anomaly Detection ──
    interface Anomaly {
      metric: string;
      today: number;
      average: number;
      pctChange: number;
      direction: 'up' | 'down';
      severity: 'warning' | 'critical';
    }

    const anomalies: Anomaly[] = [];
    const anomalyMetrics: { metric: string; today: number; values: number[] }[] = [
      { metric: 'DAU', today: activeTodayCount, values: anomalyDays.map((d) => d.dau) },
      { metric: 'Races per day', today: racesToday, values: anomalyDays.map((d) => d.races) },
      { metric: 'Bets per day', today: betsToday, values: anomalyDays.map((d) => d.bets) },
      { metric: 'Revenue per day', today: revToday, values: anomalyDays.map((d) => d.revenue) },
    ];

    for (const { metric, today, values } of anomalyMetrics) {
      const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
      if (avg === 0 && today === 0) continue;
      const pctChange = avg > 0 ? ((today - avg) / avg) * 100 : (today > 0 ? 100 : 0);
      const absPct = Math.abs(pctChange);
      if (absPct >= 30) {
        anomalies.push({
          metric,
          today,
          average: Math.round(avg * 100) / 100,
          pctChange: Math.round(pctChange),
          direction: pctChange >= 0 ? 'up' : 'down',
          severity: absPct >= 50 ? 'critical' : 'warning',
        });
      }
    }

    // ── ARPDAU & ARPPU (computed) ──
    const arpdau = activeTodayCount > 0 ? revToday / activeTodayCount : 0;
    const arppuToday = payingPlayersTodayCount > 0 ? revToday / payingPlayersTodayCount : 0;

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
        total: revTotal,
        today: revToday,
        week: revWeek,
        month: revMonth,
      },
      economy: {
        totalCoinsInCirculation: totalCoinsInCirculation._sum.coins ?? 0,
      },
      heatmap,
      revenueChart,
      userGrowthChart,
      revenueByProduct,
      quickStats,
      gameModes: gameModeDistribution.map((g) => ({
        mode: g.gameMode,
        count: g._count.id,
      })),
      alerts,
      trends: {
        revenue: Number(revenueTrend.toFixed(1)),
        dau: Number(dauTrend.toFixed(1)),
        paying: Number(payingTrend.toFixed(1)),
      },
      anomalies,
      concurrentUsers,
      arpdau: Math.round(arpdau * 100) / 100,
      arppu: Math.round(arppuToday * 100) / 100,
    });
  } catch (error: any) {
    console.error('Admin overview error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch overview' } },
      { status: 500 },
    );
  }
}
