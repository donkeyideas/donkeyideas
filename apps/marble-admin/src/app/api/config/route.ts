import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/* ------------------------------------------------------------------ */
/*  Feature descriptions (not stored in DB, derived here)              */
/* ------------------------------------------------------------------ */
const featureDescs: Record<string, string> = {
  feature_speed_bursts: 'Speed boost pads on select tracks',
  feature_national_races: 'Daily national event races',
  feature_tournaments: 'Daily/weekly tournament brackets',
  feature_season_mode: 'Full season with standings and playoffs',
  feature_season_franchise: 'Ride-or-die single marble per season',
  feature_pass_system: 'Free/Premium/Plus pass progression',
  feature_achievements: 'Unlockable achievements system',
  feature_skins: 'Cosmetic marble color variants',
  feature_custom_tracks: 'Seed-based procedural track generation',
  feature_challenges: 'Daily & weekly reward challenges',
  feature_leaderboards: 'Global marble/player rankings',
  feature_quick_race: 'No-bet practice races',
  feature_sprite_rendering: 'Use Kenney sprite assets vs fallback shapes',
};

export async function GET(_request: NextRequest) {
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

    const configs = await prisma.gameConfig.findMany({ orderBy: { group: 'asc' } });

    // Group by group field
    const grouped: Record<string, typeof configs> = {};
    for (const c of configs) {
      if (!grouped[c.group]) grouped[c.group] = [];
      grouped[c.group].push(c);
    }

    // ── Rewards: add displayValue + percentage bar ──
    const rewardItems = grouped['rewards'] ?? [];
    const maxRewardVal = rewardItems.length > 0
      ? Math.max(...rewardItems.map((r) => parseFloat(r.value) || 0))
      : 1;

    const rewards = rewardItems.map((r) => {
      const numVal = parseFloat(r.value) || 0;
      const isXP = r.key.includes('xp') || r.key.includes('level');
      const isRate = r.key.includes('edge') || r.key.includes('rate');
      const displayValue = isRate
        ? `${(numVal * 100).toFixed(0)}%`
        : isXP
          ? `${numVal.toLocaleString()} XP`
          : `${numVal.toLocaleString()} coins`;
      const pct = maxRewardVal > 0 ? Math.round((numVal / maxRewardVal) * 100) : 0;
      return { key: r.key, label: r.label, value: r.value, displayValue, pct };
    });

    // ── Betting: add color ──
    const betting = (grouped['betting'] ?? []).map((b) => {
      let color = 'text-gold';
      if (b.key.includes('entry') || b.key.includes('fee') || b.key.includes('min')) {
        color = 'text-marble-blue';
      } else if (b.key.includes('payout') || b.key.includes('prize')) {
        color = 'text-marble-green';
      } else if (b.key.includes('max')) {
        color = 'text-marble-red';
      }
      return { key: b.key, label: b.label, value: b.value, color };
    });

    // ── Features: parse boolean + add description ──
    const features = (grouped['features'] ?? []).map((f) => ({
      key: f.key,
      label: f.label,
      desc: featureDescs[f.key] ?? '',
      value: f.value === 'true',
      danger: f.key.includes('maintenance') || f.key.includes('disable'),
    }));

    return NextResponse.json({ rewards, betting, features });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch config' } },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const admin = await getUserByToken(token);
    if (!admin) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: { message: 'key and value are required' } },
        { status: 400 },
      );
    }

    const config = await prisma.gameConfig.update({
      where: { key },
      data: {
        value: String(value),
        updatedBy: admin.id,
      },
    });

    return NextResponse.json({ config });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update config' } },
      { status: 500 },
    );
  }
}
