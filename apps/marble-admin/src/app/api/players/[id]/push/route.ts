import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { getFirebaseMessaging } from '@/lib/firebase-admin';

/* ------------------------------------------------------------------ */
/*  POST /api/players/[id]/push                                         */
/*                                                                     */
/*  Admin-initiated one-off push notification to a specific player via */
/*  Firebase Cloud Messaging (FCM). The mobile app registers native    */
/*  FCM/APNs tokens via Notifications.getDevicePushTokenAsync; this    */
/*  route sends straight to that token using Firebase Admin SDK.       */
/*                                                                     */
/*  Replaces the prior Expo Push API path that routed through          */
/*  exp.host and was observed to drop deliveries to killed Android     */
/*  apps. Same Firebase Admin path argufight + basktball use.          */
/* ------------------------------------------------------------------ */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const admin = await getUserByToken(token);
    if (!admin) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const title = String(body.title || '').trim();
    const messageBody = String(body.body || '').trim();

    if (!title || title.length > 100) {
      return NextResponse.json(
        { error: { message: 'title required (1-100 chars)' } },
        { status: 400 },
      );
    }
    if (!messageBody || messageBody.length > 500) {
      return NextResponse.json(
        { error: { message: 'body required (1-500 chars)' } },
        { status: 400 },
      );
    }

    const player = await prisma.gamePlayer.findUnique({
      where: { id },
      select: { id: true, playerName: true, pushToken: true, pushTokenPlatform: true, status: true },
    });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }
    if (!player.pushToken) {
      return NextResponse.json(
        {
          error: {
            message:
              `${player.playerName || 'Player'} has no registered push token. ` +
              `They need to launch the app at least once with notifications enabled.`,
          },
        },
        { status: 400 },
      );
    }
    if (player.status === 'banned') {
      return NextResponse.json(
        { error: { message: 'Cannot push to a banned player' } },
        { status: 400 },
      );
    }

    const messaging = getFirebaseMessaging();
    if (!messaging) {
      return NextResponse.json(
        {
          error: {
            message:
              'Push service not configured on this server. Set FIREBASE_SERVICE_ACCOUNT_JSON env var.',
          },
        },
        { status: 503 },
      );
    }

    try {
      const messageId = await messaging.send({
        token: player.pushToken,
        notification: {
          title,
          body: messageBody,
        },
        data: {
          source: 'admin_one_off',
          adminId: admin.id,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'default',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      });

      console.log(
        `[admin/push] sent player=${player.id} fcmMsgId=${messageId} adminId=${admin.id} title="${title.slice(0, 30)}"`,
      );

      return NextResponse.json({
        success: true,
        messageId,
        platform: player.pushTokenPlatform,
      });
    } catch (err: any) {
      const code: string = err?.code ?? 'unknown';
      const detail: string = err?.message ?? 'fcm send failed';
      console.error(`[admin/push] fcm error player=${player.id} code=${code} detail=${detail}`);

      /* Token clearly dead — clear it on the player so subsequent
       * pushes don't waste send budget. Same heuristic as bulk dispatch. */
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument'
      ) {
        await prisma.gamePlayer.update({
          where: { id: player.id },
          data: { pushToken: null, pushTokenPlatform: null, pushTokenUpdatedAt: null },
        });
        return NextResponse.json(
          {
            error: {
              message:
                `Push token is no longer valid (${code}). Cleared from this player; ` +
                `they'll re-register on next app launch.`,
            },
          },
          { status: 410 },
        );
      }

      return NextResponse.json(
        { error: { message: `Push failed: ${detail}` } },
        { status: 502 },
      );
    }
  } catch (error: any) {
    console.error('Admin push error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to send push' } },
      { status: 500 },
    );
  }
}
