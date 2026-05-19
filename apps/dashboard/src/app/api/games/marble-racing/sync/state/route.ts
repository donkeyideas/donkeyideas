import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';

// XP required to complete a single pass level. Must match the client value
// in `state/gameStore.ts`. Default 3500 if not exported from a shared module.
const XP_PER_LEVEL = 3500;

/**
 * Player state sync — server is authoritative.
 *
 * Phase 5 of the economy refactor: the client previously POSTed its full
 * state (including coins) and the server blindly overwrote the DB. Now:
 *
 *   - The CLIENT calls this primarily to PULL the authoritative state.
 *     Send an empty body (or only `playerName` to claim a rename).
 *   - Coin balance, totalRaces, totalWins, dailyStreak come from the DB
 *     (driven by the economy/transaction and sync/race endpoints, which
 *     are the only authorized mutators).
 *   - currentStreak, bestStreak, passLevel, passXp, lastPlayedDate are
 *     accepted from the client as best-effort hints because the server
 *     doesn't yet own that game-loop logic. Will tighten in a follow-up.
 *
 * Response includes the authoritative state so the client can reconcile.
 */

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

    const body = await request.json().catch(() => ({}));
    const {
      playerName,
      currentStreak,
      bestStreak,
      passLevel,
      passXp,
    } = body;

    // Only let the client influence non-economy fields. Server is source of
    // truth for: coins, totalRaces, totalWins, dailyStreak, totalSpent.
    //
    // MONOTONICITY: passLevel, passXp, bestStreak can ONLY MOVE UP via this
    // endpoint. A tampered client otherwise can downgrade passLevel from
    // 50 → 1 to grind a fresh pass, or zero out passXp / bestStreak.
    // currentStreak intentionally allows decreases (loss resets it to 0)
    // but post-race-sync this is mostly redundant — sync/race already
    // updates it server-side.
    const update: Record<string, any> = { lastActiveAt: new Date() };

    if (typeof playerName === 'string') {
      // Sanitize playerName — strip control characters, RTL overrides, and
      // zero-width joiners that could spoof admin/leaderboard rows. Matches
      // the same regex used in auth/register/route.ts.
      // Strip C0 control chars (\x00-\x1f), DEL (\x7f), RTL/zero-width marks
      // (-), line/paragraph separators and RLM/LRE/etc.
      // (-), and word-joiner/invisible-times range
      // (-). Same intent as auth/register/route.ts.
      const safePlayerName = playerName
        .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028-\u202F\u2060-\u206F]/g, '')
        .trim()
        .slice(0, 30);
      if (safePlayerName.length >= 2) {
        update.playerName = safePlayerName;
      }
    }
    if (typeof currentStreak === 'number' && currentStreak >= 0) {
      update.currentStreak = currentStreak;
    }
    if (typeof bestStreak === 'number' && bestStreak >= 0 && bestStreak >= (player.bestStreak ?? 0)) {
      update.bestStreak = bestStreak;
    }
    if (
      typeof passLevel === 'number' &&
      passLevel >= 1 &&
      passLevel <= 200 &&
      passLevel >= (player.passLevel ?? 1)
    ) {
      update.passLevel = passLevel;
    }
    if (
      typeof passXp === 'number' &&
      passXp >= 0 &&
      // Allow XP to reset to 0 when leveling up (passLevel increased AND xp lower
      // is valid), otherwise enforce monotonic increase.
      (passXp >= (player.passXp ?? 0) || (update.passLevel ?? player.passLevel) > player.passLevel)
    ) {
      // UPPER CAP: when the client claims a level-up, also enforce that the
      // post-level-up XP is within one level's worth. Without this, a tampered
      // client could submit `passLevel = old+1, passXp = 999999` and bank
      // hundreds of unearned level-ups in subsequent calls (since passXp is
      // monotonic going forward).
      const isLevelUp = (update.passLevel ?? player.passLevel) > player.passLevel;
      if (isLevelUp && passXp > XP_PER_LEVEL) {
        return NextResponse.json(
          { error: { message: `passXp ${passXp} exceeds XP_PER_LEVEL ${XP_PER_LEVEL} on level-up` } },
          { status: 400 },
        );
      }
      update.passXp = passXp;
    }

    const updated = await prisma.gamePlayer.update({
      where: { id: player.id },
      data: update,
      select: {
        playerName: true,
        coins: true,
        totalRaces: true,
        totalWins: true,
        currentStreak: true,
        bestStreak: true,
        dailyStreak: true,
        passLevel: true,
        passXp: true,
        passTier: true,
        status: true,
      },
    });

    const config = await prisma.gameConfig.findMany({
      where: { group: 'features' },
    });

    return NextResponse.json({
      success: true,
      banned: updated.status === 'banned',
      state: updated,
      config: config.reduce(
        (acc, c) => ({ ...acc, [c.key]: c.value }),
        {} as Record<string, string>,
      ),
    });
  } catch (error: any) {
    console.error('Sync state error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to sync state' } },
      { status: 500 },
    );
  }
}
