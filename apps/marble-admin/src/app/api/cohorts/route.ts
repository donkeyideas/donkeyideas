import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { getSandboxAwareReport } from '@/lib/sandboxFilter';
import { cookies } from 'next/headers';

/**
 * Cohort builder. The page sends a flat filter object whose keys match the UI
 * labels (coinBalanceMin, totalSpentMin, etc.); the response shape matches
 * what the page consumes (totalMatched, samplePlayers, breakdowns with
 * label + pct already computed). Earlier revisions of this file used
 * different field names on both sides — every result card on the page came
 * back empty as a result.
 */

interface IncomingFilters {
  platform?: string;
  passTier?: string;
  status?: string;
  coinBalanceMin?: string;
  coinBalanceMax?: string;
  totalSpentMin?: string;
  totalSpentMax?: string;
  totalRacesMin?: string;
  totalRacesMax?: string;
  minStreak?: string;
  lastActiveAfter?: string;
  lastActiveBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
}

function num(s: string | undefined): number | undefined {
  if (s === undefined || s === '' || s === null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function nonAll(s: string | undefined): string | undefined {
  if (!s || s === 'all') return undefined;
  return s;
}

function date(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as IncomingFilters;

    // Sandbox-aware spend lookup. The spend filter below uses this map
    // rather than the player.totalSpent column so cohorts built by
    // "Total Spent > $X" don't pick up TestFlight rows that the
    // sandbox-filter excludes from Financials.
    const sandbox = await getSandboxAwareReport();

    const where: any = {};

    const platform = nonAll(body.platform);
    if (platform) where.platform = platform;

    const passTier = nonAll(body.passTier);
    if (passTier) where.passTier = passTier;

    const status = nonAll(body.status);
    if (status) where.status = status;

    const minCoins = num(body.coinBalanceMin);
    const maxCoins = num(body.coinBalanceMax);
    if (minCoins !== undefined || maxCoins !== undefined) {
      where.coins = {};
      if (minCoins !== undefined) where.coins.gte = minCoins;
      if (maxCoins !== undefined) where.coins.lte = maxCoins;
    }

    // Spend filter — done in-app against the sandbox-aware spend map
    // instead of via prisma.where so a player whose totalSpent column was
    // bumped by a TestFlight purchase doesn't appear in a "spent >= $1"
    // cohort.
    const minSpent = num(body.totalSpentMin);
    const maxSpent = num(body.totalSpentMax);
    if (minSpent !== undefined || maxSpent !== undefined) {
      const matchingIds: string[] = [];
      for (const [pid, spend] of sandbox.spendByPlayer.entries()) {
        if (minSpent !== undefined && spend < minSpent) continue;
        if (maxSpent !== undefined && spend > maxSpent) continue;
        matchingIds.push(pid);
      }
      // If minSpent is 0 (or undefined and we only have maxSpent), the
      // "Free" tier (spend=0) must also be included via the inverse.
      if (minSpent === undefined || minSpent === 0) {
        // include non-payers
        where.OR = [
          { id: { in: matchingIds.length > 0 ? matchingIds : ['__no_payers__'] } },
          { id: { notIn: [...sandbox.payerIds] } },
        ];
      } else {
        where.id = matchingIds.length > 0
          ? { in: matchingIds }
          : { in: ['__no_payers__'] };
      }
    }

    const minRaces = num(body.totalRacesMin);
    const maxRaces = num(body.totalRacesMax);
    if (minRaces !== undefined || maxRaces !== undefined) {
      where.totalRaces = {};
      if (minRaces !== undefined) where.totalRaces.gte = minRaces;
      if (maxRaces !== undefined) where.totalRaces.lte = maxRaces;
    }

    const minStreak = num(body.minStreak);
    if (minStreak !== undefined) where.currentStreak = { gte: minStreak };

    const lastAfter = date(body.lastActiveAfter);
    const lastBefore = date(body.lastActiveBefore);
    if (lastAfter || lastBefore) {
      where.lastActiveAt = {};
      if (lastAfter) where.lastActiveAt.gte = lastAfter;
      if (lastBefore) where.lastActiveAt.lte = lastBefore;
    }

    const createdAfter = date(body.createdAfter);
    const createdBefore = date(body.createdBefore);
    if (createdAfter || createdBefore) {
      where.createdAt = {};
      if (createdAfter) where.createdAt.gte = createdAfter;
      if (createdBefore) where.createdAt.lte = createdBefore;
    }

    const [matchedIds, aggregates, platformGroups, tierGroups, samplePlayers] = await Promise.all([
      // We need IDs (not just count) to compute avgSpent in-memory from
      // the sandbox-aware spend map.
      prisma.gamePlayer.findMany({ where, select: { id: true } }),
      prisma.gamePlayer.aggregate({
        where,
        _avg: { coins: true, totalRaces: true, currentStreak: true },
      }),
      prisma.gamePlayer.groupBy({
        by: ['platform'],
        where,
        _count: { platform: true },
      }),
      prisma.gamePlayer.groupBy({
        by: ['passTier'],
        where,
        _count: { passTier: true },
      }),
      prisma.gamePlayer.findMany({
        where,
        take: 20,
        orderBy: { lastActiveAt: 'desc' },
        select: {
          id: true,
          playerName: true,
          platform: true,
          coins: true,
          totalRaces: true,
          passTier: true,
          lastActiveAt: true,
        },
      }),
    ]);

    const totalMatched = matchedIds.length;
    const platformTotal = platformGroups.reduce((s, p) => s + p._count.platform, 0) || 1;
    const tierTotal = tierGroups.reduce((s, t) => s + t._count.passTier, 0) || 1;

    // Avg spent over matched cohort, from sandbox-aware per-player spend.
    let spendSum = 0;
    for (const m of matchedIds) {
      spendSum += sandbox.spendByPlayer.get(m.id) ?? 0;
    }
    const avgSpent = totalMatched > 0 ? spendSum / totalMatched : 0;

    return NextResponse.json({
      totalMatched,
      avgCoins: Math.round(aggregates._avg.coins ?? 0),
      avgSpent,
      avgRaces: Math.round(aggregates._avg.totalRaces ?? 0),
      avgStreak: Number(aggregates._avg.currentStreak ?? 0),
      platformBreakdown: platformGroups.map((p) => ({
        label: p.platform,
        count: p._count.platform,
        pct: Math.round((p._count.platform / platformTotal) * 100),
      })),
      tierBreakdown: tierGroups.map((t) => ({
        label: t.passTier,
        count: t._count.passTier,
        pct: Math.round((t._count.passTier / tierTotal) * 100),
      })),
      samplePlayers: samplePlayers.map((p) => ({
        ...p,
        // Sandbox-aware spend so it matches every other tab
        totalSpent: sandbox.spendByPlayer.get(p.id) ?? 0,
        lastActiveAt: p.lastActiveAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Cohort builder error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to build cohort' } },
      { status: 500 },
    );
  }
}
