import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * Per-announcement delivery results, broken down by platform.
 *
 * Aggregates GameAnnouncementDelivery rows for each of the last 50
 * announcements. Each platform reports sent / delivered / failed counts and
 * a roll-up status:
 *   passed  — every device that received an attempt was either 'sent' or
 *             'delivered' (zero failures) AND we actually targeted at least
 *             one device on that platform
 *   failed  — all attempts on that platform failed
 *   partial — mix of success + failure
 *   pending — no delivery rows yet (push not yet dispatched, or no devices
 *             registered for that platform)
 */
export async function GET() {
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

    const announcements = await prisma.gameAnnouncement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        type: true,
        startDate: true,
        createdAt: true,
      },
    });

    if (announcements.length === 0) {
      return NextResponse.json({ deliveries: [] });
    }

    const announcementIds = announcements.map((a) => a.id);

    // Single grouped query aggregates rows for every announcement / platform / status
    const groups = await prisma.gameAnnouncementDelivery.groupBy({
      by: ['announcementId', 'platform', 'status'],
      where: { announcementId: { in: announcementIds } },
      _count: { _all: true },
    });

    type PlatformStat = { sent: number; delivered: number; failed: number; status: 'pending' | 'passed' | 'failed' | 'partial' };
    const empty = (): PlatformStat => ({ sent: 0, delivered: 0, failed: 0, status: 'pending' });

    const byAnnouncement = new Map<string, { ios: PlatformStat; android: PlatformStat }>();
    for (const id of announcementIds) {
      byAnnouncement.set(id, { ios: empty(), android: empty() });
    }

    for (const g of groups) {
      const bucket = byAnnouncement.get(g.announcementId);
      if (!bucket) continue;
      const platformKey = g.platform === 'ios' ? 'ios' : 'android';
      const stat = bucket[platformKey];
      const count = g._count._all;
      if (g.status === 'sent') {
        stat.sent += count;
      } else if (g.status === 'delivered') {
        stat.delivered += count;
        stat.sent += count; // delivered implies sent
      } else if (g.status === 'failed') {
        stat.failed += count;
      }
    }

    const rollup = (s: PlatformStat): PlatformStat => {
      const attempted = s.sent + s.failed;
      if (attempted === 0) return { ...s, status: 'pending' };
      if (s.failed === 0) return { ...s, status: 'passed' };
      if (s.sent === 0) return { ...s, status: 'failed' };
      return { ...s, status: 'partial' };
    };

    const deliveries = announcements.map((ann) => {
      const bucket = byAnnouncement.get(ann.id) ?? { ios: empty(), android: empty() };
      return {
        id: ann.id,
        title: ann.title,
        type: ann.type,
        sentAt: ann.startDate?.toISOString() ?? ann.createdAt.toISOString(),
        ios: rollup(bucket.ios),
        android: rollup(bucket.android),
      };
    });

    return NextResponse.json({ deliveries });
  } catch (error: any) {
    console.error('Admin announcements delivery GET error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch delivery history' } },
      { status: 500 },
    );
  }
}
