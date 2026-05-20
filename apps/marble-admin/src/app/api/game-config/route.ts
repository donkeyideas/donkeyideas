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

const DEFAULTS: Record<string, number> = {
  // Bet tiers + daily streak
  bet_amount_1: 25, bet_amount_2: 100, bet_amount_3: 250, bet_amount_4: 500,
  daily_reward_1: 200, daily_reward_2: 250, daily_reward_3: 300,
  daily_reward_4: 350, daily_reward_5: 400, daily_reward_6: 500, daily_reward_7: 750,
  // Caps & global
  house_edge: 0.10, bet_house_edge: 0.10,
  max_daily_purchases: 3, max_daily_coins: 25000,
  xp_per_level: 1000,
  // Tournaments (single-player)
  tournament_daily_prize: 4600, tournament_weekly_prize: 23000, tournament_champion_prize: 46000,
  tournament_daily_entry: 100, tournament_weekly_entry: 500, tournament_champion_entry: 1000,
  tournament_daily_second_prize: 1150, tournament_daily_third_prize: 460,
  tournament_weekly_second_prize: 5750, tournament_weekly_third_prize: 2300,
  tournament_champion_second_prize: 11500, tournament_champion_third_prize: 4600,
  tournament_daily_round4_payout: 50, tournament_daily_round5_payout: 100, tournament_daily_round6_payout: 250,
  tournament_weekly_round4_payout: 250, tournament_weekly_round5_payout: 500, tournament_weekly_round6_payout: 1250,
  tournament_champion_round4_payout: 500, tournament_champion_round5_payout: 1000, tournament_champion_round6_payout: 2500,
  // Season + playoffs
  playoff_champion_prize: 5000, playoff_runnerup_prize: 2500,
  playoff_top3_prize: 1000, playoff_qualified_prize: 1500,
  season_complete_bettor_prize: 1500,
  season_starter_base: 500, season_starter_increment: 250, season_starter_cap: 2500,
  // National races
  national_grand_prix_entry: 500, national_grand_prix_mult: 5,
  national_marble_mile_entry: 300, national_marble_mile_mult: 3,
  national_speed_demon_entry: 200, national_speed_demon_mult: 2,
  national_chaos_cup_entry: 400, national_chaos_cup_mult: 4,
  national_second_ratio: 0.5, national_third_ratio: 0.25,
  // Multiplayer
  mp_blitz_entry: 100, mp_blitz_pool: 5000,
  mp_cup_entry: 500, mp_cup_pool: 25000,
  mp_invitational_entry: 1000, mp_invitational_pool: 50000,
  mp_rake: 0.20, mp_first_ratio: 0.60, mp_second_ratio: 0.20, mp_third_ratio: 0.10,
  // Challenges
  challenge_daily_win: 300, challenge_daily_top3: 200,
  challenge_daily_streak2: 400, challenge_daily_wins3: 500,
  challenge_weekly_races5: 1500, challenge_weekly_marbles3: 2000,
  challenge_weekly_races10: 2000, challenge_weekly_marbles5: 2500,
  // Season Pass milestones
  pass_level2_coins: 200, pass_level5_coins: 500,
  pass_level10_coins: 1000, pass_level15_coins: 2000, pass_level20_coins: 1500,
  // Store coin packs (IAP $ price set in App Store; only coin grant + promo % live here)
  store_starter_coins: 1000,
  store_popular_coins: 6000, store_popular_promo: 0.20,
  store_big_coins: 15000, store_big_promo: 0.50,
  store_whale_coins: 40000, store_whale_promo: 0.60,
};

/* Robust numeric parser. Admins have historically saved values as
 * "4,600 coins" via the editable cells; parseFloat("4,600 coins") returns
 * 4, which broke tournament payouts. Strip thousands separators and any
 * trailing unit text before parsing. Returns null when the value can't
 * be interpreted as a number so callers can fall back to a default
 * rather than silently using 0. */
