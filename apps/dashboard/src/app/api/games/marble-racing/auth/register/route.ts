import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { createGamePlayerSession } from '@/lib/game-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, playerName, platform, appVersion, deviceModel } = body;

    if (!deviceId || !playerName) {
      return NextResponse.json(
        { error: { message: 'deviceId and playerName are required' } },
        { status: 400 },
      );
    }

    // Check if device already registered
    const existing = await prisma.gamePlayer.findUnique({
      where: { deviceId },
    });

    if (existing) {
      // Device already registered — issue new session
      const token = await createGamePlayerSession(existing.id, deviceId, platform || 'unknown');
      await prisma.gamePlayer.update({
        where: { id: existing.id },
        data: { lastActiveAt: new Date() },
      });
      return NextResponse.json({
        player: {
          id: existing.id,
          playerName: existing.playerName,
          coins: existing.coins,
          status: existing.status,
        },
        token,
        isNew: false,
      });
    }

    // Create new player
    const player = await prisma.gamePlayer.create({
      data: {
        deviceId,
        playerName: playerName.slice(0, 30),
        platform: platform || 'unknown',
        appVersion: appVersion || null,
        deviceModel: deviceModel || null,
      },
    });

    // Log welcome bonus
    await prisma.gameCoinTransaction.create({
      data: {
        playerId: player.id,
        type: 'daily_bonus',
        amount: 1000,
        balance: 1000,
        description: 'Welcome bonus',
      },
    });

    const token = await createGamePlayerSession(player.id, deviceId, platform || 'unknown');

    return NextResponse.json({
      player: {
        id: player.id,
        playerName: player.playerName,
        coins: player.coins,
        status: player.status,
      },
      token,
      isNew: true,
    });
  } catch (error: any) {
    console.error('Game register error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Registration failed' } },
      { status: 500 },
    );
  }
}
