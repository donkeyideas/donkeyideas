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
  | 'custom_track_entry'
  | 'season_starter_bonus'
  | 'client_balance_reconciliation';

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
  idempotencyKey: string,
  _payload: Record<string, unknown>,
): Promise<NextResponse<TransactionResponse | { error: { message: string } }>> {
  // Compute today's bonus from the player's current streak. Authoritative
  // check that the player hasn't already claimed today happens by looking
  // for a daily_bonus transaction on the current calendar day.
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const alreadyClaimed = await prisma.gameCoinTransaction.findFirst({
    where: {
      playerId,
      type: 'daily_bonus',
      createdAt: { gte: todayStart },
    },
    select: { id: true },
  });
  if (alreadyClaimed) {
    return NextResponse.json(
      { error: { message: 'Daily bonus already claimed today' } },
      { status: 409 },
    );
  }

  // Compute streak based on yesterday's claim
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayClaim = await prisma.gameCoinTransaction.findFirst({
    where: {
      playerId,
      type: 'daily_bonus',
      createdAt: { gte: yesterdayStart, lt: todayStart },
    },
    select: { id: true },
  });

  const player = await prisma.gamePlayer.findUnique({
    where: { id: playerId },
    select: { coins: true, dailyStreak: true },
  });
  if (!player) {
    return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
  }

  const newStreak = yesterdayClaim ? player.dailyStreak + 1 : 1;
  const streakIndex = Math.min(newStreak, DAILY_BONUS_BY_STREAK.length - 1);
  const bonus = DAILY_BONUS_BY_STREAK[streakIndex];
  const newBalance = player.coins + bonus;

  // Atomic apply: increment coins + update streak + write ledger row
  const result = await prisma.$transaction(async (tx) => {
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'daily_bonus',
        amount: bonus,
        balance: newBalance,
        description: `Daily bonus day ${newStreak}`,
        idempotencyKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true },
    });
    await tx.gamePlayer.update({
      where: { id: playerId },
      data: {
        coins: { increment: bonus },
        dailyStreak: newStreak,
        lastActiveAt: now,
      },
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
const RECONCILE_VERSION = 'v1';

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

  const player = await prisma.gamePlayer.findUnique({
    where: { id: playerId },
    select: { coins: true },
  });
  if (!player) {
    return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
  }

  // Only credit positive gaps (mobile thinks it has MORE than the server).
  // If local <= server, no action — server is truth.
  const rawDelta = Math.floor(localBalance) - player.coins;
  if (rawDelta <= 0) {
    return NextResponse.json({
      success: true,
      balance: player.coins,
      transaction: { id: '', type: 'client_balance_reconciliation', amount: 0, createdAt: new Date().toISOString() },
      result: { credited: 0, reason: 'no_gap' },
    });
  }

  const credited = Math.min(rawDelta, RECONCILE_MAX_DELTA);
  const newBalance = player.coins + credited;

  const result = await prisma.$transaction(async (tx) => {
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'client_balance_reconciliation',
        amount: credited,
        balance: newBalance,
        description: `Client balance reconciliation (mobile=${localBalance}, server=${player.coins}, credited=${credited})`,
        idempotencyKey: naturalKey,
        adminNote: `auto-reconcile v${RECONCILE_VERSION}: closed ${credited} of ${rawDelta} coin gap`,
      },
      select: { id: true, type: true, amount: true, createdAt: true },
    });
    await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { increment: credited }, lastActiveAt: new Date() },
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
  idempotencyKey: string,
  payload: Record<string, unknown>,
  kind: 'tournament_entry' | 'national_entry' | 'custom_track_entry',
): Promise<NextResponse> {
  let fee = 0;
  let description = '';

  if (kind === 'tournament_entry') {
    const id = typeof payload.tournamentId === 'string' ? payload.tournamentId : '';
    const cfg = TOURNAMENT_CONFIGS[id];
    if (!cfg) {
      return NextResponse.json({ error: { message: `Unknown tournament: ${id}` } }, { status: 400 });
    }
    fee = cfg.entryFee;
    description = `${cfg.name} entry fee`;
  } else if (kind === 'national_entry') {
    const id = typeof payload.eventId === 'string' ? payload.eventId : '';
    const cfg = NATIONAL_EVENTS[id];
    if (!cfg) {
      return NextResponse.json({ error: { message: `Unknown national event: ${id}` } }, { status: 400 });
    }
    fee = cfg.entryFee;
    description = `${cfg.name} entry fee`;
  } else {
    fee = CUSTOM_TRACK_ENTRY_FEE;
    description = 'Custom track entry fee';
  }

  const player = await prisma.gamePlayer.findUnique({
    where: { id: playerId },
    select: { coins: true },
  });
  if (!player) {
    return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
  }
  if (player.coins < fee) {
    return NextResponse.json(
      { error: { message: `Insufficient balance: ${player.coins} < ${fee}` } },
      { status: 402 },
    );
  }

  const newBalance = player.coins - fee;
  const result = await prisma.$transaction(async (tx) => {
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: kind,
        amount: -fee,
        balance: newBalance,
        description,
        idempotencyKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true },
    });
    await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { decrement: fee }, lastActiveAt: new Date() },
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
    result: { fee },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Payouts (credit) — tournament_payout, national_payout, playoff_payout