function parseNumeric(raw: string): number | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.replace(/,/g, '').replace(/[^\d.\-eE]/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

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
        const parsed = parseNumeric(c.value);
        if (parsed !== null) {
          map[c.key] = parsed;
        }
        // If parsing fails we leave the DEFAULTS value intact rather than
        // zeroing the key — a misformatted DB value should never produce
        // a 0-coin prize on the mobile client.
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
        champion: map.tournament_champion_prize,
      },
      tournamentEntryFees: {
        daily: map.tournament_daily_entry,
        weekly: map.tournament_weekly_entry,
        champion: map.tournament_champion_entry,
      },
      tournamentSecondPrizes: {
        daily: map.tournament_daily_second_prize,
        weekly: map.tournament_weekly_second_prize,
        champion: map.tournament_champion_second_prize,
      },
      tournamentThirdPrizes: {
        daily: map.tournament_daily_third_prize,
        weekly: map.tournament_weekly_third_prize,
        champion: map.tournament_champion_third_prize,
      },
      /* Round-survival payouts — were hardcoded in mobile gameStore;
       * exposing each tier × round so live-ops can rebalance without
       * a TestFlight build. */
      tournamentRoundPayouts: {
        daily:    [0, 0, 0, map.tournament_daily_round4_payout,    map.tournament_daily_round5_payout,    map.tournament_daily_round6_payout,    map.tournament_daily_prize],
        weekly:   [0, 0, 0, map.tournament_weekly_round4_payout,   map.tournament_weekly_round5_payout,   map.tournament_weekly_round6_payout,   map.tournament_weekly_prize],
        champion: [0, 0, 0, map.tournament_champion_round4_payout, map.tournament_champion_round5_payout, map.tournament_champion_round6_payout, map.tournament_champion_prize],
      },
      playoffPayouts: {
        champion:  map.playoff_champion_prize,
        runnerUp:  map.playoff_runnerup_prize,
        top3:      map.playoff_top3_prize,
        qualified: map.playoff_qualified_prize,
        bettorComplete: map.season_complete_bettor_prize,
      },
      seasonStarterBonus: {
        base: map.season_starter_base,
        increment: map.season_starter_increment,
        cap: map.season_starter_cap,
      },
      nationalRaces: {
        grandPrix:  { entry: map.national_grand_prix_entry,  firstMult: map.national_grand_prix_mult },
        marbleMile: { entry: map.national_marble_mile_entry, firstMult: map.national_marble_mile_mult },
        speedDemon: { entry: map.national_speed_demon_entry, firstMult: map.national_speed_demon_mult },
        chaosCup:   { entry: map.national_chaos_cup_entry,   firstMult: map.national_chaos_cup_mult },
        secondRatio: map.national_second_ratio,
        thirdRatio:  map.national_third_ratio,
      },
      multiplayer: {
        blitz:        { entry: map.mp_blitz_entry,        pool: map.mp_blitz_pool },
        cup:          { entry: map.mp_cup_entry,          pool: map.mp_cup_pool },
        invitational: { entry: map.mp_invitational_entry, pool: map.mp_invitational_pool },
        rake: map.mp_rake,
        placementRatios: {
          first:  map.mp_first_ratio,
          second: map.mp_second_ratio,
          third:  map.mp_third_ratio,
        },
      },
      challenges: {
        daily: {
          win:     map.challenge_daily_win,
          top3:    map.challenge_daily_top3,
          streak2: map.challenge_daily_streak2,
          wins3:   map.challenge_daily_wins3,
        },
        weekly: {
          races5:    map.challenge_weekly_races5,
          marbles3:  map.challenge_weekly_marbles3,
          races10:   map.challenge_weekly_races10,
          marbles5:  map.challenge_weekly_marbles5,
        },
      },
      passMilestones: {
        level2:  map.pass_level2_coins,
        level5:  map.pass_level5_coins,
        level10: map.pass_level10_coins,
        level15: map.pass_level15_coins,
        level20: map.pass_level20_coins,
      },
      storePacks: {
        starter: { coins: map.store_starter_coins },
        popular: { coins: map.store_popular_coins, promo: map.store_popular_promo },
        big:     { coins: map.store_big_coins,     promo: map.store_big_promo },
        whale:   { coins: map.store_whale_coins,   promo: map.store_whale_promo },
      },
      betHouseEdge: map.bet_house_edge,
      xpPerLevel: map.xp_per_level,
      trackBgImages,
    });
  } catch (error: any) {
    // On error, return DEFAULTS so the game always works. Mobile's
    // RemoteConfig has matching fallbacks too — this is belt-and-suspenders.
    return NextResponse.json({
      betAmounts: [DEFAULTS.bet_amount_1, DEFAULTS.bet_amount_2, DEFAULTS.bet_amount_3, DEFAULTS.bet_amount_4],
      dailyRewards: [DEFAULTS.daily_reward_1, DEFAULTS.daily_reward_2, DEFAULTS.daily_reward_3, DEFAULTS.daily_reward_4, DEFAULTS.daily_reward_5, DEFAULTS.daily_reward_6, DEFAULTS.daily_reward_7],
      houseEdge: DEFAULTS.house_edge,
      maxDailyPurchases: DEFAULTS.max_daily_purchases,
      maxDailyCoins: DEFAULTS.max_daily_coins,
      tournamentPrizes: { daily: DEFAULTS.tournament_daily_prize, weekly: DEFAULTS.tournament_weekly_prize, champion: DEFAULTS.tournament_champion_prize },
      tournamentEntryFees: { daily: DEFAULTS.tournament_daily_entry, weekly: DEFAULTS.tournament_weekly_entry, champion: DEFAULTS.tournament_champion_entry },
      tournamentSecondPrizes: { daily: DEFAULTS.tournament_daily_second_prize, weekly: DEFAULTS.tournament_weekly_second_prize, champion: DEFAULTS.tournament_champion_second_prize },
      tournamentThirdPrizes: { daily: DEFAULTS.tournament_daily_third_prize, weekly: DEFAULTS.tournament_weekly_third_prize, champion: DEFAULTS.tournament_champion_third_prize },
      tournamentRoundPayouts: {
        daily:    [0, 0, 0, DEFAULTS.tournament_daily_round4_payout,    DEFAULTS.tournament_daily_round5_payout,    DEFAULTS.tournament_daily_round6_payout,    DEFAULTS.tournament_daily_prize],
        weekly:   [0, 0, 0, DEFAULTS.tournament_weekly_round4_payout,   DEFAULTS.tournament_weekly_round5_payout,   DEFAULTS.tournament_weekly_round6_payout,   DEFAULTS.tournament_weekly_prize],
        champion: [0, 0, 0, DEFAULTS.tournament_champion_round4_payout, DEFAULTS.tournament_champion_round5_payout, DEFAULTS.tournament_champion_round6_payout, DEFAULTS.tournament_champion_prize],
      },
      playoffPayouts: { champion: DEFAULTS.playoff_champion_prize, runnerUp: DEFAULTS.playoff_runnerup_prize, top3: DEFAULTS.playoff_top3_prize, qualified: DEFAULTS.playoff_qualified_prize, bettorComplete: DEFAULTS.season_complete_bettor_prize },
      seasonStarterBonus: { base: DEFAULTS.season_starter_base, increment: DEFAULTS.season_starter_increment, cap: DEFAULTS.season_starter_cap },
      nationalRaces: {
        grandPrix:  { entry: DEFAULTS.national_grand_prix_entry,  firstMult: DEFAULTS.national_grand_prix_mult },
        marbleMile: { entry: DEFAULTS.national_marble_mile_entry, firstMult: DEFAULTS.national_marble_mile_mult },
        speedDemon: { entry: DEFAULTS.national_speed_demon_entry, firstMult: DEFAULTS.national_speed_demon_mult },
        chaosCup:   { entry: DEFAULTS.national_chaos_cup_entry,   firstMult: DEFAULTS.national_chaos_cup_mult },
        secondRatio: DEFAULTS.national_second_ratio,
        thirdRatio:  DEFAULTS.national_third_ratio,
      },
      multiplayer: {
        blitz:        { entry: DEFAULTS.mp_blitz_entry,        pool: DEFAULTS.mp_blitz_pool },
        cup:          { entry: DEFAULTS.mp_cup_entry,          pool: DEFAULTS.mp_cup_pool },
        invitational: { entry: DEFAULTS.mp_invitational_entry, pool: DEFAULTS.mp_invitational_pool },
        rake: DEFAULTS.mp_rake,
        placementRatios: { first: DEFAULTS.mp_first_ratio, second: DEFAULTS.mp_second_ratio, third: DEFAULTS.mp_third_ratio },
      },
      challenges: {
        daily: { win: DEFAULTS.challenge_daily_win, top3: DEFAULTS.challenge_daily_top3, streak2: DEFAULTS.challenge_daily_streak2, wins3: DEFAULTS.challenge_daily_wins3 },
        weekly: { races5: DEFAULTS.challenge_weekly_races5, marbles3: DEFAULTS.challenge_weekly_marbles3, races10: DEFAULTS.challenge_weekly_races10, marbles5: DEFAULTS.challenge_weekly_marbles5 },
      },
      passMilestones: { level2: DEFAULTS.pass_level2_coins, level5: DEFAULTS.pass_level5_coins, level10: DEFAULTS.pass_level10_coins, level15: DEFAULTS.pass_level15_coins, level20: DEFAULTS.pass_level20_coins },
      storePacks: {
        starter: { coins: DEFAULTS.store_starter_coins },
        popular: { coins: DEFAULTS.store_popular_coins, promo: DEFAULTS.store_popular_promo },
        big:     { coins: DEFAULTS.store_big_coins,     promo: DEFAULTS.store_big_promo },
        whale:   { coins: DEFAULTS.store_whale_coins,   promo: DEFAULTS.store_whale_promo },
      },
      betHouseEdge: DEFAULTS.bet_house_edge,
      xpPerLevel: DEFAULTS.xp_per_level,
      trackBgImages: {},
    });
  }
}
