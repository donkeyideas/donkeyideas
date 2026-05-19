/**
 * Push notification dispatch via Firebase Cloud Messaging (FCM).
 *
 * Replaces the prior Expo Push API path. The mobile client registers
 * NATIVE FCM/APNs tokens via Notifications.getDevicePushTokenAsync;
 * Firebase Admin SDK sends straight to those tokens. No Expo proxy.
 *
 * Why the change: Expo Push (https://exp.host/--/api/v2/push/send)
 * routes through Expo's servers, adds latency, and was observed to drop
 * deliveries on Android when the app was in the killed state. Firebase
 * Admin's `sendEachForMulticast` is what argufight + basktball use; it
 * delivers reliably to killed/background apps and returns per-token
 * error reasons we can act on.
 *
 * Flow:
 *   1. dispatchAnnouncement() fetches every active player with a
 *      registered push token, builds FCM messages, sends in batches
 *      of 500 (FCM's documented multicast limit), then writes one
 *      GameAnnouncementDelivery row per (player, attempt) with the
 *      provider message id and an initial status of 'sent' or 'failed'.
 *   2. checkReceipts() is now a no-op shim that just exists so the
 *      existing /api/announcements/[id]/receipts route doesn't 404 —
 *      FCM doesn't have a polling-style receipts endpoint the way Expo
 *      does, so per-token delivery success is reported synchronously
 *      from `sendEachForMulticast` (already captured at dispatch time).
 */

import { prisma } from '@donkey-ideas/database';
import { getFirebaseMessaging } from './firebase-admin';

const BATCH_SIZE = 500; // FCM multicast hard limit

export interface DispatchSummary {
  announcementId: string;
  total: number;
  ios: { sent: number; failed: number };
  android: { sent: number; failed: number };
  skipped: number; // players without push token
}

/**
 * Dispatch an announcement to every active player with a registered push
 * token via FCM. Returns per-platform send counts.
 */
export async function dispatchAnnouncement(announcementId: string): Promise<DispatchSummary> {
  const announcement = await prisma.gameAnnouncement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement) {
    throw new Error(`Announcement ${announcementId} not found`);
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    throw new Error(
      'Firebase Admin not configured — set FIREBASE_SERVICE_ACCOUNT_JSON to enable push',
    );
  }

  const players = await prisma.gamePlayer.findMany({
    where: {
      pushToken: { not: null },
      status: 'active',
    },
    select: { id: true, pushToken: true, pushTokenPlatform: true },
  });

  const summary: DispatchSummary = {
    announcementId,
    total: players.length,
    ios: { sent: 0, failed: 0 },
    android: { sent: 0, failed: 0 },
    skipped: 0,
  };

  if (players.length === 0) {
    return summary;
  }

  /* Build a parallel index so sendEachForMulticast's response[i] maps
   * back to players[i] for delivery-row writing + per-platform tally. */
  type Pending = { playerId: string; platform: 'ios' | 'android'; token: string };
  const pending: Pending[] = [];
  for (const p of players) {
    if (!p.pushToken) {
      summary.skipped++;
      continue;
    }
    const platform: 'ios' | 'android' =
      p.pushTokenPlatform === 'ios' ? 'ios' : 'android';
    pending.push({ playerId: p.id, platform, token: p.pushToken });
  }

  const deliveryRows: Array<{
    announcementId: string;
    playerId: string;
    platform: string;
    provider: string;
    token: string;
    status: string;
    errorCode?: string;
    errorMessage?: string;
    providerMessageId?: string;
  }> = [];

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch.map((p) => p.token),
        notification: {
          title: announcement.title,
          body: announcement.body,
        },
        data: {
          announcementId: announcement.id,
          type: announcement.type ?? 'general',
        },
        android: {
          priority: announcement.type === 'maintenance' ? 'high' : 'normal',
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

      response.responses.forEach((resp, idx) => {
        const p = batch[idx];
        if (resp.success && resp.messageId) {
          deliveryRows.push({
            announcementId,
            playerId: p.playerId,
            platform: p.platform,
            provider: 'fcm',
            token: p.token,
            status: 'sent',
            providerMessageId: resp.messageId,
          });
          if (p.platform === 'ios') summary.ios.sent++;
          else summary.android.sent++;
        } else {
          const code = resp.error?.code ?? 'unknown';
          deliveryRows.push({
            announcementId,
            playerId: p.playerId,
            platform: p.platform,
            provider: 'fcm',
            token: p.token,
            status: 'failed',
            errorCode: code,
            errorMessage: resp.error?.message ?? 'no response',
          });
          if (p.platform === 'ios') summary.ios.failed++;
          else summary.android.failed++;
        }
      });
    } catch (err: any) {
      /* Whole batch threw — typically only for auth/network errors at
       * the FCM HTTP layer. Mark every message in the batch as failed
       * so the operator sees what happened. */
      const msg = err?.message ?? 'fcm send threw';
      for (const p of batch) {
        deliveryRows.push({
          announcementId,
          playerId: p.playerId,
          platform: p.platform,
          provider: 'fcm',
          token: p.token,
          status: 'failed',
          errorCode: 'batch_error',
          errorMessage: msg,
        });
        if (p.platform === 'ios') summary.ios.failed++;
        else summary.android.failed++;
      }
    }
  }

  if (deliveryRows.length > 0) {
    await prisma.gameAnnouncementDelivery.createMany({
      data: deliveryRows,
      skipDuplicates: false,
    });
  }

  /* Prune tokens that FCM marked as definitively invalid so future
   * dispatches don't re-send to dead devices. messaging/registration-token-
   * not-registered means the app was uninstalled or the token was
   * regenerated; messaging/invalid-registration-token means malformed. */
  const invalidPlayerIds = deliveryRows
    .filter(
      (row) =>
        row.status === 'failed' &&
        (row.errorCode === 'messaging/registration-token-not-registered' ||
          row.errorCode === 'messaging/invalid-registration-token' ||
          row.errorCode === 'messaging/invalid-argument'),
    )
    .map((row) => row.playerId);
  if (invalidPlayerIds.length > 0) {
    await prisma.gamePlayer.updateMany({
      where: { id: { in: invalidPlayerIds } },
      data: { pushToken: null, pushTokenPlatform: null, pushTokenUpdatedAt: null },
    });
  }

  return summary;
}

/**
 * Legacy shim. Expo Push had a separate `getReceipts` endpoint that we
 * polled minutes later to upgrade 'sent' → 'delivered' / 'failed'. FCM
 * doesn't expose receipt polling — every per-token success/failure is
 * returned synchronously from sendEachForMulticast and already written
 * to GameAnnouncementDelivery at dispatch time. So this is a no-op kept
 * for API compatibility with the existing
 * /api/announcements/[id]/receipts route.
 */
export async function checkReceipts(_announcementId: string): Promise<{
  checked: number;
  delivered: number;
  failed: number;
}> {
  return { checked: 0, delivered: 0, failed: 0 };
}
