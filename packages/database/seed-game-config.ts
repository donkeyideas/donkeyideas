import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const configs = [
  // Rewards
  { key: 'daily_bonus_base', value: '200', label: 'Daily Login Bonus (Base)', group: 'rewards' },
  { key: 'streak_multiplier_cap', value: '2.0', label: 'Streak Multiplier Cap', group: 'rewards' },
  { key: 'race_win_reward', value: '500', label: 'Race Win Reward', group: 'rewards' },
  { key: 'xp_per_race', value: '250', label: 'XP Per Race', group: 'rewards' },
  { key: 'xp_win_bonus', value: '500', label: 'XP Win Bonus', group: 'rewards' },

  // Betting
  { key: 'house_edge', value: '0.10', label: 'House Edge (%)', group: 'betting' },
  { key: 'min_bet', value: '25', label: 'Min Bet Amount', group: 'betting' },
  { key: 'max_bet', value: '500', label: 'Max Bet Amount', group: 'betting' },
  { key: 'daily_bet_limit', value: '10', label: 'Daily Bet Limit', group: 'betting' },

  // Limits
  { key: 'daily_purchase_cap', value: '25000', label: 'Daily Purchase Cap (coins)', group: 'limits' },
  { key: 'daily_purchase_txn_limit', value: '3', label: 'Daily Purchase Txn Limit', group: 'limits' },
  { key: 'starting_coins', value: '1000', label: 'Starting Coins', group: 'limits' },

  // Features
  { key: 'purchases_enabled', value: 'true', label: 'In-App Purchases', group: 'features' },
  { key: 'betting_enabled', value: 'true', label: 'Betting System', group: 'features' },
  { key: 'daily_rewards_enabled', value: 'true', label: 'Daily Login Rewards', group: 'features' },
  { key: 'season_enabled', value: 'true', label: 'Season Mode', group: 'features' },
  { key: 'tournaments_enabled', value: 'true', label: 'Tournaments', group: 'features' },
  { key: 'national_races_enabled', value: 'true', label: 'National Races', group: 'features' },
  { key: 'emergency_freeze', value: 'false', label: 'Emergency: Freeze All Purchases', group: 'features' },
];

async function main() {
  console.log('Seeding game config...');

  for (const config of configs) {
    await prisma.gameConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, label: config.label, group: config.group },
      create: config,
    });
  }

  console.log(`Seeded ${configs.length} config entries.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
