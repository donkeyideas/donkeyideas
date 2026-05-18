import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
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

    const minSpent = num(body.totalSpentMin);
    const maxSpent = num(body.totalSpentMax);
    if (minSpent !== undefined || maxSpent !== undefined) {
      where.totalSpent = {};
      if (minSpent !== undefined) where.totalSpent.gte = minSpent;
      if (maxSpent !== undefined) where.totalSpent.lte = maxSpent;
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

    const [totalMatched, aggregates, platformGroups, tierGroups, samplePlayers] = await Promise.all([
      prisma.gamePlayer.count({ where }),
      prisma.gamePlayer.aggregate({
        where,
        _avg: { coins: true, totalSpent: true, totalRaces: true, currentStreak: true },
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
          totalSpent: true,
          totalRaces: true,
          passTier: true,
          lastActiveAt: true,
        },
      }),
    ]);

    const platformTotal = platformGroups.reduce((s, p) => s + p._count.platform, 0) || 1;
    const tierTotal = tierGroups.reduce((s, t) => s + t._count.passTier, 0) || 1;

    return NextResponse.json({
      totalMatched,
      avgCoins: Math.round(aggregates._avg.coins ?? 0),
      avgSpent: Number(aggregates._avg.totalSpent ?? 0),
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
        totalSpent: Number(p.totalSpent),
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
