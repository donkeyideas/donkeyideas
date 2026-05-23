/**
 * Single dispatcher for all coin-altering actions.
 *
 * Phase 1 (foundation): only `claim_daily` implemented. Other actions
 * (claim_achievement, claim_challenge, place_bet, settle_bet, etc.) are
 * stubbed and will return 501 until wired in subsequent phases.
 *
 * Contract:
 *   - Client sends action + idempotencyKey (uuid) + action-specific payload
 *   - Server validates against authoritative state, applies the mutation,
 *     and returns the new coin balance
 *   - Idempotency key prevents replay: if the same key is seen again, the
 *     server returns the previously-recorded balance without re-applying
 *
 * Every mutation writes a GameCoinTransaction ledger row inside a Prisma
 * $transaction so balance and ledger stay consistent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';
import { resolveChallenge } from '@/lib/marble-racing/challenges';
import {
  TOURNAMENT_CONFIGS,
  NATIONAL_EVENTS,
  CUSTOM_TRACK_ENTRY_FEE,
  MP_TIER_CONFIGS,
  nationalPayoutForPlacement,
} from '@/lib/marble-racing/economy-config';

type Action =
  | 'claim_daily'
  | 'claim_achievement'
  | 'claim_challenge'
  | 'place_bet'
  | 'settle_bet'
  | 'tournament_entry'
  | 'tournament_payout'
  | 'playoff_payout'
  | 'national_entry'
  | 'national_payout'
  | 'mp_entry'
  | 'mp_payout'
  | 'custom_track_entry'
  | 'season_starter_bonus'
  | 'client_balance_reconciliation'
  | 'reward_ad';

interface TransactionRequest {
  action: Action;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
}

interface TransactionResponse {
  success: true;
  balance: number;
  transaction: {
    id: string;
    type: string;
    amount: number;
    createdAt: string;
  };
  result?: Record<string, unknown>;
}

const DAILY_BONUS_BY_STREAK = [0, 100, 200, 300, 400, 500, 750, 1000]; // index = streak day (1..7+)

export async function POST(request: NextRequest) {
  try {
    const token = extractGameToken(request);
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const player = await getGamePlayerByToken(token);
    if (!player) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const body = (await request.json()) as TransactionRequest;
    const { action, idempotencyKey, payload = {} } = body;

    if (!action || !idempotencyKey) {
      return NextResponse.json(
        { error: { message: 'action and idempotencyKey are required' } },
        { status: 400 },
      );
    }

    // Idempotency check — if this key was already processed, return the
    // previous result without re-applying. Safe for client retries / network
    // hiccups.
    const existing = await prisma.gameCoinTransaction.findUnique({
      where: { idempotencyKey },
      select: { id: true, type: true, amount: true, balance: true, createdAt: true, playerId: true },
    });
    if (existing) {
      if (existing.playerId !== player.id) {
        return NextResponse.json(
          { error: { message: 'Idempotency key belongs to a different player' } },
          { status: 409 },
        );
      }
      return NextResponse.json({
        success: true,
        balance: existing.balance,
        transaction: {
          id: existing.id,
          type: existing.type,
          amount: existing.amount,
          createdAt: existing.createdAt.toISOString(),
        },
        replayed: true,
      });
    }

    switch (action) {
      case 'claim_daily':
        return claimDaily(player.id, idempotencyKey, payload);
      case 'claim_challenge':
        return claimChallenge(player.id, idempotencyKey, payload);
      case 'place_bet':
        return placeBet(player.id, idempotencyKey, payload);
      case 'settle_bet':
        return settleBet(player.id, idempotencyKey, payload);
      case 'tournament_entry':
        return chargeEntryFee(player.id, idempotencyKey, payload, 'tournament_entry');
      case 'national_entry':
        return chargeEntryFee(player.id, idempotencyKey, payload, 'national_entry');
      case 'custom_track_entry':
        return chargeEntryFee(player.id, idempotencyKey, payload, 'custom_track_entry');
      case 'tournament_payout':
        return creditPayout(player.id, idempotencyKey, payload, 'tournament_payout');
      case 'national_payout':
        return creditPayout(player.id, idempotencyKey, payload, 'national_payout');
      case 'playoff_payout':
        return creditPayout(player.id, idempotencyKey, payload, 'playoff_payout');
      case 'mp_entry':
        return chargeMpEntry(player.id, payload);
      case 'mp_payout':
        return creditMpPayout(player.id, payload);

      case 'claim_achievement':
        // Achievements in this game don't grant coins — they unlock skins
        // and badges, which are state-only. No-op endpoint.
        return NextResponse.json(
          { error: { message: 'Achievements do not grant coins; no transaction needed' } },
          { status: 400 },
        );

      case 'season_starter_bonus':
        return seasonStarterBonus(player.id, idempotencyKey, payload);
      case 'client_balance_reconciliation':
        return reconcileClientBalance(player.id, idempotencyKey, payload);
      case 'reward_ad':
        return rewardAd(player.id, idempotencyKey, payload);

      default:
        return NextResponse.json(
          { error: { message: `Unknown action: ${String(action)}` } },
          { status: 400 },
        );
    }
  } catch (err: any) {
    console.error('[economy/transaction]', err);
    return NextResponse.json(
      { error: { message: err.message ?? 'Transaction failed' } },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Action handlers
// ─────────────────────────────────────────────────────────────────────────

async function claimDaily(
  playerId: string,
  _idempotencyKey: string,
  _payload: Record<string, unknown>,
): Promise<NextResponse<TransactionResponse | { error: { message: string } }>> {
  /* Natural idempotency key — `daily_bonus:{playerId}:{YYYY-MM-DD}`.
   *
   * Previously the "already claimed today" lookup ran outside the
   * transaction; two simultaneous POSTs could both pass the check and
   * double-credit. The natural key now leverages the @unique constraint
   * on idempotencyKey so the second concurrent write fails at the DB
   * level (no race window). Also moved the reads inside $transaction so
   * the ledger balance snapshot stays consistent under concurrency. */
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yyyy = todayStart.getFullYear();
  const mm = String(todayStart.getMonth() + 1).padStart(2, '0');
  const dd = String(todayStart.getDate()).padStart(2, '0');
  const naturalKey = `daily_bonus:${playerId}:${yyyy}-${mm}-${dd}`;

  const existing = await prisma.gameCoinTransaction.findUnique({
    where: { idempotencyKey: naturalKey },
    select: { id: true, type: true, amount: true, balance: true, createdAt: true },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      balance: existing.balance,
      transaction: {
        id: existing.id,
        type: existing.type,
        amount: existing.amount,
        createdAt: existing.createdAt.toISOString(),
      },
      replayed: true,
    });
  }

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.gamePlayer.findUnique({
      where: { id: playerId },
      select: { coins: true, dailyStreak: true },
    });
    if (!player) throw new Error('Player not found');

    const yesterdayClaim = await tx.gameCoinTransaction.findFirst({
      where: {
        playerId,
        type: 'daily_bonus',
        createdAt: { gte: yesterdayStart, lt: todayStart },
      },
      select: { id: true },
    });
    const newStreak = yesterdayClaim ? player.dailyStreak + 1 : 1;
    const streakIndex = Math.min(newStreak, DAILY_BONUS_BY_STREAK.length - 1);
    const bonus = DAILY_BONUS_BY_STREAK[streakIndex];

    const updated = await tx.gamePlayer.update({
      where: { id: playerId },
      data: {
        coins: { increment: bonus },
        dailyStreak: newStreak,
        lastActiveAt: now,
      },
      select: { coins: true },
    });
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'daily_bonus',
        amount: bonus,
        balance: updated.coins,
        description: `Daily bonus day ${newStreak}`,
        idempotencyKey: naturalKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true, balance: true },
    });
    return { txRow, newStreak, bonus };
  }).catch((err: any) => {
    if (err?.message === 'Player not found') {
      return { __error: { status: 404, message: 'Player not found' } } as const;
    }
    if (err?.code === 'P2002') {
      return { __error: { status: 409, message: 'Daily bonus already claimed today' } } as const;
    }
    throw err;
  });

  if ('__error' in result) {
    return NextResponse.json({ error: { message: result.__error.message } }, { status: result.__error.status });
  }

  const { txRow, newStreak, bonus } = result;
  console.log(`[economy] claimDaily player=${playerId} streak=${newStreak} bonus=${bonus} newBalance=${txRow.balance}`);

  return NextResponse.json({
    success: true,
    balance: txRow.balance,
    transaction: {
      id: txRow.id,
      type: txRow.type,
      amount: txRow.amount,
      createdAt: txRow.createdAt.toISOString(),
    },
    result: { streak: newStreak, bonus },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// claim_challenge — server resolves the challenge ID to its canonical reward
// (no client-supplied reward value is trusted), then dedupes via the natural
// idempotency key (claim_challenge:{playerId}:{challengeId}).
// ─────────────────────────────────────────────────────────────────────────
async function claimChallenge(
  playerId: string,
  idempotencyKey: string,
  payload: Record<string, unknown>,
): Promise<NextResponse> {
  const challengeId = typeof payload.challengeId === 'string' ? payload.challengeId : null;
  if (!challengeId) {
    return NextResponse.json({ error: { message: 'challengeId required' } }, { status: 400 });
  }

  const canonical = resolveChallenge(challengeId);
  if (!canonical) {
    return NextResponse.json(
      { error: { message: `Unknown or expired challenge: ${challengeId}` } },
      { status: 400 },
    );
  }

  // Hard guard against reward inflation: cap at 5000 even if config drifts.
  const reward = Math.min(canonical.reward, 5000);

  const player = await prisma.gamePlayer.findUnique({
    where: { id: playerId },
    select: { coins: true },
  });
  if (!player) {
    return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
  }

  const newBalance = player.coins + reward;
  const result = await prisma.$transaction(async (tx) => {
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'claim_challenge',
        amount: reward,
        balance: newBalance,
        description: `Challenge: ${canonical.description}`,
        idempotencyKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true },
    });
    await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { increment: reward }, lastActiveAt: new Date() },
    });
    return txRow;
  });

  return NextResponse.json({
    success: true,
    balance: newBalance,
    transaction: {
      id: result.id,
      type: result.type,
      amount: result.amount,
      createdAt: result.createdAt.toISOString(),
    },
    result: { challengeId, reward, description: canonical.description },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// season_starter_bonus — returning players get a coin gift on starting a
// new season (Season 2+). Server derives the bonus amount from the
// requested seasonNumber so the client can't inflate it.
//
// Formula (matches gameStore.startNewSeason):
//   bonus = min(2500, 500 + (seasonNumber - 2) * 250)
//
// Idempotency uses the natural key `season_starter:{playerId}:{seasonNumber}`
// — without this, the action would be re-applied every time the player
// reopened the app while the season was active.
// ─────────────────────────────────────────────────────────────────────────
async function seasonStarterBonus(
  playerId: string,
  _transportIdempotencyKey: string,
  payload: Record<string, unknown>,
): Promise<NextResponse> {
  const seasonNumber = typeof payload.seasonNumber === 'number' ? payload.seasonNumber : null;
  if (!seasonNumber || seasonNumber < 2 || !Number.isInteger(seasonNumber)) {
    return NextResponse.json(
      { error: { message: 'seasonNumber (integer >= 2) required' } },
      { status: 400 },
    );
  }
  // Same formula as the mobile client (gameStore.startNewSeason). Server
  // re-derives so the client can't ask for a bigger reward than allowed.
  const bonus = Math.min(2500, 500 + (seasonNumber - 2) * 250);

  // Natural idempotency key constructed server-side from authenticated
  // playerId + seasonNumber. This guarantees a player can only claim the
  // bonus for a given season ONCE, regardless of how many times the client
  // POSTs (cold start, retry queue replay, double-tap). The transport-level
  // idempotencyKey the client sent is ignored for this action.
  const naturalKey = `season_starter:${playerId}:${seasonNumber}`;

  const existing = await prisma.gameCoinTransaction.findUnique({
    where: { idempotencyKey: naturalKey },
    select: { id: true, type: true, amount: true, balance: true, createdAt: true },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      balance: existing.balance,
      transaction: {
        id: existing.id,
        type: existing.type,
        amount: existing.amount,
        createdAt: existing.createdAt.toISOString(),
      },
      replayed: true,
      result: { seasonNumber, bonus: existing.amount },
    });
  }

  const player = await prisma.gamePlayer.findUnique({
    where: { id: playerId },
    select: { coins: true },
  });
  if (!player) {
    return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
  }

  const newBalance = player.coins + bonus;
  const result = await prisma.$transaction(async (tx) => {
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'season_starter_bonus',
        amount: bonus,
        balance: newBalance,
        description: `Season ${seasonNumber} Starter Bonus`,
        idempotencyKey: naturalKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true },
    });
    await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { increment: bonus }, lastActiveAt: new Date() },
    });
    return txRow;
  });

  return NextResponse.json({
    success: true,
    balance: newBalance,
    transaction: {
      id: result.id,
      type: result.type,
      amount: result.amount,
      createdAt: result.createdAt.toISOString(),
    },
    result: { seasonNumber, bonus },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// client_balance_reconciliation — one-time backfill for accounts that have
// drifted because of historical local-only coin grants (claimed challenges,
// season starter bonuses, MP refunds) that pre-date the wiring of those
// actions to applyEconomyAction.
//
// Contract:
//   - Mobile reads its local coins, compares to server.
//   - If local > server by > 0, posts { localBalance: number }.
//   - Server caps the credit at RECONCILE_MAX_DELTA so a tampered client
//     can't claim millions of coins. Server also locks the action to once-
//     per-player via a natural idempotency key (the version suffix lets us
//     allow a second one if we ever need to backfill again).
//   - On replay (same key), returns the original balance — no double credit.
//
// Records the transaction as type='client_balance_reconciliation' with an
// adminNote describing the gap, so an operator can audit which accounts
// got auto-adjusted and by how much.
// ─────────────────────────────────────────────────────────────────────────
const RECONCILE_MAX_DELTA = 50_000;
/* v4 bump: v3 ALSO silently no-op'd on a subset of installs. The client-
 * side hydration wait helped but didn't fully fix the race — Zustand's
 * hasHydrated() can return true before the deep state has merged on
 * slow devices, so the read still picked up the default 1000. Client
 * v4 reads coins straight from AsyncStorage, bypassing Zustand
 * hydration entirely, AND only marks the AsyncStorage DONE flag when
 * the server actually credited something (so misreads retry next
 * launch instead of locking).
 *
 * Server-side: just the version bump. The natural-key lock
 * (`balance_reconcile:{playerId}:v4`) is now a fresh slot per player,
 * so accounts that got truly-falsely DONE-marked at v3 client-side
 * (where no server transaction was ever recorded because rawDelta <= 0)
 * can now run a fresh pass.
 *
 * Always bump BOTH this constant and the matching one in
 * lib/balanceReconcile.ts on the client. */
const RECONCILE_VERSION = 'v4';

async function reconcileClientBalance(
  playerId: string,
  _transportIdempotencyKey: string,
  payload: Record<string, unknown>,
): Promise<NextResponse> {
  const localBalance = typeof payload.localBalance === 'number' ? payload.localBalance : null;
  if (localBalance === null || !Number.isFinite(localBalance) || localBalance < 0) {
    return NextResponse.json(
      { error: { message: 'localBalance (non-negative number) required' } },
      { status: 400 },
    );
  }

  // Lock to one reconciliation per player per version.
  const naturalKey = `balance_reconcile:${playerId}:${RECONCILE_VERSION}`;
  const existing = await prisma.gameCoinTransaction.findUnique({
    where: { idempotencyKey: naturalKey },
    select: { id: true, type: true, amount: true, balance: true, createdAt: true },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      balance: existing.balance,
      transaction: {
        id: existing.id,
        type: existing.type,
        amount: existing.amount,
        createdAt: existing.createdAt.toISOString(),
      },
      replayed: true,
      result: { credited: existing.amount, reason: 'already_reconciled' },
    });
  }

  /* Read + write inside the same transaction. Previously the player.coins
   * read happened BEFORE the $transaction, so a concurrent race-sync /
   * daily-claim could land between the read and the increment, causing
   * the reconcile to over-credit by the amount of the concurrent change.
   * Now the read is inside the tx so the rawDelta calculation sees the
   * authoritative balance at the moment of crediting. */
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.gamePlayer.findUnique({
      where: { id: playerId },
      select: { coins: true },
    });
    if (!player) {
      return { __error: { status: 404, message: 'Player not found' } } as const;
    }
    const rawDelta = Math.floor(localBalance) - player.coins;
    if (rawDelta <= 0) {
      return { __noGap: { balance: player.coins } } as const;
    }
    const credited = Math.min(rawDelta, RECONCILE_MAX_DELTA);
    const updated = await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { increment: credited }, lastActiveAt: new Date() },
      select: { coins: true },
    });
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'client_balance_reconciliation',
        amount: credited,
        balance: updated.coins,
        description: `Client balance reconciliation (mobile=${localBalance}, server-before=${player.coins}, credited=${credited})`,
        idempotencyKey: naturalKey,
        adminNote: `auto-reconcile v${RECONCILE_VERSION}: closed ${credited} of ${rawDelta} coin gap`,
      },
      select: { id: true, type: true, amount: true, createdAt: true, balance: true },
    });
    return { __ok: { txRow, credited, rawDelta } } as const;
  });

  if ('__error' in result) {
    return NextResponse.json({ error: { message: result.__error.message } }, { status: result.__error.status });
  }
  if ('__noGap' in result) {
    console.log(`[economy] reconcile player=${playerId} local=${localBalance} server=${result.__noGap.balance} no_gap`);
    return NextResponse.json({
      success: true,
      balance: result.__noGap.balance,
      transaction: null,
      result: { credited: 0, reason: 'no_gap' },
    });
  }

  const { txRow, credited, rawDelta } = result.__ok;
  console.log(`[economy] reconcile player=${playerId} credited=${credited} newBalance=${txRow.balance} gap=${rawDelta}`);

  return NextResponse.json({
    success: true,
    balance: txRow.balance,
    transaction: {
      id: txRow.id,
      type: txRow.type,
      amount: txRow.amount,
      createdAt: txRow.createdAt.toISOString(),
    },
    result: { credited, capped: rawDelta > RECONCILE_MAX_DELTA },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Entry fees (debit) — tournament_entry, national_entry, custom_track_entry
// Server validates the entry fee matches the canonical config, balance is
// sufficient, then debits.
// ─────────────────────────────────────────────────────────────────────────
async function chargeEntryFee(
  playerId: string,
  _transportKey: string,
  payload: Record<string, unknown>,
  kind: 'tournament_entry' | 'national_entry' | 'custom_track_entry',
): Promise<NextResponse> {
  let fee = 0;
  let description = '';
  let naturalKey = '';

  /* Each entry fee uses a NATURAL idempotency key derived from the event
   * being entered, NOT the client's transport idempotencyKey. The latter
   * is a fresh UUID per call — a buggy or malicious client retrying with
   * different UUIDs would otherwise be charged multiple times for the
   * same tournament entry.
   *
   *   tournament_entry → `tournament_entry:{playerId}:{tournamentId}:{round}`
   *   national_entry   → `national_entry:{playerId}:{eventId}:{seriesIndex}`
   *   custom_track_entry → `custom_track_entry:{playerId}:{seed}` */
  if (kind === 'tournament_entry') {
    const id = typeof payload.tournamentId === 'string' ? payload.tournamentId : '';
    const round = Number(payload.round ?? 0);
    const cfg = TOURNAMENT_CONFIGS[id];
    if (!cfg) {
      return NextResponse.json({ error: { message: `Unknown tournament: ${id}` } }, { status: 400 });
    }
    fee = cfg.entryFee;
    description = `${cfg.name} entry fee (round ${round})`;
    naturalKey = `tournament_entry:${playerId}:${id}:${round}`;
  } else if (kind === 'national_entry') {
    const id = typeof payload.eventId === 'string' ? payload.eventId : '';
    const seriesIndex = Number(payload.seriesRaceIndex ?? 0);
    const cfg = NATIONAL_EVENTS[id];
    if (!cfg) {
      return NextResponse.json({ error: { message: `Unknown national event: ${id}` } }, { status: 400 });
    }
    fee = cfg.entryFee;
    description = `${cfg.name} entry fee`;
    naturalKey = `national_entry:${playerId}:${id}:${seriesIndex}`;
  } else {
    const seed = typeof payload.seed === 'string' ? payload.seed : String(payload.seed ?? Date.now());
    fee = CUSTOM_TRACK_ENTRY_FEE;
    description = 'Custom track entry fee';
    naturalKey = `custom_track_entry:${playerId}:${seed}`;
  }

  // Idempotency check using the natural key — if this entry was already
  // charged, return the existing row instead of double-charging.
  const existing = await prisma.gameCoinTransaction.findUnique({
    where: { idempotencyKey: naturalKey },
    select: { id: true, type: true, amount: true, balance: true, createdAt: true },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      balance: existing.balance,
      transaction: {
        id: existing.id,
        type: existing.type,
        amount: existing.amount,
        createdAt: existing.createdAt.toISOString(),
      },
      replayed: true,
      result: { fee },
    });
  }

  // Read + write inside the transaction so the balance snapshot is
  // consistent with any concurrent coin updates.
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.gamePlayer.findUnique({
      where: { id: playerId },
      select: { coins: true },
    });
    if (!player) throw new Error('Player not found');
    if (player.coins < fee) {
      throw new Error(`Insufficient balance: ${player.coins} < ${fee}`);
    }
    const updated = await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { decrement: fee }, lastActiveAt: new Date() },
      select: { coins: true },
    });
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: kind,
        amount: -fee,
        balance: updated.coins,
        description,
        idempotencyKey: naturalKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true, balance: true },
    });
    return txRow;
  }).catch((err: any) => {
    const msg = err?.message || 'entry fee failed';
    if (msg.startsWith('Insufficient balance')) {
      return { __error: { status: 402, message: msg } };
    }
    if (msg === 'Player not found') {
      return { __error: { status: 404, message: msg } };
    }
    throw err;
  });

  if ('__error' in result) {
    return NextResponse.json({ error: { message: result.__error.message } }, { status: result.__error.status });
  }

  console.log(`[economy] ${kind} player=${playerId} fee=${fee} newBalance=${result.balance} key=${naturalKey}`);

  return NextResponse.json({
    success: true,
    balance: result.balance,
    transaction: {
      id: result.id,
      type: result.type,
      amount: result.amount,
      createdAt: result.createdAt.toISOString(),
    },
    result: { fee },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Payouts (credit) — tournament_payout, national_payout, playoff_payout
// Server validates the payout amount against canonical max for that event.
// Caps prevent client-claimed inflated payouts.
// ─────────────────────────────────────────────────────────────────────────
const PLAYOFF_PAYOUT_CAP = 50_000;

async function creditPayout(
  playerId: string,
  _transportKey: string,
  payload: Record<string, unknown>,
  kind: 'tournament_payout' | 'national_payout' | 'playoff_payout',
): Promise<NextResponse> {
  let payout = 0;
  let description = '';
  let naturalKey = '';

  /* Natural idempotency keys per payout so a tampered/buggy client can't
   * replay the same payout with different transport UUIDs to mint coins.
   *
   *   tournament_payout → `tournament_payout:{playerId}:{tournamentId}:{round}`
   *   national_payout   → `national_payout:{playerId}:{eventId}:{seriesIndex}:{placement}`
   *   playoff_payout    → `playoff_payout:{playerId}:{seasonNumber}:{seriesId}` */
  if (kind === 'tournament_payout') {
    const id = typeof payload.tournamentId === 'string' ? payload.tournamentId : '';
    const round = Number(payload.round ?? 0);
    const cfg = TOURNAMENT_CONFIGS[id];
    if (!cfg) {
      return NextResponse.json({ error: { message: `Unknown tournament: ${id}` } }, { status: 400 });
    }
    const claimed = Number(payload.amount ?? 0);
    if (claimed <= 0 || claimed > cfg.prizePool) {
      return NextResponse.json(
        { error: { message: `Payout out of range (0..${cfg.prizePool}): ${claimed}` } },
        { status: 400 },
      );
    }
    payout = Math.round(claimed);
    description = `${cfg.name} payout (round ${round})`;
    naturalKey = `tournament_payout:${playerId}:${id}:${round}`;
  } else if (kind === 'national_payout') {
    const id = typeof payload.eventId === 'string' ? payload.eventId : '';
    const placement = Number(payload.placement ?? 0);
    const seriesIndex = Number(payload.seriesRaceIndex ?? 0);
    const cfg = NATIONAL_EVENTS[id];
    if (!cfg) {
      return NextResponse.json({ error: { message: `Unknown national event: ${id}` } }, { status: 400 });
    }
    payout = nationalPayoutForPlacement(id, placement);
    if (payout <= 0) {
      return NextResponse.json(
        { error: { message: `No payout for placement ${placement}` } },
        { status: 400 },
      );
    }
    description = `${cfg.name} payout (placement ${placement})`;
    naturalKey = `national_payout:${playerId}:${id}:${seriesIndex}:${placement}`;
  } else {
    // playoff_payout — Phase 4 will replace this with server-side bracket
    // adjudication. Until then we require a seriesId so the natural key
    // pins this credit to a specific playoff series — preventing the
    // 50k-replay-with-fresh-UUIDs exploit that previously existed.
    const seriesId =
      typeof payload.seriesId === 'string' ? payload.seriesId : '';
    const seasonNumber = Number(payload.seasonNumber ?? 0);
    if (!seriesId) {
      return NextResponse.json(
        { error: { message: 'playoff_payout requires seriesId in payload' } },
        { status: 400 },
      );
    }
    const claimed = Number(payload.amount ?? 0);
    if (claimed <= 0 || claimed > PLAYOFF_PAYOUT_CAP) {
      return NextResponse.json(
        { error: { message: `Playoff payout out of range (0..${PLAYOFF_PAYOUT_CAP}): ${claimed}` } },
        { status: 400 },
      );
    }
    payout = Math.round(claimed);
    description = `Playoff payout (season ${seasonNumber}, series ${seriesId})`;
    naturalKey = `playoff_payout:${playerId}:${seasonNumber}:${seriesId}`;
  }

  // Natural-key idempotency check
  const existing = await prisma.gameCoinTransaction.findUnique({
    where: { idempotencyKey: naturalKey },
    select: { id: true, type: true, amount: true, balance: true, createdAt: true },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      balance: existing.balance,
      transaction: {
        id: existing.id,
        type: existing.type,
        amount: existing.amount,
        createdAt: existing.createdAt.toISOString(),
      },
      replayed: true,
      result: { payout },
    });
  }

  // Read + write inside the transaction so balance snapshot is consistent.
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.gamePlayer.findUnique({
      where: { id: playerId },
      select: { coins: true },
    });
    if (!player) throw new Error('Player not found');
    const updated = await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { increment: payout }, lastActiveAt: new Date() },
      select: { coins: true },
    });
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: kind,
        amount: payout,
        balance: updated.coins,
        description,
        idempotencyKey: naturalKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true, balance: true },
    });
    return txRow;
  });

  console.log(`[economy] ${kind} player=${playerId} payout=${payout} newBalance=${result.balance} key=${naturalKey}`);

  return NextResponse.json({
    success: true,
    balance: result.balance,
    transaction: {
      id: result.id,
      type: result.type,
      amount: result.amount,
      createdAt: result.createdAt.toISOString(),
    },
    result: { payout },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Multiplayer lobby — entry fee + payout
//
// Previously the mobile client called store.removeCoins/addCoins directly,
// so the server never knew an MP entry happened and a tampered client could
// mint coins by claiming a payout the server hadn't authorized. These
// handlers debit/credit server-side with natural keys so:
//   - The same lobbyId can only be entered once per player (no double-charge
//     on a retried tap).
//   - A payout per {lobbyId, placement} is bound by tier prizePool cap and
//     can't be replayed with fresh transport UUIDs.
// ─────────────────────────────────────────────────────────────────────────
async function chargeMpEntry(
  playerId: string,
  payload: Record<string, unknown>,
): Promise<NextResponse> {
  const tier = typeof payload.tier === 'string' ? payload.tier : '';
  const lobbyId = typeof payload.lobbyId === 'string' ? payload.lobbyId : '';
  const cfg = MP_TIER_CONFIGS[tier];
  if (!cfg) {
    return NextResponse.json({ error: { message: `Unknown MP tier: ${tier}` } }, { status: 400 });
  }
  if (!lobbyId) {
    return NextResponse.json({ error: { message: 'mp_entry requires lobbyId' } }, { status: 400 });
  }

  const fee = cfg.entryFee;
  const description = `${cfg.label} entry fee`;
  const naturalKey = `mp_entry:${playerId}:${lobbyId}`;

  const existing = await prisma.gameCoinTransaction.findUnique({
    where: { idempotencyKey: naturalKey },
    select: { id: true, type: true, amount: true, balance: true, createdAt: true },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      balance: existing.balance,
      transaction: {
        id: existing.id,
        type: existing.type,
        amount: existing.amount,
        createdAt: existing.createdAt.toISOString(),
      },
      replayed: true,
      result: { fee },
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.gamePlayer.findUnique({
      where: { id: playerId },
      select: { coins: true },
    });
    if (!player) throw new Error('Player not found');
    if (player.coins < fee) throw new Error(`Insufficient balance: ${player.coins} < ${fee}`);
    const updated = await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { decrement: fee }, lastActiveAt: new Date() },
      select: { coins: true },
    });
    return tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'mp_entry',
        amount: -fee,
        balance: updated.coins,
        description,
        idempotencyKey: naturalKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true, balance: true },
    });
  }).catch((err: any) => {
    const msg = err?.message || 'mp entry failed';
    if (msg.startsWith('Insufficient balance')) return { __error: { status: 402, message: msg } };
    if (msg === 'Player not found') return { __error: { status: 404, message: msg } };
    throw err;
  });

  if ('__error' in result) {
    return NextResponse.json({ error: { message: result.__error.message } }, { status: result.__error.status });
  }

  console.log(`[economy] mp_entry player=${playerId} tier=${tier} lobby=${lobbyId} fee=${fee} newBalance=${result.balance}`);

  return NextResponse.json({
    success: true,
    balance: result.balance,
    transaction: {
      id: result.id,
      type: result.type,
      amount: result.amount,
      createdAt: result.createdAt.toISOString(),
    },
    result: { fee, lobbyId, tier },
  });
}

