import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

    const entries = await prisma.gameKpiEntry.findMany({
      orderBy: { weekOf: 'desc' },
      take: 52, // Up to 1 year of weekly data
    });

    // Flag GA4 auto-fetched entries so the UI can render N/A for metrics that
    // GA4 doesn't actually supply (d30Retention requires 30+ days of cohort
    // data; crashRate requires the Play Developer Reporting API). Without
    // this flag the page renders "0% — bad" for D30 retention even when no
    // data was ever collected.
    const enriched = entries.map((e) => ({
      ...e,
      autoFetched: typeof e.notes === 'string' && e.notes.toLowerCase().includes('auto-fetched'),
    }));

    return NextResponse.json({ entries: enriched });
  } catch (error: any) {
    console.error('KPIs GET error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch KPIs' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      weekOf,
      dau,
      d1Retention,
      d7Retention,
      d30Retention,
      sessionsPerDau,
      avgSessionSecs,
      arpdau,
      rating,
      crashRate,
      notes,
    } = body;

    if (!weekOf || dau == null) {
      return NextResponse.json(
        { error: { message: 'weekOf and dau are required' } },
        { status: 400 },
      );
    }

    const entry = await prisma.gameKpiEntry.upsert({
      where: { weekOf: new Date(weekOf) },
      update: {
        dau: Number(dau),
        d1Retention: Number(d1Retention) || 0,
        d7Retention: Number(d7Retention) || 0,
        d30Retention: Number(d30Retention) || 0,
        sessionsPerDau: Number(sessionsPerDau) || 0,
        avgSessionSecs: Number(avgSessionSecs) || 0,
        arpdau: Number(arpdau) || 0,
        rating: Number(rating) || 0,
        crashRate: Number(crashRate) || 0,
        notes: notes || null,
      },
      create: {
        weekOf: new Date(weekOf),
        dau: Number(dau),
        d1Retention: Number(d1Retention) || 0,
        d7Retention: Number(d7Retention) || 0,
        d30Retention: Number(d30Retention) || 0,
        sessionsPerDau: Number(sessionsPerDau) || 0,
        avgSessionSecs: Number(avgSessionSecs) || 0,
        arpdau: Number(arpdau) || 0,
        rating: Number(rating) || 0,
        crashRate: Number(crashRate) || 0,
        notes: notes || null,
      },
    });

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error('KPIs POST error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to save KPI entry' } },
      { status: 500 },
    );
  }
}
