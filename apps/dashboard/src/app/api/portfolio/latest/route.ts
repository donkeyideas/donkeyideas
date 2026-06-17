import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken, getTokenFromRequest } from '@/lib/auth';

// GET /api/portfolio/latest — most recent stored briefing for the signed-in
// owner. Feeds the dashboard page and the mobile tab. Returns { briefing: null }
// if none has been generated yet.
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = getTokenFromRequest(request, cookieStore.get('auth-token')?.value);
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const row = await prisma.portfolioBriefing.findFirst({
      where: { userId: user.id },
      orderBy: { runAt: 'desc' },
    });

    if (!row) return NextResponse.json({ briefing: null });

    return NextResponse.json({
      briefing: {
        date: row.date.toISOString().slice(0, 10),
        runAt: row.runAt.toISOString(),
        trigger: row.trigger,
        products: row.products,
        quietlyBroken: row.quietlyBroken,
        zoneCounts: row.zoneCounts,
        headline: row.headline,
        narrative: row.narrative,
        beaconsReachable: row.beaconsReachable,
        beaconsTotal: row.beaconsTotal,
        tokensUsed: row.tokensUsed,
        cost: row.cost ? Number(row.cost) : 0,
        model: row.model,
      },
    });
  } catch (error: any) {
    console.error('Portfolio latest failed:', error);
    return NextResponse.json(
      { error: { message: error?.message || 'Failed to load briefing' } },
      { status: 500 },
    );
  }
}
