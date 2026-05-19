import { prisma } from '@donkey-ideas/database';

/**
 * Single source of truth for filtering out Apple sandbox / TestFlight
 * purchases AND for deriving which players are "really paying" (vs only
 * having a polluted player.totalSpent because a sandbox purchase synced).
 *
 * Why both pieces live here together: every revenue card and every
 * "paying users / conversion / segments" card must use the SAME
 * definition or the dashboard contradicts itself (e.g. Revenue=$0 but
 * Paying Users=1, like the user is currently looking at).
 *
 * Detection layers:
 *  1. status='sandbox' — newly recorded purchases tagged by the Apple
 *     verifyReceipt environment field at sync time (iap-verify.ts).
 *  2. Legacy heuristic for pre-tagging iOS rows: any iOS purchase whose
 *     storeTransactionId doesn't match Apple's production format (a
 *     numeric string of 13+ digits). Catches kxtyqh-class noise that's
 *     already in the DB so we don't need a backfill migration.
 *
 * Usage:
 *   const sb = await getSandboxAwareReport();
 *   // exclude sandbox from a gamePurchase query
 *   prisma.gamePurchase.aggregate({ where: { ...sb.excludeFilter, ... } })
 *   // count true paying users (ignore player.totalSpent — it includes sandbox $)
 *   sb.payerIds.size
 *   // get a single player's true non-sandbox lifetime spend
 *   sb.spendByPlayer.get(playerId) ?? 0
 *
 * One DB call serves the entire request — don't call this helper inside
 * a Promise.all alongside other queries; call it first and reuse.
 */

export interface SandboxAwareReport {
  /** Spread into any gamePurchase `where` clause to exclude sandbox rows. */
  excludeFilter: {
    AND: Array<
      | { status: { not: 'sandbox' } }
      | { id: { notIn: string[] } }
    >;
  };
  /** Set of playerIds with at least one non-sandbox 'completed' purchase. */
  payerIds: Set<string>;
  /** Map of playerId → sum of non-sandbox 'completed' purchase amounts (USD). */
  spendByPlayer: Map<string, number>;
}

const APPLE_PROD_TXN_REGEX = /^\d{13,}$/;

// In-process cache. Sandbox status doesn't change minute-to-minute, and this
// helper gets hammered (overview, players list, financials, segments, etc.
// each request a sandbox report). Caching for ~60s drops the per-request
// "scan every purchase row" cost while still picking up new purchases within
// a minute. Vercel cold-starts give us a fresh cache automatically.
let cached: SandboxAwareReport | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

export async function getSandboxAwareReport(): Promise<SandboxAwareReport> {
  if (cached && Date.now() - cachedAt < CACHE_MS) {
    return cached;
  }
  // Pull every purchase once so we can derive both the legacy-sandbox
  // exclusion list AND the per-player non-sandbox spend in a single query.
  const allPurchases = await prisma.gamePurchase.findMany({
    where: { status: { in: ['completed', 'refunded', 'sandbox'] } },
    select: {
      id: true,
      playerId: true,
      platform: true,
      status: true,
      priceUsd: true,
      storeTransactionId: true,
    },
  });

  const legacySandboxIds: string[] = [];
  const payerIds = new Set<string>();
  const spendByPlayer = new Map<string, number>();

  for (const p of allPurchases) {
    const isStatusSandbox = p.status === 'sandbox';
    const isLegacyIosSandbox =
      p.platform === 'ios' &&
      (!p.storeTransactionId || !APPLE_PROD_TXN_REGEX.test(p.storeTransactionId));

    if (isLegacyIosSandbox && !isStatusSandbox) {
      legacySandboxIds.push(p.id);
    }

    // Only "completed" non-sandbox rows count toward paying status + spend.
    // Refunded rows don't count (player got their money back).
    if (p.status === 'completed' && !isStatusSandbox && !isLegacyIosSandbox) {
      payerIds.add(p.playerId);
      const prev = spendByPlayer.get(p.playerId) ?? 0;
      spendByPlayer.set(p.playerId, prev + Number(p.priceUsd));
    }
  }

  const report: SandboxAwareReport = {
    excludeFilter: {
      AND: [
        { status: { not: 'sandbox' as const } },
        ...(legacySandboxIds.length > 0
          ? [{ id: { notIn: legacySandboxIds } }]
          : []),
      ],
    },
    payerIds,
    spendByPlayer,
  };

  cached = report;
  cachedAt = Date.now();

  return report;
}

/**
 * Legacy alias for routes that only need the where-filter. Prefer
 * getSandboxAwareReport() in new code — it returns the same filter
 * plus the payerIds / spendByPlayer maps for free (same DB hit).
 */
export async function getNonSandboxPurchaseFilter() {
  const report = await getSandboxAwareReport();
  return report.excludeFilter;
}
