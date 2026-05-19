import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

/* ------------------------------------------------------------------ */
/*  Public endpoint — no auth required. Game app fetches on launch.   */
/* ------------------------------------------------------------------ */

export async function GET() {
  try {
    const now = new Date();

    const promos = await prisma.gamePromo.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      select: {
        id: true,
        name: true,
        type: true,
        multiplier: true,
        config: true,
      },
    });

    return NextResponse.json({ promos });
  } catch (error: any) {
    // On error, return empty array so the game never breaks
    return NextResponse.json({ promos: [] });
  }
}
