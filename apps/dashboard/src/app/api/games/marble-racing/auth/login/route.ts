import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { createGamePlayerSession } from '@/lib/game-auth';
import { getRequestGeo } from '@/lib/request-geo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId } = body;
    const geo = getRequestGeo(request);

    if (!deviceId) {
      return NextResponse.json(
        { error: { message: 'deviceId is required' } },
        { status: 400 },
      );
    }

    const player = await prisma.gamePlayer.findUnique({
      where: { deviceId },
    });

    if (!player) {
      return NextResponse.json(
        { error: { message: 'Device not registered' } },
        { status: 404 },
      );
    }

    if (player.status === 'banned') {
      // Do NOT leak banReason or playerId to a banned client — both fields
      // were previously returned and helped scrapers triangulate which device
      // ids were flagged plus tell tampered clients exactly what to spoof
      // around. Return a generic 403 with no identifying fields.
      return NextResponse.json(
        { error: { message: 'Account suspended' }, banned: true },
        { status: 403 },
      );
    }

    const token = await createGamePlayerSession(
      player.id,
      deviceId,
      player.platform,
    );

    // Backfill geo opportunistically — older players that registered before
    // the geo columns existed will fill in on their first login from a
    // Vercel edge.
    await prisma.gamePlayer.update({
      where: { id: player.id },
      data: {
        lastActiveAt: new Date(),
        ...(player.country == null && geo.country ? { country: geo.country } : {}),
        ...(player.region  == null && geo.region  ? { region:  geo.region  } : {}),
        ...(player.city    == null && geo.city    ? { city:    geo.city    } : {}),
      },
    });

    return NextResponse.json({
      player: {
        id: player.id,
        playerName: player.playerName,
        coins: player.coins,
        status: player.status,
      },
      token,
      banned: false,
    });
  } catch (error: any) {
    console.error('Game login error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Login failed' } },
      { status: 500 },
    );
  }
}