// Server validates the payout amount against canonical max for that event.
// Caps prevent client-claimed inflated payouts.
// ─────────────────────────────────────────────────────────────────────────
async function creditPayout(
  playerId: string,
  idempotencyKey: string,
  payload: Record<string, unknown>,
  kind: 'tournament_payout' | 'national_payout' | 'playoff_payout',
): Promise<NextResponse> {
  let payout = 0;
  let description = '';

  if (kind === 'tournament_payout') {
    const id = typeof payload.tournamentId === 'string' ? payload.tournamentId : '';
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
    description = `${cfg.name} payout`;
  } else if (kind === 'national_payout') {
    const id = typeof payload.eventId === 'string' ? payload.eventId : '';
    const placement = Number(payload.placement ?? 0);
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
  } else {
    // playoff_payout — until Phase 4 server-side playoffs, validate range only.
    const claimed = Number(payload.amount ?? 0);
    if (claimed <= 0 || claimed > 50000) {
      return NextResponse.json(
        { error: { message: `Playoff payout out of range (0..50000): ${claimed}` } },
        { status: 400 },
      );
    }
    payout = Math.round(claimed);
    description = 'Playoff payout';
  }

  const player = await prisma.gamePlayer.findUnique({
    where: { id: playerId },
    select: { coins: true },
  });
  if (!player) {
    return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
  }

  const newBalance = player.coins + payout;
  const result = await prisma.$transaction(async (tx) => {
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: kind,
        amount: payout,
        balance: newBalance,
        description,
        idempotencyKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true },
    });
    await tx.gamePlayer.update({
      where: { id: playerId },
      data: { coins: { increment: payout }, lastActiveAt: new Date() },
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
    result: { payout },
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

  const player = await prisma.gamePlayer.findUnique({
    where: { id: playerId },
    select: { coins: true },
  });
  if (!player) {
    return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
  }

  const newBalance = player.coins + Math.round(payout);
  const description = String(payload.description ?? 'Bet settle');

  const result = await prisma.$transaction(async (tx) => {
    const txRow = await tx.gameCoinTransaction.create({
      data: {
        playerId,
        type: 'payout',
        amount: Math.round(payout),
        balance: newBalance,
        description,
        idempotencyKey,
      },
      select: { id: true, type: true, amount: true, createdAt: true },
    });
    if (payout > 0) {
      await tx.gamePlayer.update({
        where: { id: playerId },
        data: { coins: { increment: Math.round(payout) }, lastActiveAt: new Date() },
      });
    } else {
      await tx.gamePlayer.update({
        where: { id: playerId },
        data: { lastActiveAt: new Date() },
      });
    }
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
    result: { payout: Math.round(payout) },
  });
}
