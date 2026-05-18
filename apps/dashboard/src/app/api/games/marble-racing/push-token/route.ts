import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';

/**
 * Register a push notification token for the signed-in player.
 *
 * Called by the mobile app once Notifications.getDevicePushTokenAsync()
 * resolves (after the user grants permission). The token is opaque from
 * the server's POV — it goes back out through the Expo Push API when the
 * Live Ops operator publishes an announcement.
 *
 * Body: { token: string, platform: 'ios' | 'android' }
 *
 * Idempotent — the mobile app re-registers on every cold start, and
 * matching token/platform is a no-op.
 */
export async function POST(request: NextRequest) {
  try {
    const token = extractGameToken(request);
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const player = await getGamePlayerByToken(token);
    if (!player) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { token: pushToken, platform } = body as {
      token?: string;
      platform?: string;
    };

    if (!pushToken || typeof pushToken !== 'string') {
      return NextResponse.json(
        { error: { message: 'token is required' } },
        { status: 400 },
      );
    }
    if (platform !== 'ios' && platform !== 'android') {
      return NextResponse.json(
        { error: { message: 'platform must be ios or android' } },
        { status: 400 },
      );
    }

    if (player.pushToken === pushToken && player.pushTokenPlatform === platform) {
      return NextResponse.json({ updated: false });
    }

    await prisma.gamePlayer.update({
      where: { id: player.id },
      data: {
        pushToken,
        pushTokenPlatform: platform,
        pushTokenUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ updated: true });
  } catch (error: any) {
    console.error('Push token registration error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to register push token' } },
      { status: 500 },
    );
  }
}

/**
 * Clear the player's push token. Mobile app calls this on sign-out or when
 * the OS revokes permission so the operator doesn't keep firing pushes to a
 * device that won't receive them.
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = extractGameToken(request);
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const player = await getGamePlayerByToken(token);
    if (!player) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    if (!player.pushToken) {
      return NextResponse.json({ cleared: false });
    }

    await prisma.gamePlayer.update({
      where: { id: player.id },
      data: {
        pushToken: null,
        pushTokenPlatform: null,
        pushTokenUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ cleared: true });
  } catch (error: any) {
    console.error('Push token deletion error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to clear push token' } },
      { status: 500 },
    );
  }
}
