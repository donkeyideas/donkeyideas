import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';

export async function GET(request: NextRequest) {
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
        { error: { message: 'Invalid or expired session' } },
        { status: 401 },
      );
    }

    // Fetch active announcements
    const announcements = await prisma.gameConfig.findMany({
      where: { group: 'announcements' },
    });

    // Fetch feature flags
    const config = await prisma.gameConfig.findMany({
      where: { group: 'features' },
    });

    return NextResponse.json({
      player: {
        id: player.id,
        playerName: player.playerName,
        coins: player.coins,
        status: player.status,
        banReason: player.banReason,
        passLevel: player.passLevel,
        passTier: player.passTier,
      },
      banned: player.status === 'banned',
      config: config.reduce(
        (acc, c) => ({ ...acc, [c.key]: c.value }),
        {} as Record<string, string>,
      ),
    });
  } catch (error: any) {
    console.error('Game me error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to get player' } },
      { status: 500 },
    );
  }
}
