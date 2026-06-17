import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { runBriefing } from '@/lib/portfolio/run';

// GET /api/cron/portfolio — daily Vercel cron entry point.
// Guarded by CRON_SECRET (Vercel sends `Authorization: Bearer <CRON_SECRET>`).
// Runs the briefing for the portfolio owner and emails it.
export const maxDuration = 300; // allow time for 12 beacon fetches + DeepSeek

export async function GET(request: NextRequest) {
  // Auth: Vercel cron bearer, or a manual ?secret= for testing.
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const querySecret = new URL(request.url).searchParams.get('secret');
  const authorized =
    !!secret && (authHeader === `Bearer ${secret}` || querySecret === secret);

  if (!authorized) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const ownerEmail =
      process.env.PORTFOLIO_OWNER_EMAIL ||
      process.env.WIDGET_OWNER_EMAIL ||
      (process.env.ADMIN_EMAILS || '').split(',')[0]?.trim() ||
      'info@donkeyideas.com';

    const owner = await prisma.user.findFirst({
      where: { email: { equals: ownerEmail, mode: 'insensitive' } },
    });
    if (!owner) {
      return NextResponse.json(
        { error: { message: `Owner user not found: ${ownerEmail}` } },
        { status: 404 },
      );
    }

    const briefing = await runBriefing({
      userId: owner.id,
      ownerEmail: owner.email,
      trigger: 'cron',
      email: true,
    });

    return NextResponse.json({
      ok: true,
      date: briefing.date,
      headline: briefing.headline,
      beacons: `${briefing.beaconsReachable}/${briefing.beaconsTotal}`,
      zones: briefing.zoneCounts,
    });
  } catch (error: any) {
    console.error('Portfolio cron failed:', error);
    return NextResponse.json(
      { error: { message: error?.message || 'Cron run failed' } },
      { status: 500 },
    );
  }
}
