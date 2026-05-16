import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

/* ------------------------------------------------------------------ */
/*  Public endpoint — no auth required. Game app fetches on launch.   */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const now = new Date();

    const announcements = await prisma.gameAnnouncement.findMany({
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

    return NextResponse.json({ announcements });
  } catch (error: any) {
    // On error, return empty array so the game never breaks
    return NextResponse.json({ announcements: [] });
  }
}
