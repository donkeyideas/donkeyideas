import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
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

    const test = await prisma.gameABTest.findUnique({
      where: { id },
    });

    if (!test) {
      return NextResponse.json(
        { error: { message: 'A/B test not found' } },
        { status: 404 },
      );
    }

    // Get enrolled count, variant breakdown, and latest 50 assignments in parallel
    const [enrolledCount, variantBreakdown, assignments] = await Promise.all([
      prisma.gameABTestAssignment.count({
        where: { testId: id },
      }),

      prisma.gameABTestAssignment.groupBy({
        by: ['variant'],
        where: { testId: id },
        _count: { variant: true },
      }),

      prisma.gameABTestAssignment.findMany({
        where: { testId: id },
        orderBy: { assignedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          playerId: true,
          variant: true,
          assignedAt: true,
        },
      }),
    ]);

    // Fetch player names for the assignments
    const playerIds = assignments.map((a) => a.playerId);
    const players = await prisma.gamePlayer.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, playerName: true },
    });
    const playerMap = new Map(players.map((p) => [p.id, p.playerName]));

    const assignmentsWithPlayerInfo = assignments.map((a) => ({
      ...a,
      playerName: playerMap.get(a.playerId) ?? 'Unknown',
    }));

    return NextResponse.json({
      test,
      enrolledCount,
      variantBreakdown: variantBreakdown.map((v) => ({
        variant: v.variant,
        count: v._count.variant,
      })),
      assignments: assignmentsWithPlayerInfo,
    });
  } catch (error: any) {
    console.error('AB test detail error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch A/B test detail' } },
      { status: 500 },
    );
  }
}
