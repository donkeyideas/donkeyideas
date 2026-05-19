import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

/* ------------------------------------------------------------------ */
/*  Public endpoint — no auth required. Game app fetches this on load. */
/*                                                                     */
/*  CACHING: opted out of Vercel's edge cache via `force-dynamic`.     */
/*  Without this Next.js + Vercel were serving a CDN-cached response   */
/*  for up to ~10 minutes after an admin pushed a new track background */
/*  via /track-bg-images. Symptom: DB has 3 track-bg rows, API returns */
/*  the 1 row that was present when the response first cached. Mobile  */
/*  reads the stale list and shows only the old background. Live-ops   */
/*  values MUST round-trip from DB on every request — they're the      */
/*  whole point of the endpoint.                                       */
/* ------------------------------------------------------------------ */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULTS: Record<string, any> = {
  bet_amount_1: 25,
  bet_amount_2: 100,
  bet_amount_3: 250,
  bet_amount_4: 500,
  daily_reward_1: 200,
  daily_reward_2: 250,
  daily_reward_3: 300,
  daily_reward_4: 350,
  daily_reward_5: 400,
  daily_reward_6: 500,
  daily_reward_7: 750,
  house_edge: 0.10,
  max_daily_purchases: 3,
  max_daily_coins: 25000,
  tournament_daily_prize: 4600,
  tournament_weekly_prize: 23000,
  tournament_champ_prize: 46000,
  xp_per_level: 1000,
};

export async function GET() {
  try {
    const configs = await prisma.gameConfig.findMany({
      where: { group: { in: ['rewards', 'betting', 'limits', 'track-bg'] } },
    });

    // Build numeric config map with defaults (numeric groups)
    const map: Record<string, number> = { ...DEFAULTS };
    // Build per-track background image URL map (group: 'track-bg')
    const trackBgImages: Record<string, string> = {};

    /* track-bg keys are now stored namespaced as `track-bg:<courseId>` to
     * prevent collisions with other GameConfig groups (rewards, betting,
     * limits) — see track-bg-images/route.ts. Strip the prefix when
     * emitting to the mobile client so trackBgImages still maps
     * courseId → URL the same way the client expects. */
    const BG_PREFIX = 'track-bg:';
    for (const c of configs) {
      if (c.group === 'track-bg') {
        const courseId = c.key.startsWith(BG_PREFIX) ? c.key.slice(BG_PREFIX.length) : c.key;
        trackBgImages[courseId] = c.value;
      } else {
        map[c.key] = parseFloat(c.value) || 0;
      }
    }

    return NextResponse.json({
      betAmounts: [
        map.bet_amount_1,
        map.bet_amount_2,
        map.bet_amount_3,
        map.bet_amount_4,
      ],
      dailyRewards: [
        map.daily_reward_1,
        map.daily_reward_2,
        map.daily_reward_3,
        map.daily_reward_4,
        map.daily_reward_5,
        map.daily_reward_6,
        map.daily_reward_7,
      ],
      houseEdge: map.house_edge,
      maxDailyPurchases: map.max_daily_purchases,
      maxDailyCoins: map.max_daily_coins,
      tournamentPrizes: {
        daily: map.tournament_daily_prize,
        weekly: map.tournament_weekly_prize,
        champion: map.tournament_champ_prize,
      },
      xpPerLevel: map.xp_per_level,
      trackBgImages,
    });
  } catch (error: any) {
    // On error, return defaults so the game always works
    return NextResponse.json({
      betAmounts: [25, 100, 250, 500],
      dailyRewards: [200, 250, 300, 350, 400, 500, 750],
      houseEdge: 0.10,
      maxDailyPurchases: 3,
      maxDailyCoins: 25000,
      tournamentPrizes: { daily: 4600, weekly: 23000, champion: 46000 },
      xpPerLevel: 1000,
      trackBgImages: {},
    });
  }
}
