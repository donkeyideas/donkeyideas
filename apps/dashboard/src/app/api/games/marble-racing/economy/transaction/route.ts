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
  | 'custom_track_entry';

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

      // Stubs — implemented in subsequent phases
      case 'claim_achievement':
      case 'claim_challenge':
      case 'place_bet':
      case 'settle_bet':
      case 'tournament_entry':
      case 'tournament_payout':
      case 'playoff_payout':
      case 'national_entry':
      case 'national_payout':
      case 'custom_track_entry':
        return NextResponse.json(
          { error: { message: `Action ${action} not yet implemented` } },
          { status: 501 },
        );

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
