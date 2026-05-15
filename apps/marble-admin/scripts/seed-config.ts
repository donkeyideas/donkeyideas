import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const configs = [
  // ── REWARDS ──
  { key: 'daily_bonus_day1', value: '200', label: 'Day 1 Login Bonus', group: 'rewards' },
  { key: 'daily_bonus_day2', value: '250', label: 'Day 2 Login Bonus', group: 'rewards' },
  { key: 'daily_bonus_day3', value: '300', label: 'Day 3 Login Bonus', group: 'rewards' },
  { key: 'daily_bonus_day4', value: '350', label: 'Day 4 Login Bonus', group: 'rewards' },
  { key: 'daily_bonus_day5', value: '400', label: 'Day 5 Login Bonus', group: 'rewards' },
  { key: 'daily_bonus_day6', value: '500', label: 'Day 6 Login Bonus', group: 'rewards' },
  { key: 'daily_bonus_day7', value: '750', label: 'Day 7 Login Bonus', group: 'rewards' },
  { key: 'pass_xp_quick_race', value: '125', label: 'Quick Race XP', group: 'rewards' },
  { key: 'pass_xp_bet_race', value: '250', label: 'Bet Race XP', group: 'rewards' },
  { key: 'pass_xp_win_bonus', value: '500', label: 'Win Bonus XP', group: 'rewards' },
  { key: 'pass_level_xp', value: '1000', label: 'XP Per Level', group: 'rewards' },
  { key: 'initial_coins', value: '1000', label: 'Starting Coins', group: 'rewards' },
  { key: 'odds_house_edge', value: '0.9', label: 'House Edge', group: 'rewards' },

  // ── BETTING ──
  { key: 'min_bet_amount', value: '25', label: 'Minimum Bet', group: 'betting' },
  { key: 'max_bet_amount', value: '500', label: 'Maximum Bet', group: 'betting' },
  { key: 'bet_amounts', value: '25, 100, 250, 500', label: 'Available Bet Amounts', group: 'betting' },
  { key: 'payout_1st', value: 'Full odds × bet', label: '1st Place Payout', group: 'betting' },
  { key: 'payout_2nd', value: '50% of bet', label: '2nd Place Payout', group: 'betting' },
  { key: 'payout_3rd', value: '25% of bet', label: '3rd Place Payout', group: 'betting' },
  { key: 'tournament_daily_entry', value: '100 coins', label: 'Daily Blitz Entry', group: 'betting' },
  { key: 'tournament_daily_prize', value: '4,600 coins', label: 'Daily Blitz Prize', group: 'betting' },
  { key: 'tournament_weekly_entry', value: '500 coins', label: 'Weekly Cup Entry', group: 'betting' },
  { key: 'tournament_weekly_prize', value: '23,000 coins', label: 'Weekly Cup Prize', group: 'betting' },
  { key: 'tournament_champion_entry', value: '1,000 coins', label: 'Champion Invitational Entry', group: 'betting' },
  { key: 'tournament_champion_prize', value: '46,000 coins', label: 'Champion Invitational Prize', group: 'betting' },
  { key: 'national_grand_prix_entry', value: '500 coins', label: 'Grand Prix Entry Fee', group: 'betting' },
  { key: 'national_grand_prix_mult', value: '5×', label: 'Grand Prix Multiplier', group: 'betting' },

  // ── FEATURES ──
  { key: 'feature_speed_bursts', value: 'true', label: 'Speed Bursts', group: 'features' },
  { key: 'feature_national_races', value: 'true', label: 'National Races', group: 'features' },
  { key: 'feature_tournaments', value: 'true', label: 'Tournaments', group: 'features' },
  { key: 'feature_season_mode', value: 'true', label: 'Season Mode', group: 'features' },
  { key: 'feature_season_franchise', value: 'true', label: 'Franchise Mode', group: 'features' },
  { key: 'feature_pass_system', value: 'true', label: 'Season Pass', group: 'features' },
  { key: 'feature_achievements', value: 'true', label: 'Achievements', group: 'features' },
  { key: 'feature_skins', value: 'true', label: 'Marble Skins', group: 'features' },
  { key: 'feature_custom_tracks', value: 'true', label: 'Custom Tracks', group: 'features' },
  { key: 'feature_challenges', value: 'true', label: 'Challenges', group: 'features' },
  { key: 'feature_leaderboards', value: 'true', label: 'Leaderboards', group: 'features' },
  { key: 'feature_quick_race', value: 'true', label: 'Quick Race', group: 'features' },
  { key: 'feature_sprite_rendering', value: 'true', label: 'Kenney Sprites', group: 'features' },
];

async function main() {
  console.log('Seeding GameConfig records...');

  for (const c of configs) {
    await prisma.gameConfig.upsert({
      where: { key: c.key },
      update: { value: c.value, label: c.label, group: c.group },
      create: c,
    });
    console.log(`  ✓ ${c.group}/${c.key} = ${c.value}`);
  }

  console.log(`\nDone! Seeded ${configs.length} config records.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
