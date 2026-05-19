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

/* ------------------------------------------------------------------ */
/*  Default economy config — seeded on first access if missing         */
/* ------------------------------------------------------------------ */
const SEED_CONFIGS: { key: string; value: string; label: string; group: string }[] = [
  { key: 'daily_reward_1', value: '200', label: 'Daily Reward (Day 1)', group: 'rewards' },
  { key: 'daily_reward_2', value: '250', label: 'Daily Reward (Day 2)', group: 'rewards' },
  { key: 'daily_reward_3', value: '300', label: 'Daily Reward (Day 3)', group: 'rewards' },
  { key: 'daily_reward_4', value: '350', label: 'Daily Reward (Day 4)', group: 'rewards' },
  { key: 'daily_reward_5', value: '400', label: 'Daily Reward (Day 5)', group: 'rewards' },
  { key: 'daily_reward_6', value: '500', label: 'Daily Reward (Day 6)', group: 'rewards' },
  { key: 'daily_reward_7', value: '750', label: 'Daily Reward (Day 7)', group: 'rewards' },
  { key: 'xp_per_level', value: '1000', label: 'XP Per Level', group: 'rewards' },
  { key: 'tournament_daily_prize', value: '4600', label: 'Daily Blitz · 1st Prize', group: 'rewards' },
  { key: 'tournament_daily_second_prize', value: '1200', label: 'Daily Blitz · 2nd Prize', group: 'rewards' },
  { key: 'tournament_daily_third_prize', value: '600', label: 'Daily Blitz · 3rd Prize', group: 'rewards' },
  { key: 'tournament_weekly_prize', value: '23000', label: 'Weekly Cup · 1st Prize', group: 'rewards' },
  { key: 'tournament_weekly_second_prize', value: '6000', label: 'Weekly Cup · 2nd Prize', group: 'rewards' },
  { key: 'tournament_weekly_third_prize', value: '3000', label: 'Weekly Cup · 3rd Prize', group: 'rewards' },
  { key: 'tournament_champion_prize', value: '46000', label: 'Champion Invitational · 1st Prize', group: 'rewards' },
  { key: 'tournament_champion_second_prize', value: '12000', label: 'Champion Invitational · 2nd Prize', group: 'rewards' },
  { key: 'tournament_champion_third_prize', value: '6000', label: 'Champion Invitational · 3rd Prize', group: 'rewards' },
  { key: 'bet_amount_1', value: '25', label: 'Bet Tier 1', group: 'betting' },
  { key: 'bet_amount_2', value: '100', label: 'Bet Tier 2', group: 'betting' },
  { key: 'bet_amount_3', value: '250', label: 'Bet Tier 3', group: 'betting' },
  { key: 'bet_amount_4', value: '500', label: 'Bet Tier 4', group: 'betting' },
  { key: 'house_edge', value: '0.10', label: 'House Edge', group: 'betting' },
  { key: 'max_daily_purchases', value: '3', label: 'Max Daily Purchases', group: 'limits' },
  { key: 'max_daily_coins', value: '25000', label: 'Max Daily Coins', group: 'limits' },
];

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

    // Auto-seed missing config keys
    const existing = await prisma.gameConfig.findMany({ select: { key: true } });
    const existingKeys = new Set(existing.map((e) => e.key));
    const toCreate = SEED_CONFIGS.filter((s) => !existingKeys.has(s.key));
    if (toCreate.length > 0) {
      await prisma.gameConfig.createMany({ data: toCreate, skipDuplicates: true });
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

const CONFIG_VALIDATORS: Record<string, (v: string) => boolean> = {
  house_edge: v => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 && n <= 0.5; },
  max_daily_purchases: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 100; },
  max_daily_coins: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 10_000_000; },
  xp_per_level: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 100 && n <= 100_000; },
  bet_amount_1: v => { const n = parseInt(v); return Number.isFinite(n) && n > 0 && n <= 100_000; },
  bet_amount_2: v => { const n = parseInt(v); return Number.isFinite(n) && n > 0 && n <= 100_000; },
  bet_amount_3: v => { const n = parseInt(v); return Number.isFinite(n) && n > 0 && n <= 100_000; },
  bet_amount_4: v => { const n = parseInt(v); return Number.isFinite(n) && n > 0 && n <= 100_000; },
  daily_reward_1: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 100_000; },
  daily_reward_2: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 100_000; },
  daily_reward_3: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 100_000; },
  daily_reward_4: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 100_000; },
  daily_reward_5: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 100_000; },
  daily_reward_6: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 100_000; },
  daily_reward_7: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 100_000; },
  tournament_daily_prize: v => { const n = parseInt(v); return Number.isFinite(n) && n > 0 && n <= 1_000_000; },
  tournament_weekly_prize: v => { const n = parseInt(v); return Number.isFinite(n) && n > 0 && n <= 1_000_000; },
  tournament_champion_prize: v => { const n = parseInt(v); return Number.isFinite(n) && n > 0 && n <= 10_000_000; },
  tournament_daily_second_prize: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 1_000_000; },
  tournament_daily_third_prize: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 1_000_000; },
  tournament_weekly_second_prize: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 1_000_000; },
  tournament_weekly_third_prize: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 1_000_000; },
  tournament_champion_second_prize: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 10_000_000; },
  tournament_champion_third_prize: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 10_000_000; },
  tournament_daily_entry: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 1_000_000; },
  tournament_weekly_entry: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 1_000_000; },
  tournament_champion_entry: v => { const n = parseInt(v); return Number.isFinite(n) && n >= 0 && n <= 1_000_000; },
  app_store_fee_rate: v => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 && n <= 0.5; },
};

/* Numeric keys must be stored as bare numeric strings ("4600"), not
 * formatted display strings ("4,600 coins"). The mobile client reads
 * with parseFloat which truncates at the first non-digit, so "4,600
 * coins" → 4 silently broke tournament payouts in production. Any key
 * with a validator is treated as numeric. */
function isNumericKey(key: string): boolean {
  return key in CONFIG_VALIDATORS;
}

function normalizeNumericValue(raw: unknown): string {
  if (typeof raw === 'number') return String(raw);
  const s = String(raw ?? '').replace(/,/g, '').replace(/[^\d.\-eE]/g, '').trim();
  return s;
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

    /* Coerce numeric keys to canonical form before validating. Admins
     * occasionally paste "4,600 coins" into the editable cell; without
     * this the row would store the formatted string and the mobile
     * parseFloat would truncate it to 4 (the original tournament prize
     * bug). For non-numeric keys (toggles, strings) we pass through. */
    const stringValue = isNumericKey(key)
      ? normalizeNumericValue(value)
      : String(value);
    const validator = CONFIG_VALIDATORS[key];
    if (validator && !validator(stringValue)) {
      return NextResponse.json(
        { error: { message: `Invalid value for config key "${key}"` } },
        { status: 400 },
      );
    }

    const config = await prisma.gameConfig.update({
      where: { key },
      data: {
        value: stringValue,
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
