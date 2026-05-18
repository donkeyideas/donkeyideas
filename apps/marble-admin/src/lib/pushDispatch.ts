/**
 * Push notification dispatch via Expo Push API.
 *
 * The mobile app is pure-Expo (no @react-native-firebase native modules), so
 * we route through Expo's push service. Expo forwards each notification to
 * FCM (Android) or APNs (iOS) and returns per-message receipts. From the
 * operator's perspective in Live Ops, results are reported per platform.
 *
 * Flow:
 *   1. dispatchAnnouncement() fetches every player with a registered push
 *      token, builds chunked Expo Push messages, POSTs them in batches of
 *      100, then writes one GameAnnouncementDelivery row per (player, attempt)
 *      with the returned ticket id and an initial status of 'sent' or 'failed'.
 *   2. checkReceipts() can be called minutes later to upgrade 'sent' rows to
 *      'delivered' or 'failed' based on Expo's receipts endpoint. Not wired
 *      into a cron yet — operator can run /api/announcements/[id]/receipts
 *      manually until a scheduler is added.
 *
 * Tokens we store may be either Expo push tokens (ExponentPushToken[...]) or
 * raw FCM/APNs tokens. We route ExponentPushToken... through Expo; any other
 * shape is treated as Expo-compatible too (Expo accepts FCM tokens directly
 * when the project's FCM/APNs creds are configured in EAS).
 */

import { prisma } from '@donkey-ideas/database';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const BATCH_SIZE = 100;

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
  channelId?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface ExpoPushResponse {
  data?: ExpoPushTicket[];
  errors?: { code: string; message: string }[];
}

export interface DispatchSummary {
  announcementId: string;
  total: number;
  ios: { sent: number; failed: number };
  android: { sent: number; failed: number };
  skipped: number; // players without push token
}

/**
 * Dispatch an announcement to every player with a registered push token.
 * Returns the per-platform send counts. Receipts (delivered vs. failed) get
 * upgraded later via checkReceipts().
 */
export async function dispatchAnnouncement(announcementId: string): Promise<DispatchSummary> {
  const announcement = await prisma.gameAnnouncement.findUnique({
    where: { id: announcementId },
  });
  if (!announcement) {
    throw new Error(`Announcement ${announcementId} not found`);
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

  // Build messages + parallel lookup so we can map tickets back to players
  type Pending = { playerId: string; platform: string; token: string };
  const pending: Pending[] = [];
  const messages: ExpoPushMessage[] = [];
  for (const p of players) {
    if (!p.pushToken) {
      summary.skipped++;
      continue;
    }
    const platform = (p.pushTokenPlatform === 'ios' || p.pushTokenPlatform === 'android')
      ? p.pushTokenPlatform
      : 'android'; // default unknown to android; Expo doesn't care for routing
    pending.push({ playerId: p.id, platform, token: p.pushToken });
    messages.push({
      to: p.pushToken,
      title: announcement.title,
      body: announcement.body,
      sound: 'default',
      priority: announcement.type === 'maintenance' ? 'high' : 'default',
      data: { announcementId: announcement.id, type: announcement.type },
    });
  }

  // POST in chunks of 100 (Expo's documented batch limit)
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

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE);
    const chunkPending = pending.slice(i, i + BATCH_SIZE);

    let tickets: ExpoPushTicket[] = [];
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(chunk),
      });
      const json = (await res.json()) as ExpoPushResponse;
      tickets = json.data ?? [];
      if (!res.ok || json.errors) {
        // Whole batch failed — mark every message in this chunk as failed.
        const msg = json.errors?.[0]?.message ?? `HTTP ${res.status}`;
        for (const p of chunkPending) {
          deliveryRows.push({
            announcementId,
            playerId: p.playerId,
            platform: p.platform,
            provider: 'expo',
            token: p.token,
            status: 'failed',
            errorCode: 'batch_error',
            errorMessage: msg,
          });
          if (p.platform === 'ios') summary.ios.failed++;
          else summary.android.failed++;
        }
        continue;
      }
    } catch (err: any) {
      // Network error — mark whole chunk as failed
      for (const p of chunkPending) {
        deliveryRows.push({
          announcementId,
          playerId: p.playerId,
          platform: p.platform,
          provider: 'expo',
          token: p.token,
          status: 'failed',
          errorCode: 'network_error',
          errorMessage: err?.message ?? 'fetch failed',
        });
        if (p.platform === 'ios') summary.ios.failed++;
        else summary.android.failed++;
      }
      continue;
    }

    // Map tickets back to players by index — Expo guarantees order
    for (let j = 0; j < chunkPending.length; j++) {
      const p = chunkPending[j];
      const t = tickets[j];
      if (t && t.status === 'ok' && t.id) {
        deliveryRows.push({
          announcementId,
          playerId: p.playerId,
          platform: p.platform,
          provider: 'expo',
          token: p.token,
          status: 'sent',
          providerMessageId: t.id,
        });
        if (p.platform === 'ios') summary.ios.sent++;
        else summary.android.sent++;
      } else {
        deliveryRows.push({
          announcementId,
          playerId: p.playerId,
          platform: p.platform,
          provider: 'expo',
          token: p.token,
          status: 'failed',
          errorCode: t?.details?.error ?? 'unknown',
          errorMessage: t?.message ?? 'no ticket returned',
        });
        if (p.platform === 'ios') summary.ios.failed++;
        else summary.android.failed++;
      }
    }
  }

  // Bulk insert delivery rows
  if (deliveryRows.length > 0) {
    await prisma.gameAnnouncementDelivery.createMany({
      data: deliveryRows,
      skipDuplicates: false,
    });
  }

  return summary;
}

/**
 * Poll Expo's receipts endpoint for any 'sent' rows that haven't been
 * resolved yet. Receipts are typically available 5–15 minutes after send.
 * Caller passes an announcementId to scope the check.
 */
export async function checkReceipts(announcementId: string): Promise<{ checked: number; delivered: number; failed: number }> {
  const sentRows = await prisma.gameAnnouncementDelivery.findMany({
    where: {
      announcementId,
      status: 'sent',
      providerMessageId: { not: null },
    },
    select: { id: true, providerMessageId: true, platform: true },
  });

  let delivered = 0;
  let failed = 0;

  for (let i = 0; i < sentRows.length; i += BATCH_SIZE) {
    const chunk = sentRows.slice(i, i + BATCH_SIZE);
    const ids = chunk.map((r) => r.providerMessageId!).filter(Boolean);
    if (ids.length === 0) continue;

    try {
      const res = await fetch(EXPO_RECEIPTS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      const receipts: Record<string, { status: 'ok' | 'error'; message?: string; details?: { error?: string } }> = json.data ?? {};

      const updates = chunk.map((row) => {
        const r = receipts[row.providerMessageId!];
        if (!r) return null;
        if (r.status === 'ok') {
          delivered++;
          return prisma.gameAnnouncementDelivery.update({
            where: { id: row.id },
            data: { status: 'delivered', deliveredAt: new Date() },
          });
        }
        failed++;
        return prisma.gameAnnouncementDelivery.update({
          where: { id: row.id },
          data: {
            status: 'failed',
            errorCode: r.details?.error ?? 'receipt_error',
            errorMessage: r.message ?? 'receipt reported error',
          },
        });
      }).filter(Boolean) as Promise<unknown>[];

      await Promise.all(updates);
    } catch {
      // Skip this batch — operator can re-poll
    }
  }

  return { checked: sentRows.length, delivered, failed };
}
