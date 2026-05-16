import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const CONFIG_KEY = 'user_forecasts';

async function requireSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return getUserByToken(token);
}

function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET() {
  try {
    const user = await requireSession();
    if (!user) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const players = await prisma.gamePlayer.findMany({ select: { createdAt: true } });

    const countsByMonth: Record<string, number> = {};
    for (const p of players) {
      const key = toMonthKey(new Date(p.createdAt));
      countsByMonth[key] = (countsByMonth[key] ?? 0) + 1;
    }

    const currentKey = toMonthKey(new Date());
    if (!(currentKey in countsByMonth)) countsByMonth[currentKey] = 0;

    const months = Object.entries(countsByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));

    const setting = await prisma.gameConfig.findUnique({ where: { key: CONFIG_KEY } });
    const forecasts: Record<string, number> = setting ? JSON.parse(setting.value) : {};

    return NextResponse.json({ months, forecasts });
  } catch (err: any) {
    console.error('[user-forecasts GET]', err);
    return NextResponse.json(
      { error: { message: err.message ?? 'Failed to load forecasts' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    if (!user) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const body = await request.json();
    const { forecasts } = body as { forecasts: Record<string, number> };
    if (!forecasts || typeof forecasts !== 'object') {
      return NextResponse.json({ error: { message: 'Invalid payload' } }, { status: 400 });
    }

    await prisma.gameConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: JSON.stringify(forecasts), updatedBy: user.id },
      create: {
        key: CONFIG_KEY,
        value: JSON.stringify(forecasts),
        label: 'User Forecasts',
        group: 'forecast',
        updatedBy: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[user-forecasts POST]', err);
    return NextResponse.json(
      { error: { message: err.message ?? 'Failed to save forecasts' } },
      { status: 500 },
    );
  }
}
