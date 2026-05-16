import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

    const body = await request.json();
    const { filters } = body;

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json(
        { error: { message: 'Missing or invalid filters object' } },
        { status: 400 },
      );
    }

    // Build dynamic where clause
    const where: any = {};

    if (filters.platform) {
      where.platform = filters.platform;
    }

    if (filters.passTier) {
      where.passTier = filters.passTier;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.minCoins !== undefined || filters.maxCoins !== undefined) {
      where.coins = {};
      if (filters.minCoins !== undefined) where.coins.gte = filters.minCoins;
      if (filters.maxCoins !== undefined) where.coins.lte = filters.maxCoins;
    }

    if (filters.minSpent !== undefined || filters.maxSpent !== undefined) {
      where.totalSpent = {};
      if (filters.minSpent !== undefined) where.totalSpent.gte = filters.minSpent;
      if (filters.maxSpent !== undefined) where.totalSpent.lte = filters.maxSpent;
    }

    if (filters.minRaces !== undefined || filters.maxRaces !== undefined) {
      where.totalRaces = {};
      if (filters.minRaces !== undefined) where.totalRaces.gte = filters.minRaces;
      if (filters.maxRaces !== undefined) where.totalRaces.lte = filters.maxRaces;
    }

    if (filters.minStreak !== undefined) {
      where.currentStreak = { gte: filters.minStreak };
    }

    if (filters.lastActiveAfter || filters.lastActiveBefore) {
      where.lastActiveAt = {};
      if (filters.lastActiveAfter) where.lastActiveAt.gte = new Date(filters.lastActiveAfter);
      if (filters.lastActiveBefore) where.lastActiveAt.lte = new Date(filters.lastActiveBefore);
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) where.createdAt.gte = new Date(filters.createdAfter);
      if (filters.createdBefore) where.createdAt.lte = new Date(filters.createdBefore);
    }

    // Execute queries in parallel
    const [count, aggregates, platformBreakdown, tierBreakdown, sample] = await Promise.all([
      // Total count
      prisma.gamePlayer.count({ where }),

      // Aggregates
      prisma.gamePlayer.aggregate({
        where,
        _avg: {
          coins: true,
          totalSpent: true,
          totalRaces: true,
          currentStreak: true,
        },
      }),

      // Platform breakdown
      prisma.gamePlayer.groupBy({
        by: ['platform'],
        where,
        _count: { platform: true },
      }),

      // Tier breakdown
      prisma.gamePlayer.groupBy({
        by: ['passTier'],
        where,
        _count: { passTier: true },
      }),

      // Sample of first 20 players
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

    return NextResponse.json({
      count,
      aggregates: {
        avgCoins: Math.round(aggregates._avg.coins ?? 0),
        avgSpent: Number((aggregates._avg.totalSpent ?? 0).toString()),
        avgRaces: Math.round(aggregates._avg.totalRaces ?? 0),
        avgStreak: Math.round(aggregates._avg.currentStreak ?? 0),
        platformBreakdown: platformBreakdown.map((p) => ({
          platform: p.platform,
          count: p._count.platform,
        })),
        tierBreakdown: tierBreakdown.map((t) => ({
          tier: t.passTier,
          count: t._count.passTier,
        })),
      },
      sample: sample.map((p) => ({
        ...p,
        totalSpent: Number(p.totalSpent),
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
