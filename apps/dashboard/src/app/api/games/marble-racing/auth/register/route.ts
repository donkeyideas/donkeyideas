import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { createGamePlayerSession } from '@/lib/game-auth';
import { getRequestGeo } from '@/lib/request-geo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, playerName, platform, appVersion, deviceModel } = body;
    const geo = getRequestGeo(request);

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
      // Device already registered — issue new session.
      // Backfill geo on each call so historical rows pick up country/region
      // the first time they hit a Vercel edge after this rolls out.
      const token = await createGamePlayerSession(existing.id, deviceId, platform || 'unknown');
      await prisma.gamePlayer.update({
        where: { id: existing.id },
        data: {
          lastActiveAt: new Date(),
          ...(existing.country == null && geo.country ? { country: geo.country } : {}),
          ...(existing.region  == null && geo.region  ? { region:  geo.region  } : {}),
          ...(existing.city    == null && geo.city    ? { city:    geo.city    } : {}),
        },
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

    /* Sanitize playerName — strip control characters, RTL overrides, and
     * zero-width joiners that could spoof admin/leaderboard rows. Keep
     * common Unicode letters/digits/spaces and a small punctuation set. */
    const safePlayerName = String(playerName)
      .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028-\u202F\u2060-\u206F]/g, '')
      .trim()
      .slice(0, 30);
    if (safePlayerName.length < 2) {
      return NextResponse.json(
        { error: { message: 'playerName must be at least 2 characters after sanitization' } },
        { status: 400 },
      );
    }

    /* ATOMIC welcome bonus.
     *
     * Previously: gamePlayer.create + gameCoinTransaction.create as two
     * separate writes. A crash between them left the player with 1000
     * coins and no audit trail (or vice versa), breaking the
     * sum(amount) == balance invariant for every new install. Wrapped in
     * $transaction so both land together or neither does. */
    const player = await prisma.$transaction(async (tx) => {
      const created = await tx.gamePlayer.create({
        data: {
          deviceId,
          playerName: safePlayerName,
          platform: platform || 'unknown',
          appVersion: appVersion || null,
          deviceModel: deviceModel || null,
          country: geo.country,
          region:  geo.region,
          city:    geo.city,
        },
      });
      await tx.gameCoinTransaction.create({
        data: {
          playerId: created.id,
          type: 'daily_bonus',
          amount: 1000,
          balance: 1000,
          description: 'Welcome bonus',
          idempotencyKey: `welcome:${created.id}`,
        },
      });
      return created;
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
