import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * POST   /api/players/cleanup-dead?execute=1 — delete matching rows
 * GET    /api/players/cleanup-dead             — dry run (count + sample)
 *
 * "Dead" = a registered device that never engaged with the game. Strict
 * criteria so we don't accidentally nuke a real user who came back after
 * a long absence:
 *
 *   1. totalRaces == 0           — never finished a race
 *   2. createdAt < NOW - 7 days  — gave them a full week to come back
 *   3. totalSpent == 0           — never paid anything
 *   4. status != 'banned'        — keep bans for audit (admin can decide separately)
 *   5. lastActiveAt - createdAt < 2 min  — single session, didn't return
 *
 * Dev-tagged device IDs (prefix `dev-`) are ALSO matched regardless of
 * the 7-day age window — they're explicitly local dev installs from
 * `__DEV__` builds and can be removed immediately.
 *
 * Returns a sample of up to 20 affected rows so the caller can sanity-check
 * before clicking "execute".
 */
export async function GET() {
  return runCleanup({ execute: false });
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const execute = url.searchParams.get('execute') === '1';
  return runCleanup({ execute });
}

async function runCleanup({ execute }: { execute: boolean }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoMinutesMs = 2 * 60 * 1000;

    // The "single session" check (lastActiveAt - createdAt < 2 min) is
    // best done in raw SQL because Prisma can't express "compare two fields
    // on the same row" in a where clause cleanly.
    type Candidate = {
      id: string;
      deviceId: string;
      playerName: string;
      platform: string;
      createdAt: Date;
      lastActiveAt: Date;
      isDevTagged: boolean;
    };

    const candidates = await prisma.$queryRaw<Candidate[]>`
      SELECT
        id,
        "deviceId",
        "playerName",
        platform,
        "createdAt",
        "lastActiveAt",
        ("deviceId" LIKE 'dev-%')                AS "isDevTagged"
      FROM "game_players"
      WHERE
        "totalRaces"  = 0
        AND "totalSpent" = 0
        AND status != 'banned'
        AND EXTRACT(EPOCH FROM ("lastActiveAt" - "createdAt")) * 1000 < ${twoMinutesMs}
        AND (
          "deviceId" LIKE 'dev-%'
          OR "createdAt" < ${sevenDaysAgo}
        )
      ORDER BY "createdAt" DESC
      LIMIT 5000
    `;

    const sample = candidates.slice(0, 20).map((c) => ({
      id: c.id,
      deviceId: c.deviceId,
      playerName: c.playerName,
      platform: c.platform,
      createdAt: c.createdAt,
      lastActiveAt: c.lastActiveAt,
      isDevTagged: c.isDevTagged,
    }));

    if (!execute) {
      return NextResponse.json({
        dryRun: true,
        wouldDelete: candidates.length,
        sample,
        criteria: {
          totalRaces: 0,
          totalSpent: 0,
          notBanned: true,
          singleSessionWindowMs: twoMinutesMs,
          ageCutoff: sevenDaysAgo.toISOString(),
          devTaggedAlwaysIncluded: true,
        },
      });
    }

    if (candidates.length === 0) {
      return NextResponse.json({ deleted: 0, sample: [] });
    }

    const ids = candidates.map((c) => c.id);

    // GamePlayer has FKs to many child tables (sessions, transactions,
    // bets, etc.). Wrap the deletes in a transaction so we don't end up
    // with orphaned rows if a delete partway through fails. Child tables
    // either cascade or get explicitly cleaned.
    const deleted = await prisma.$transaction(async (tx) => {
      // Child cleanups first — Prisma doesn't always have onDelete:Cascade
      // configured for every relation. Explicit deletes keep this safe.
      await tx.gamePlayerSession.deleteMany({ where: { playerId: { in: ids } } });
      await tx.gameAppSession.deleteMany({ where: { playerId: { in: ids } } });
      await tx.gameCoinTransaction.deleteMany({ where: { playerId: { in: ids } } });
      await tx.betRecord.deleteMany({ where: { playerId: { in: ids } } });
      await tx.raceRecord.deleteMany({ where: { playerId: { in: ids } } });
      await tx.gameMessage.deleteMany({ where: { playerId: { in: ids } } });
      await tx.gameAnnouncementDelivery.deleteMany({ where: { playerId: { in: ids } } });
      await tx.playerSeasonProgress.deleteMany({ where: { playerId: { in: ids } } });
      await tx.supportTicket.deleteMany({ where: { playerId: { in: ids } } });
      const res = await tx.gamePlayer.deleteMany({ where: { id: { in: ids } } });
      return res.count;
    });

    return NextResponse.json({
      deleted,
      sample,
    });
  } catch (error: any) {
    console.error('Player cleanup error:', error);
    return NextResponse.json(
      { error: { message: error?.message ?? 'Cleanup failed' } },
      { status: 500 },
    );
  }
}