async function creditMpPayout(
  playerId: string,
  payload: Record<string, unknown>,
): Promise<NextResponse> {
  const tier = typeof payload.tier === 'string' ? payload.tier : '';
  const lobbyId = typeof payload.lobbyId === 'string' ? payload.lobbyId : '';
  const placement = Number(payload.placement ?? 0);
  const claimed = Number(payload.amount ?? 0);
  const cfg = MP_TIER_CONFIGS[tier];

  if (!cfg) return NextResponse.json({ error: { message: `Unknown MP tier: ${tier}` } }, { status: 400 });
  if (!lobbyId) return NextResponse.json({ error: { message: 'mp_payout requires lobbyId' } }, { status: 400 });
  if (!Number.isInteger(placement) || placement < 1 || placement > 8) {
    return NextResponse.json({ error: { message: 'placement must be 1..8' } }, { status: 400 });
  }
  if (claimed <= 0 || claimed > cfg.prizePool) {
    return NextResponse.json(
      { error: { message: `Payout out of range (0..${cfg.prizePool}): ${claimed}` } },
      { status: 400 },
    );
  }

  const payout = Math.round(claimed);
  const description = `${cfg.label} payout (placement ${placement})`;
  const naturalKey = `mp_payout:${playerId}:${lobbyId}:${placement}`;

  const existing = await prisma.gameCoinTransaction.findUnique({
    where: { idempotencyKey: naturalKey },
    select: { id: true, type: true, amount: true, balance: true, createdAt: true },
  });
  if (existing) {
    return NextResponse.json({
      success: true,
      balance: existing.balance,
      transaction: {
        id: existing.id,
        type: existing.type,
        amount: existing.amount,
        createdAt: existing.createdAt.toISOString(),
      },
      replayed: true,
      result: { payout },
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.gamePlayer.findUnique({
      where: { id: playerId },
      select: { coins: true },
    });
    if (!player) throw new Error('Player not found');
    const updated = await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { increment: payout }, lastActiveAt: new Date() },
      select: { coins: true },
    });
    return tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'mp_payout',
        amount: payout,
        balance: updated.coins,
        description,
        idempotencyKey: naturalKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true, balance: true },
    });
  });

  console.log(`[economy] mp_payout player=${playerId} tier=${tier} lobby=${lobbyId} placement=${placement} payout=${payout} newBalance=${result.balance}`);

  return NextResponse.json({
    success: true,
    balance: result.balance,
    transaction: {
      id: result.id,
      type: result.type,
      amount: result.amount,
      createdAt: result.createdAt.toISOString(),
    },
    result: { payout, lobbyId, tier, placement },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// place_bet — debits the bet amount up front, returns server-issued bet id.
// settle_bet — credits the payout. Will be replaced by Phase 4 atomic race
// flow; included here for non-race betting contexts (e.g., side bets).
// ─────────────────────────────────────────────────────────────────────────
async function placeBet(
  playerId: string,
  idempotencyKey: string,
  payload: Record<string, unknown>,
): Promise<NextResponse> {
  const amount = Number(payload.amount ?? 0);
  if (!Number.isInteger(amount) || amount <= 0 || amount > 10000) {
    return NextResponse.json(
      { error: { message: 'Bet amount must be a positive integer ≤ 10000' } },
      { status: 400 },
    );
  }

  const player = await prisma.gamePlayer.findUnique({
    where: { id: playerId },
    select: { coins: true },
  });
  if (!player) {
    return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
  }
  if (player.coins < amount) {
    return NextResponse.json(
      { error: { message: `Insufficient balance: ${player.coins} < ${amount}` } },
      { status: 402 },
    );
  }

  const marbleId = String(payload.marbleId ?? '');
  const courseId = String(payload.courseId ?? '');
  const description = `Bet ${amount} on ${marbleId} - ${courseId}`;

  const newBalance = player.coins - amount;
  const result = await prisma.$transaction(async (tx) => {
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'bet',
        amount: -amount,
        balance: newBalance,
        description,
        idempotencyKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true },
    });
    await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { decrement: amount }, lastActiveAt: new Date() },
    });
    return txRow;
  });

  return NextResponse.json({
    success: true,
    balance: newBalance,
    transaction: {
      id: result.id,
      type: result.type,
      amount: result.amount,
      createdAt: result.createdAt.toISOString(),
    },
    result: { betId: result.id, amount, marbleId, courseId },
  });
}

