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
  /* Tournament tiers are labelled Bronze/Silver/Gold Cup to match the
   * in-game names. The config KEYS keep their daily/weekly/champion
   * stems — those are wired into the mobile remote-config reader and
   * must not change. Labels are display-only. */
  { key: 'tournament_daily_prize', value: '4600', label: 'Bronze Cup · 1st Prize', group: 'rewards' },
  { key: 'tournament_daily_second_prize', value: '1200', label: 'Bronze Cup · 2nd Prize', group: 'rewards' },
  { key: 'tournament_daily_third_prize', value: '600', label: 'Bronze Cup · 3rd Prize', group: 'rewards' },
  { key: 'tournament_weekly_prize', value: '23000', label: 'Silver Cup · 1st Prize', group: 'rewards' },
  { key: 'tournament_weekly_second_prize', value: '6000', label: 'Silver Cup · 2nd Prize', group: 'rewards' },
  { key: 'tournament_weekly_third_prize', value: '3000', label: 'Silver Cup · 3rd Prize', group: 'rewards' },
  { key: 'tournament_champion_prize', value: '46000', label: 'Gold Cup · 1st Prize', group: 'rewards' },
  { key: 'tournament_champion_second_prize', value: '12000', label: 'Gold Cup · 2nd Prize', group: 'rewards' },
  { key: 'tournament_champion_third_prize', value: '6000', label: 'Gold Cup · 3rd Prize', group: 'rewards' },
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

/* Validators per key. Helpers below keep this declarative — every key
 * falls into one of two buckets: integer coin/count, or 0..1 ratio. The
 * old long literal validator list was 40+ lines of copy-paste; this is
 * easier to add to. */
const intRange = (min: number, max: number) => (v: string) => {
  const n = parseInt(v);
  return Number.isFinite(n) && n >= min && n <= max;
};
const floatRange = (min: number, max: number) => (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= min && n <= max;
};
const coin = intRange(0, 10_000_000);
const ratio = floatRange(0, 1);
const positiveMult = floatRange(0, 100); // for things like grand-prix 5×

const CONFIG_VALIDATORS: Record<string, (v: string) => boolean> = {
  // Caps & global
  house_edge: ratio,
  bet_house_edge: ratio,
  app_store_fee_rate: ratio,
  max_daily_purchases: intRange(0, 100),
  max_daily_coins: coin,
  xp_per_level: intRange(100, 100_000),
  // Bet tiers
  bet_amount_1: intRange(1, 100_000), bet_amount_2: intRange(1, 100_000),
  bet_amount_3: intRange(1, 100_000), bet_amount_4: intRange(1, 100_000),
  // Daily streak
  daily_reward_1: coin, daily_reward_2: coin, daily_reward_3: coin, daily_reward_4: coin,
  daily_reward_5: coin, daily_reward_6: coin, daily_reward_7: coin,
  // Tournaments — 1st/2nd/3rd
  tournament_daily_prize: coin, tournament_weekly_prize: coin, tournament_champion_prize: coin,
  tournament_daily_second_prize: coin, tournament_daily_third_prize: coin,
  tournament_weekly_second_prize: coin, tournament_weekly_third_prize: coin,
  tournament_champion_second_prize: coin, tournament_champion_third_prize: coin,
  tournament_daily_entry: coin, tournament_weekly_entry: coin, tournament_champion_entry: coin,
  // Tournament round survivals
  tournament_daily_round4_payout: coin, tournament_daily_round5_payout: coin, tournament_daily_round6_payout: coin,
  tournament_weekly_round4_payout: coin, tournament_weekly_round5_payout: coin, tournament_weekly_round6_payout: coin,
  tournament_champion_round4_payout: coin, tournament_champion_round5_payout: coin, tournament_champion_round6_payout: coin,
  // Season + playoffs
  playoff_champion_prize: coin, playoff_runnerup_prize: coin,
  playoff_top3_prize: coin, playoff_qualified_prize: coin,
  season_complete_bettor_prize: coin,
  season_starter_base: coin, season_starter_increment: coin, season_starter_cap: coin,
  // National races
  national_grand_prix_entry: coin, national_grand_prix_mult: positiveMult,
  national_marble_mile_entry: coin, national_marble_mile_mult: positiveMult,
  national_speed_demon_entry: coin, national_speed_demon_mult: positiveMult,
  national_chaos_cup_entry: coin, national_chaos_cup_mult: positiveMult,
  national_second_ratio: ratio, national_third_ratio: ratio,
  // Multiplayer
  mp_blitz_entry: coin, mp_blitz_pool: coin,
  mp_cup_entry: coin, mp_cup_pool: coin,
  mp_invitational_entry: coin, mp_invitational_pool: coin,
  mp_rake: ratio, mp_first_ratio: ratio, mp_second_ratio: ratio, mp_third_ratio: ratio, mp_fourth_ratio: ratio,
  // Challenges
  challenge_daily_win: coin, challenge_daily_top3: coin,
  challenge_daily_streak2: coin, challenge_daily_wins3: coin,
  challenge_weekly_races5: coin, challenge_weekly_marbles3: coin,
  challenge_weekly_races10: coin, challenge_weekly_marbles5: coin,
  // Season Pass milestone coins + XP grants
  pass_level2_coins: coin, pass_level5_coins: coin,
  pass_level10_coins: coin, pass_level15_coins: coin, pass_level20_coins: coin,
  pass_xp_bet_race: intRange(0, 100_000),
  pass_xp_quick_race: intRange(0, 100_000),
  pass_xp_win_bonus: intRange(0, 100_000),
  // Store coin packs (price is fixed in App Store / Play Store; only the
  // coin grant and promo multiplier live here)
  store_starter_coins: coin,
  store_popular_coins: coin, store_popular_promo: floatRange(0, 5),
  store_big_coins: coin, store_big_promo: floatRange(0, 5),
  store_whale_coins: coin, store_whale_promo: floatRange(0, 5),
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
