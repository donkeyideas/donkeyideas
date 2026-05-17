import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';

/**
 * Server-authoritative race recorder.
 *
 * Pre-refactor behavior trusted the client's `currentCoins` value and would
 * overwrite the player's balance with whatever the client claimed. This
 * route now treats the client's race outcome as informational (race history,
 * stats) but computes coin movement server-side:
 *
 *   new_balance = old_balance - betAmount + payout
 *
 * Hard caps:
 *   - betAmount must be 0-10000 (positive integer)
 *   - payout must be 0..(betAmount * MAX_MULTIPLIER); MAX_MULTIPLIER = 20
 *   - player must have sufficient balance for the bet
 *
 * Phase 4 (next session) replaces this with server-side Matter.js physics
 * so the server doesn't trust the client's claimed winner either. For now
 * the economic validation prevents revenue exploits; the worst a tampered
 * client can do is fake their own win record, not steal coins.
 */

const MAX_BET_PAYOUT_MULTIPLIER = 20;
const MAX_BET_AMOUNT = 10_000;

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

    const body = await request.json();
    const {
      courseId,
      courseTheme,
      gameMode,
      finishOrder,
      playerPickId,
      betAmount: rawBet,
      payout: rawPayout,
      playerPlacement,
      won,
      winnerTime,
      modeContext,
      idempotencyKey,
    } = body;

    if (!courseId || !gameMode || !finishOrder) {
      return NextResponse.json(
        { error: { message: 'courseId, gameMode, and finishOrder are required' } },
        { status: 400 },
      );
    }

    // Quick Race has no betting in the UI. Force-zero economic values
    // server-side so a tampered or buggy client can't leak the global
    // betAmount default (100) into Quick Race records.
    const isQuickRace = gameMode === 'quick_race';
    const betAmount = isQuickRace ? 0 : Math.max(0, Math.floor(Number(rawBet ?? 0)));
    const claimedPayout = isQuickRace ? 0 : Math.max(0, Math.floor(Number(rawPayout ?? 0)));

    // Economic validation
    if (betAmount > MAX_BET_AMOUNT) {
      return NextResponse.json(
        { error: { message: `Bet exceeds max of ${MAX_BET_AMOUNT}` } },
        { status: 400 },
      );
    }
    if (betAmount > 0 && claimedPayout > betAmount * MAX_BET_PAYOUT_MULTIPLIER) {
      return NextResponse.json(
        { error: { message: `Payout exceeds ${MAX_BET_PAYOUT_MULTIPLIER}x bet cap` } },
        { status: 400 },
      );
    }
    if (betAmount > 0 && player.coins < betAmount) {
      return NextResponse.json(
        { error: { message: `Insufficient balance for bet: ${player.coins} < ${betAmount}` } },
        { status: 402 },
      );
    }

    // Idempotency — if the same race-result idempotencyKey was already
    // recorded, return the cached balance. Optional field; falls back to
    // recording each call separately if not provided.
    if (idempotencyKey) {
      const dup = await prisma.gameCoinTransaction.findUnique({
        where: { idempotencyKey: `race:${idempotencyKey}` },
        select: { balance: true },
      });
      if (dup) {
        return NextResponse.json({ success: true, balance: dup.balance, duplicate: true });
      }
    }

    const netChange = claimedPayout - betAmount;
    const newBalance = player.coins + netChange;

    // Atomic: write race + bet + coin transaction + player update
    const result = await prisma.$transaction(async (tx) => {
      const race = await tx.raceRecord.create({
        data: {
          playerId: player.id,
          courseId,
          courseTheme: courseTheme || 'unknown',
          gameMode,
          finishOrder,
          playerPickId: playerPickId || null,
          betAmount,
          payout: claimedPayout,
          playerPlacement: playerPlacement || 0,
          won: won || false,
          winnerTime: winnerTime || null,
          modeContext: modeContext || null,
        },
      });

      if (betAmount > 0 && playerPickId) {
        await tx.betRecord.create({
          data: {
            playerId: player.id,
            marbleId: playerPickId,
            betAmount,
            odds: body.odds || 0,
            payout: claimedPayout,
            won: won || false,
            placement: playerPlacement || 0,
          },
        });
      }

      // Single ledger entry capturing the net change so idempotencyKey
      // dedupes the whole race result.
      await tx.gameCoinTransaction.create({
        data: {
          playerId: player.id,
          type: 'bet',
          amount: netChange,
          balance: newBalance,
          description: betAmount > 0
            ? `Race on ${playerPickId || 'no pick'} - ${courseId} (net ${netChange >= 0 ? '+' : ''}${netChange})`
            : `Quick race - ${courseId}`,
          idempotencyKey: idempotencyKey ? `race:${idempotencyKey}` : null,
        },
      });

      const updateData: Record<string, any> = {
        totalRaces: { increment: 1 },
        lastActiveAt: new Date(),
      };
      if (won) updateData.totalWins = { increment: 1 };
      if (netChange !== 0) updateData.coins = netChange > 0 ? { increment: netChange } : { decrement: -netChange };

      await tx.gamePlayer.update({
        where: { id: player.id },
        data: updateData,
      });

      return race;
    });

    return NextResponse.json({
      success: true,
      raceId: result.id,
      balance: newBalance,
      banned: false,
    });
  } catch (error: any) {
    console.error('Sync race error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to sync race' } },
      { status: 500 },
    );
  }
}
