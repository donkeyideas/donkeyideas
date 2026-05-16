import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';

export async function POST(request: NextRequest) {
  try {
    const token = extractGameToken(request);
    if (!token) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 },
      );
    }

    const player = await getGamePlayerByToken(token);
    if (!player) {
      return NextResponse.json(
        { error: { message: 'Invalid session' } },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      playerName,
      coins,
      totalRaces,
      totalWins,
      currentStreak,
      bestStreak,
      dailyStreak,
      passLevel,
      passXp,
    } = body;

    // Update player with latest state from app
    await prisma.gamePlayer.update({
      where: { id: player.id },
      data: {
        ...(playerName && playerName.trim().length >= 2 ? { playerName: playerName.trim().slice(0, 30) } : {}),
        coins: coins ?? player.coins,
        totalRaces: totalRaces ?? player.totalRaces,
        totalWins: totalWins ?? player.totalWins,
        currentStreak: currentStreak ?? player.currentStreak,
        bestStreak: bestStreak ?? player.bestStreak,
        dailyStreak: dailyStreak ?? player.dailyStreak,
        passLevel: passLevel ?? player.passLevel,
        passXp: passXp ?? player.passXp,
        lastActiveAt: new Date(),
      },
    });

    // Return ban status and any config changes
    const config = await prisma.gameConfig.findMany({
      where: { group: 'features' },
    });

    return NextResponse.json({
      success: true,
      banned: false,
      config: config.reduce(
        (acc, c) => ({ ...acc, [c.key]: c.value }),
        {} as Record<string, string>,
      ),
    });
  } catch (error: any) {
    console.error('Sync state error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to sync state' } },
      { status: 500 },
    );
  }
}
