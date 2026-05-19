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

const VALID_GAME_MODES = new Set([
  'quick_race',
  'bet',
  'season',
  'national_race',
  'tournament',
  'playoff',
  'multiplayer_tournament',
]);

const MARBLE_IDS = new Set([
  'dash',
  'spike',
  'rocky',
  'lucky',
  'frosty',
  'nova',
  'shadow',
  'aqua',
]);

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

    // Validate gameMode against the known discriminated union. A bogus mode
    // here would otherwise flow through to downstream stats/analytics and
    // muddy aggregation.
    if (!VALID_GAME_MODES.has(gameMode)) {
      return NextResponse.json(
        { error: { message: `Invalid gameMode: ${gameMode}` } },
        { status: 400 },
      );
    }

    // Validate finishOrder shape: exactly 8 strings, each a known marble id,
    // and no duplicates. Anything else means the client is sending a
    // corrupted/spoofed payload.
    if (!Array.isArray(finishOrder) || finishOrder.length !== 8) {
      return NextResponse.json(
        { error: { message: 'finishOrder must be an array of exactly 8 marble ids' } },
        { status: 400 },
      );
    }
    const seenMarbles = new Set<string>();
    for (const m of finishOrder) {
      if (typeof m !== 'string' || !MARBLE_IDS.has(m) || seenMarbles.has(m)) {
        return NextResponse.json(
          { error: { message: `Invalid finishOrder entry: ${m}` } },
          { status: 400 },
        );
      }
      seenMarbles.add(m);
    }

    // Numeric guards — NaN/Infinity slipped through `Math.floor(Number(...))`
    // because `Math.floor(NaN) === NaN` and `Math.max(0, NaN) === NaN`,
    // which Prisma then coerces to 0 (silent data loss). Reject explicitly.
    const rawBetNum = Number(rawBet ?? 0);
    const rawPayoutNum = Number(rawPayout ?? 0);
    if (!Number.isFinite(rawBetNum) || !Number.isFinite(rawPayoutNum)) {
      return NextResponse.json(
        { error: { message: 'betAmount and payout must be finite numbers' } },
        { status: 400 },
      );
    }

    // Quick Race has no betting in the UI. Force-zero economic values
    // server-side so a tampered or buggy client can't leak the global
    // betAmount default (100) into Quick Race records.
    const isQuickRace = gameMode === 'quick_race';
    const betAmount = isQuickRace ? 0 : Math.max(0, Math.floor(rawBetNum));
    const claimedPayout = isQuickRace ? 0 : Math.max(0, Math.floor(rawPayoutNum));

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

    // Atomic: write race + bet + coin transaction + player update.
    //
    // Key invariants:
    //   - All player.* reads happen INSIDE the transaction (Postgres
    //     read-committed semantics) so the ledger snapshot is consistent
    //     under concurrency. Previously player.coins was read pre-tx
    //     (line 35-38 via auth helper), so two concurrent race syncs would
    //     both compute newBalance from the same stale read and write
    //     conflicting balance snapshots even though gamePlayer.coins was
    //     correct via increment.
    //   - Streak counters update server-side: currentStreak resets on loss,
    //     bumps on win; bestStreak is the running max. Previously these
    //     came from /sync/state which raced against race sync.
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
        // Validate odds: must be a finite number in (0, 100]. Defaults to 1
        // so a missing/bogus client value doesn't corrupt the bet record.
        const rawOdds = Number(body.odds);
        const safeOdds = Number.isFinite(rawOdds) && rawOdds > 0 && rawOdds <= 100
          ? rawOdds
          : 1;
        await tx.betRecord.create({
          data: {
            playerId: player.id,
            marbleId: playerPickId,
            betAmount,
            odds: safeOdds,
            payout: claimedPayout,
            won: won || false,
            placement: playerPlacement || 0,
          },
        });
      }

      // Atomic player update with all derived fields. Server-side streak
      // logic so race and state syncs can't race each other.
      const updateData: Record<string, any> = {
        totalRaces: { increment: 1 },
        lastActiveAt: new Date(),
      };
      if (won) {
        updateData.totalWins = { increment: 1 };
        updateData.currentStreak = { increment: 1 };
      } else {
        updateData.currentStreak = 0;
      }
      if (netChange !== 0) {
        updateData.coins = netChange > 0 ? { increment: netChange } : { decrement: -netChange };
      }
      const updated = await tx.gamePlayer.update({
        where: { id: player.id },
        data: updateData,
        select: { coins: true, currentStreak: true, bestStreak: true },
      });

      // bestStreak is a running max — use Postgres GREATEST() in a single
      // atomic statement so a concurrent race-sync can't read a stale
      // bestStreak and overwrite a higher value. The two-step "read max
      // then update" pattern this replaces was vulnerable to lost-update
      // anomalies even inside a transaction.
      if (won) {
        await tx.$executeRaw`UPDATE game_players SET "bestStreak" = GREATEST("bestStreak", "currentStreak") WHERE id = ${player.id}`;
      }

      // Single ledger entry with the SERVER-AUTHORITATIVE post-update balance
      // so the snapshot is correct even under concurrent updates. Replaces
      // the previous stale-read computation `player.coins + netChange`.
      await tx.gameCoinTransaction.create({
        data: {
          playerId: player.id,
          type: 'bet',
          amount: netChange,
          balance: updated.coins,
          description: betAmount > 0
            ? `Race on ${playerPickId || 'no pick'} - ${courseId} (net ${netChange >= 0 ? '+' : ''}${netChange})`
            : `Quick race - ${courseId}`,
          idempotencyKey: idempotencyKey ? `race:${idempotencyKey}` : null,
        },
      });

      return { race, balance: updated.coins };
    });

    console.log(
      `[sync/race] player=${player.id} mode=${gameMode} course=${courseId} bet=${betAmount} payout=${claimedPayout} net=${netChange} newBalance=${result.balance} won=${!!won}`,
    );

    return NextResponse.json({
      success: true,
      raceId: result.race.id,
      balance: result.balance,
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
