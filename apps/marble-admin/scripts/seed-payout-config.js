/**
 * One-shot: seed all admin-editable payout config rows for the
 * "expose every hardcoded payout" pass. Defaults preserve current
 * mobile behavior — they only become editable.
 *
 * Safe to re-run: updates existing rows, creates missing ones.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const NEW = [
  // Tournament 2nd/3rd (25%/10% of 1st as standard ratio)
  ['tournament_daily_second_prize', '1150', 'Daily Blitz · 2nd Prize', 'rewards'],
  ['tournament_daily_third_prize', '460', 'Daily Blitz · 3rd Prize', 'rewards'],
  ['tournament_weekly_second_prize', '5750', 'Weekly Cup · 2nd Prize', 'rewards'],
  ['tournament_weekly_third_prize', '2300', 'Weekly Cup · 3rd Prize', 'rewards'],
  ['tournament_champion_second_prize', '11500', 'Champion Invitational · 2nd Prize', 'rewards'],
  ['tournament_champion_third_prize', '4600', 'Champion Invitational · 3rd Prize', 'rewards'],
  // Tournament round-survival payouts (per current hardcoded values)
  ['tournament_daily_round4_payout', '50', 'Daily Blitz · Survive R4', 'rewards'],
  ['tournament_daily_round5_payout', '100', 'Daily Blitz · Survive R5', 'rewards'],
  ['tournament_daily_round6_payout', '250', 'Daily Blitz · Survive R6', 'rewards'],
  ['tournament_weekly_round4_payout', '250', 'Weekly Cup · Survive R4', 'rewards'],
  ['tournament_weekly_round5_payout', '500', 'Weekly Cup · Survive R5', 'rewards'],
  ['tournament_weekly_round6_payout', '1250', 'Weekly Cup · Survive R6', 'rewards'],
  ['tournament_champion_round4_payout', '500', 'Champion · Survive R4', 'rewards'],
  ['tournament_champion_round5_payout', '1000', 'Champion · Survive R5', 'rewards'],
  ['tournament_champion_round6_payout', '2500', 'Champion · Survive R6', 'rewards'],
  // Season playoffs (franchise mode) + season starter
  ['playoff_champion_prize', '5000', 'Playoff Champion Bonus', 'rewards'],
  ['playoff_runnerup_prize', '2500', 'Playoff Runner-Up Bonus', 'rewards'],
  ['playoff_top3_prize', '1000', 'Playoff Top-3 Bonus', 'rewards'],
  ['playoff_qualified_prize', '1500', 'Playoff Qualified (no medal) Bonus', 'rewards'],
  ['season_complete_bettor_prize', '1500', 'Season Complete (Bettor) Bonus', 'rewards'],
  ['season_starter_base', '500', 'Season Starter Bonus Base (S2+)', 'rewards'],
  ['season_starter_increment', '250', 'Season Starter Bonus Increment per Season', 'rewards'],
  ['season_starter_cap', '2500', 'Season Starter Bonus Cap', 'rewards'],
  // National races
  ['national_grand_prix_entry', '500', 'Grand Prix Entry', 'betting'],
  ['national_grand_prix_mult', '5', 'Grand Prix 1st Multiplier', 'rewards'],
  ['national_marble_mile_entry', '300', 'Marble Mile Entry', 'betting'],
  ['national_marble_mile_mult', '3', 'Marble Mile 1st Multiplier', 'rewards'],
  ['national_speed_demon_entry', '200', 'Speed Demon Entry', 'betting'],
  ['national_speed_demon_mult', '2', 'Speed Demon 1st Multiplier', 'rewards'],
  ['national_chaos_cup_entry', '400', 'Chaos Cup Entry', 'betting'],
  ['national_chaos_cup_mult', '4', 'Chaos Cup 1st Multiplier', 'rewards'],
  ['national_second_ratio', '0.5', 'National 2nd Payout (× 1st)', 'rewards'],
  ['national_third_ratio', '0.25', 'National 3rd Payout (× 1st)', 'rewards'],
  // Multiplayer
  ['mp_blitz_entry', '100', 'MP Blitz Entry', 'betting'],
  ['mp_blitz_pool', '5000', 'MP Blitz Prize Pool', 'rewards'],
  ['mp_cup_entry', '500', 'MP Cup Entry', 'betting'],
  ['mp_cup_pool', '25000', 'MP Cup Prize Pool', 'rewards'],
  ['mp_invitational_entry', '1000', 'MP Invitational Entry', 'betting'],
  ['mp_invitational_pool', '50000', 'MP Invitational Prize Pool', 'rewards'],
  ['mp_rake', '0.20', 'MP House Rake', 'betting'],
  ['mp_first_ratio', '0.60', 'MP 1st Place Ratio', 'rewards'],
  ['mp_second_ratio', '0.20', 'MP 2nd Place Ratio', 'rewards'],
  ['mp_third_ratio', '0.10', 'MP 3rd Place Ratio', 'rewards'],
  // Challenges
  ['challenge_daily_win', '300', 'Daily: Win With Marble', 'rewards'],
  ['challenge_daily_top3', '200', 'Daily: Top 3 With Marble', 'rewards'],
  ['challenge_daily_streak2', '400', 'Daily: 2-Race Win Streak', 'rewards'],
  ['challenge_daily_wins3', '500', 'Daily: 3 Wins Today', 'rewards'],
  ['challenge_weekly_races5', '1500', 'Weekly: 5 Races', 'rewards'],
  ['challenge_weekly_marbles3', '2000', 'Weekly: 3 Different Marbles', 'rewards'],
  ['challenge_weekly_races10', '2000', 'Weekly: 10 Races', 'rewards'],
  ['challenge_weekly_marbles5', '2500', 'Weekly: 5 Different Marbles', 'rewards'],
  // Season Pass milestone coin rewards
  ['pass_level2_coins', '200', 'Season Pass L2 Coins', 'rewards'],
  ['pass_level5_coins', '500', 'Season Pass L5 Coins', 'rewards'],
  ['pass_level10_coins', '1000', 'Season Pass L10 Coins', 'rewards'],
  ['pass_level15_coins', '2000', 'Season Pass L15 Coins', 'rewards'],
  ['pass_level20_coins', '1500', 'Season Pass L20 Coins', 'rewards'],
  // Store coin packs (IAP $ price stays the same — only the coin grant adjusts)
  ['store_starter_coins', '1000', 'Store: Starter Pack Coins', 'rewards'],
  ['store_popular_coins', '6000', 'Store: Popular Pack Coins', 'rewards'],
  ['store_popular_promo', '0.20', 'Store: Popular Pack Promo Multiplier', 'rewards'],
  ['store_big_coins', '15000', 'Store: Big Pack Coins', 'rewards'],
  ['store_big_promo', '0.50', 'Store: Big Pack Promo Multiplier', 'rewards'],
  ['store_whale_coins', '40000', 'Store: Whale Pack Coins', 'rewards'],
  ['store_whale_promo', '0.60', 'Store: Whale Pack Promo Multiplier', 'rewards'],
  // Betting house edge
  ['bet_house_edge', '0.10', 'Bet House Edge', 'betting'],
];

(async () => {
  let created = 0, updated = 0, unchanged = 0;
  for (const [key, value, label, group] of NEW) {
    const existing = await p.gameConfig.findUnique({ where: { key } });
    if (existing) {
      if (existing.value !== value || existing.label !== label || existing.group !== group) {
        await p.gameConfig.update({ where: { key }, data: { value, label, group } });
        console.log('UPDATED', key, ':', existing.value, '→', value);
        updated++;
      } else {
        unchanged++;
      }
    } else {
      await p.gameConfig.create({ data: { key, value, label, group } });
      console.log('CREATED', key, '=', value);
      created++;
    }
  }
  console.log(`\nSeed complete: ${created} created, ${updated} updated, ${unchanged} unchanged`);
  await p.$disconnect();
})();
