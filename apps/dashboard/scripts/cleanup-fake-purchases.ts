/**
 * Cleanup script — marks every existing GamePurchase as `refunded` because
 * they were created by an unauthenticated client-side flow with no IAP
 * verification. Until now, the server trusted client-supplied prices, so
 * sandbox / pre-launch / bot button-presses got recorded as real revenue.
 *
 * What this script does:
 *   1. Marks all `status='completed'` purchases as `status='refunded'`
 *      (preserves history so you can audit) and sets refundedAt = now.
 *   2. Zeroes `gamePlayer.totalSpent` for any player whose entire purchase
 *      history is now refunded.
 *   3. Logs each affected row for audit.
 *
 * Safety:
 *   - DRY RUN by default. Pass --apply to actually write.
 *   - Run AFTER deploying the new sync/purchase route so no new fake
 *     records can be created mid-cleanup.
 *
 * Usage:
 *   npx tsx apps/dashboard/scripts/cleanup-fake-purchases.ts            # dry-run
 *   npx tsx apps/dashboard/scripts/cleanup-fake-purchases.ts --apply    # write
 */

import { prisma } from '@donkey-ideas/database';

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? '\n=== APPLY MODE — writing changes ===\n' : '\n=== DRY RUN — pass --apply to write ===\n');

  // Find every completed purchase. Under the new server contract, none of
  // these can be trusted because they were recorded before IAP verification
  // was added. New verified purchases going forward will have storeTransactionId
  // in `GPA.xxxx-xxxx-xxxx-xxxxx` format (Google) or a valid Apple format.
  const GOOGLE_ORDER_ID_REGEX = /^GPA\.\d{4}-\d{4}-\d{4}-\d{5,}$/;

  const purchases = await prisma.gamePurchase.findMany({
    where: { status: 'completed' },
    select: {
      id: true,
      playerId: true,
      productId: true,
      productName: true,
      priceUsd: true,
      platform: true,
      storeTransactionId: true,
      purchasedAt: true,
    },
    orderBy: { purchasedAt: 'asc' },
  });

  console.log(`Found ${purchases.length} completed purchase records.\n`);

  const fakes = purchases.filter((p) => {
    if (!p.storeTransactionId) return true;
    if (p.platform === 'android') return !GOOGLE_ORDER_ID_REGEX.test(p.storeTransactionId);
    // For iOS we can't validate without Apple Server API — flag everything as
    // fake for now, since the previous client never sent real transaction IDs.
    return true;
  });

  console.log(`Of those, ${fakes.length} are unverified / fake and will be marked refunded.\n`);

  // Group by player to compute totalSpent rollback
  const refundsByPlayer: Record<string, number> = {};
  for (const p of fakes) {
    refundsByPlayer[p.playerId] = (refundsByPlayer[p.playerId] ?? 0) + Number(p.priceUsd);
  }

  for (const f of fakes.slice(0, 20)) {
    console.log(`  - ${f.purchasedAt.toISOString()}  $${f.priceUsd}  ${f.productId}  player=${f.playerId.slice(0, 8)}  tx=${f.storeTransactionId ?? '(none)'}`);
  }
  if (fakes.length > 20) console.log(`  ... and ${fakes.length - 20} more\n`);

  console.log(`\nAffected players: ${Object.keys(refundsByPlayer).length}`);
  console.log(`Total fake revenue to be zeroed: $${Object.values(refundsByPlayer).reduce((s, v) => s + v, 0).toFixed(2)}\n`);

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to write changes.');
    return;
  }

  // Apply: mark purchases refunded + decrement totalSpent for each player
  const now = new Date();
  let updatedPurchases = 0;
  let updatedPlayers = 0;

  for (const f of fakes) {
    await prisma.gamePurchase.update({
      where: { id: f.id },
      data: { status: 'refunded', refundedAt: now },
    });
    updatedPurchases++;
  }

  for (const [playerId, amount] of Object.entries(refundsByPlayer)) {
    await prisma.gamePlayer.update({
      where: { id: playerId },
      data: { totalSpent: { decrement: amount } },
    });
    updatedPlayers++;
  }

  // Floor any totalSpent that drifted negative due to mixed real/fake history
  await prisma.$executeRaw`UPDATE game_players SET "totalSpent" = 0 WHERE "totalSpent" < 0`;

  console.log(`Done. Refunded ${updatedPurchases} purchases across ${updatedPlayers} players.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