async function settleBet(
  playerId: string,
  idempotencyKey: string,
  payload: Record<string, unknown>,
): Promise<NextResponse> {
  // Cap payout at 20x bet amount as a sanity check. Phase 4 will replace
  // this with server-decided race outcomes.
  const betAmount = Number(payload.betAmount ?? 0);
  const payout = Number(payload.payout ?? 0);
  const MAX_MULTIPLIER = 20;

  if (!Number.isFinite(payout) || payout < 0) {
    return NextResponse.json(
      { error: { message: 'payout must be non-negative' } },
      { status: 400 },
    );
  }
  if (betAmount > 0 && payout > betAmount * MAX_MULTIPLIER) {
    return NextResponse.json(
      { error: { message: `Payout exceeds ${MAX_MULTIPLIER}x bet cap` } },
      { status: 400 },
    );
  }

  /* Skip writing a zero-amount ledger row — those pollute the audit log
   * and aggregate queries (admin economy "minted today / burned today").
   * If a bet settles for 0 coins (i.e. lost), the original place_bet
   * already captured the loss; no need for a redundant 0-amount payout
   * row. Just return current balance. */
  const roundedPayout = Math.round(payout);
  if (roundedPayout === 0) {
    const player = await prisma.gamePlayer.findUnique({
      where: { id: playerId },
      select: { coins: true },
    });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }
    console.log(`[economy] settleBet player=${playerId} payout=0 (lost) balance=${player.coins}`);
    return NextResponse.json({
      success: true,
      balance: player.coins,
      transaction: null,
      result: { payout: 0 },
    });
  }

  const description = String(payload.description ?? 'Bet settle');

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.gamePlayer.findUnique({
      where: { id: playerId },
      select: { coins: true },
    });
    if (!player) throw new Error('Player not found');
    const updated = await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { increment: roundedPayout }, lastActiveAt: new Date() },
      select: { coins: true },
    });
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'payout',
        amount: roundedPayout,
        balance: updated.coins,
        description,
        idempotencyKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true, balance: true },
    });
    return txRow;
  }).catch((err: any) => {
    if (err?.message === 'Player not found') {
      return { __error: { status: 404, message: 'Player not found' } } as const;
    }
    throw err;
  });

  if ('__error' in result) {
    return NextResponse.json({ error: { message: result.__error.message } }, { status: result.__error.status });
  }

  console.log(`[economy] settleBet player=${playerId} payout=${roundedPayout} newBalance=${result.balance}`);

  return NextResponse.json({
    success: true,
    balance: result.balance,
    transaction: {
      id: result.id,
      type: result.type,
      amount: result.amount,
      createdAt: result.createdAt.toISOString(),
    },
    result: { payout: roundedPayout },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// reward_ad — player watched a rewarded video ad and earns coins. The grant
// is server-authoritative: the client supplies only a per-ad nonce
// (idempotencyKey) so the SAME ad impression can't double-credit, AND the
// server enforces a daily cap of 5 rewarded ads per UTC calendar day. The
// reward amount is hard-coded server-side — never taken from the payload.
//
// Race-safety: the daily-count re-check happens INSIDE the $transaction so
// two concurrent claims hitting the 5th slot can't both pass the cap check.
// ─────────────────────────────────────────────────────────────────────────
const REWARD_AD_COINS = 100;
const REWARD_AD_DAILY_CAP = 5;

async function rewardAd(
  playerId: string,
  idempotencyKey: string,
  _payload: Record<string, unknown>,
): Promise<NextResponse> {
  // Pre-tx cap check — fast-path rejection so we don't even open a tx for
  // an obviously over-cap claim. Authoritative re-check happens inside the
  // tx below to close the concurrent-claim race.
  const utcNow = new Date();
  const utcDayStart = new Date(
    Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()),
  );
  const utcDayEnd = new Date(utcDayStart);
  utcDayEnd.setUTCDate(utcDayEnd.getUTCDate() + 1);

  const preCount = await prisma.gameCoinTransaction.count({
    where: {
      playerId,
      type: 'reward_ad',
      createdAt: { gte: utcDayStart, lt: utcDayEnd },
    },
  });
  if (preCount >= REWARD_AD_DAILY_CAP) {
    return NextResponse.json(
      { error: { message: `Daily ad-watch cap (${REWARD_AD_DAILY_CAP}) reached. Try again tomorrow.` } },
      { status: 429 },
    );
  }

  type RewardAdTxResult =
    | { kind: 'error'; status: number; message: string }
    | { kind: 'ok'; txRow: { id: string; type: string; amount: number; createdAt: Date; balance: number }; count: number };

  const result: RewardAdTxResult = await prisma.$transaction(async (tx) => {
    // Race-safe re-check: a concurrent claim could have landed between the
    // pre-tx count and now, so verify again inside the tx before crediting.
    const count = await tx.gameCoinTransaction.count({
      where: {
        playerId,
        type: 'reward_ad',
        createdAt: { gte: utcDayStart, lt: utcDayEnd },
      },
    });
    if (count >= REWARD_AD_DAILY_CAP) {
      return {
        kind: 'error',
        status: 429,
        message: `Daily ad-watch cap (${REWARD_AD_DAILY_CAP}) reached. Try again tomorrow.`,
      };
    }

    const player = await tx.gamePlayer.findUnique({
      where: { id: playerId },
      select: { coins: true },
    });
    if (!player) {
      return { kind: 'error', status: 404, message: 'Player not found' };
    }

    const updated = await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { increment: REWARD_AD_COINS }, lastActiveAt: new Date() },
      select: { coins: true },
    });
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'reward_ad',
        amount: REWARD_AD_COINS,
        balance: updated.coins,
        description: `Rewarded ad — ${REWARD_AD_COINS} coins`,
        idempotencyKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true, balance: true },
    });
    return { kind: 'ok', txRow, count: count + 1 };
  });

  if (result.kind === 'error') {
    return NextResponse.json(
      { error: { message: result.message } },
      { status: result.status },
    );
  }

  const { txRow, count } = result;
  console.log(`[economy] reward_ad player=${playerId} amount=${REWARD_AD_COINS} dailyCount=${count}/${REWARD_AD_DAILY_CAP} newBalance=${txRow.balance}`);

  return NextResponse.json({
    success: true,
    balance: txRow.balance,
    transaction: {
      id: txRow.id,
      type: txRow.type,
      amount: txRow.amount,
      createdAt: txRow.createdAt.toISOString(),
    },
    result: { amount: REWARD_AD_COINS, dailyCount: count, dailyCap: REWARD_AD_DAILY_CAP },
  });
}

