import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

type Store = 'play' | 'ios';
const STORE_PLATFORMS: Record<Store, string[]> = {
  play: ['android'],
  ios: ['ios'],
};
const CONFIG_KEY = (s: Store) => `store_impressions_${s}`;

async function requireSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  return getUserByToken(token);
}

function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseStore(raw: string | null): Store {
  return raw === 'ios' ? 'ios' : 'play';
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    if (!user) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const store = parseStore(searchParams.get('store'));

    const players = await prisma.gamePlayer.findMany({
      where: { platform: { in: STORE_PLATFORMS[store] } },
      select: { createdAt: true },
    });

    const installsByMonth: Record<string, number> = {};
    for (const p of players) {
      const key = toMonthKey(new Date(p.createdAt));
      installsByMonth[key] = (installsByMonth[key] ?? 0) + 1;
    }
    const currentKey = toMonthKey(new Date());
    if (!(currentKey in installsByMonth)) installsByMonth[currentKey] = 0;

    const months = Object.entries(installsByMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, installs]) => ({ month, installs }));

    const setting = await prisma.gameConfig.findUnique({ where: { key: CONFIG_KEY(store) } });
    const impressions: Record<string, number> = setting ? JSON.parse(setting.value) : {};

    return NextResponse.json({ store, months, impressions });
  } catch (err: any) {
    console.error('[aso/conversion GET]', err);
    return NextResponse.json(
      { error: { message: err.message ?? 'Failed to load store conversion data' } },
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
    const store = parseStore(body.store);
    const impressions = body.impressions;
    if (!impressions || typeof impressions !== 'object') {
      return NextResponse.json({ error: { message: 'Invalid payload' } }, { status: 400 });
    }

    await prisma.gameConfig.upsert({
      where: { key: CONFIG_KEY(store) },
      update: { value: JSON.stringify(impressions), updatedBy: user.id },
      create: {
        key: CONFIG_KEY(store),
        value: JSON.stringify(impressions),
        label: store === 'play' ? 'Play Store Impressions' : 'App Store Impressions',
        group: 'aso',
        updatedBy: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[aso/conversion POST]', err);
    return NextResponse.json(
      { error: { message: err.message ?? 'Failed to save impressions' } },
      { status: 500 },
    );
  }
}
