import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

/* ------------------------------------------------------------------ */
/*  Public endpoint — no auth required. Game app fetches on launch.   */
/*  Returns manual announcements + auto-generated national race ones. */
/* ------------------------------------------------------------------ */

// National race schedule (MUST mirror game app's data/nationalRaces.ts —
// auto-announcement copy will be wrong if these drift apart). One event
// per daypart: chaos cup 8am, speed demon 12pm, marble mile 5pm, GP 8pm.
const NATIONAL_EVENTS = [
  { id: 'chaos-cup', name: 'CHAOS CUP', multiplier: 4, entryFee: 400, startHourET: 8 },
  { id: 'speed-demon', name: 'SPEED DEMON DASH', multiplier: 2, entryFee: 200, startHourET: 12 },
  { id: 'marble-mile', name: 'THE MARBLE MILE', multiplier: 3, entryFee: 300, startHourET: 17 },
  { id: 'grand-prix', name: 'THE GRAND PRIX', multiplier: 5, entryFee: 500, startHourET: 20 },
];

function getETOffset(): number {
  const now = new Date();
  const month = now.getUTCMonth();
  if (month > 2 && month < 10) return -4; // EDT
  if (month < 2 || month === 11) return -5; // EST
  // March
  if (month === 2) {
    const firstDayDow = new Date(Date.UTC(now.getUTCFullYear(), 2, 1)).getUTCDay();
    const secondSunday = firstDayDow === 0 ? 8 : 8 + (7 - firstDayDow);
    return now.getUTCDate() >= secondSunday ? -4 : -5;
  }
  // November
  const firstDayDow = new Date(Date.UTC(now.getUTCFullYear(), 10, 1)).getUTCDay();
  const firstSunday = firstDayDow === 0 ? 1 : 8 - firstDayDow;
  return now.getUTCDate() >= firstSunday ? -5 : -4;
}

function getEasternHour(): number {
  const now = new Date();
  return ((now.getUTCHours() + getETOffset()) % 24 + 24) % 24;
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h > 12 ? `${h - 12}pm` : `${h}am`;
}

/** Generate dynamic announcements for national race events */
function getEventAnnouncements(): { id: string; title: string; body: string; type: string; priority: number }[] {
  const currentHour = getEasternHour();
  const announcements: { id: string; title: string; body: string; type: string; priority: number }[] = [];

  for (const event of NATIONAL_EVENTS) {
    const hoursUntil = event.startHourET - currentHour;
    const isLive = currentHour >= event.startHourET;

    if (isLive) {
      announcements.push({
        id: `auto-live-${event.id}`,
        title: `${event.name} is LIVE!`,
        body: `${event.multiplier}X payout · Entry: ${event.entryFee} coins · Win up to ${event.entryFee * event.multiplier} coins!`,
        type: 'promo',
        priority: 90,
      });
    } else if (hoursUntil > 0 && hoursUntil <= 2) {
      announcements.push({
        id: `auto-soon-${event.id}`,
        title: `${event.name} starts at ${formatHour(event.startHourET)} ET`,
        body: `${event.multiplier}X multiplied payouts · Entry fee: ${event.entryFee} coins. Get ready!`,
        type: 'info',
        priority: 70,
      });
    }
  }

  return announcements;
}

export async function GET() {
  try {
    const now = new Date();

    const dbAnnouncements = await prisma.gameAnnouncement.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      orderBy: { priority: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        priority: true,
      },
    });

    // Merge manual + auto-generated event announcements, sorted by priority
    const eventAnnouncements = getEventAnnouncements();
    const all = [...dbAnnouncements, ...eventAnnouncements]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8);

    return NextResponse.json({ announcements: all });
  } catch (error: any) {
    // On error, still return auto-generated announcements so game never breaks
    const fallback = getEventAnnouncements();
    return NextResponse.json({ announcements: fallback });
  }
}
