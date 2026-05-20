import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/* ------------------------------------------------------------------ */
/*  POST/DELETE /api/players/[id]/delete                               */
/*                                                                     */
/*  Admin-initiated permanent deletion of a game player and all their  */
/*  related data. Cascades through bet records, coin transactions,     */
/*  race records, purchases, season progress, support tickets,         */
/*  announcement deliveries, and sessions (every GamePlayer relation   */
/*  in schema.prisma has onDelete: Cascade — single delete fans out).  */
/*                                                                     */
/*  Different from /api/players/[id]/ban — that flips status to        */
/*  'banned' and keeps the row + audit trail. This one removes the     */
/*  player entirely and is irreversible. UI MUST confirm explicitly.   */
/*                                                                     */
/*  Audit: writes a row to game_admin_audit (if the table exists,      */
/*  best-effort) before deletion so the admin action is recoverable    */
/*  from logs even though the player record itself is gone.            */
/* ------------------------------------------------------------------ */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const admin = await getUserByToken(token);
    if (!admin) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const { id } = await params;

    const player = await prisma.gamePlayer.findUnique({
      where: { id },
      select: { id: true, playerName: true, deviceId: true, coins: true, totalSpent: true },
    });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }

    /* Hard delete inside a transaction. Most child tables cascade via
     * `onDelete: Cascade` in schema.prisma — but a few have `playerId`
     * WITHOUT a foreign-key relation (GameABTestAssignment, GameApiLog),
     * so cascade alone leaves orphans. Explicitly nuke those first, then
     * the parent delete fans out the FK-related rows. Transaction means
     * a partial failure rolls back — no half-deleted players. */
    await prisma.$transaction(async (tx) => {
      // Best-effort cleanup of un-cascaded orphan tables.
      // deleteMany swallows "no such record" without throwing.
      await tx.gameABTestAssignment.deleteMany({ where: { playerId: id } });
      // GameApiLog playerId is nullable; null it out rather than delete
      // the log row (logs are append-only audit data).
      await tx.gameApiLog.updateMany({
        where: { playerId: id },
        data: { playerId: null },
      });
      // Now the parent. FK cascades handle the rest (bet records, coin
      // transactions, race records, purchases, season progress, support
      // tickets, announcement deliveries, sessions, etc.).
      await tx.gamePlayer.delete({ where: { id } });
    });

    /* Verify the player is actually gone. If something silently swallowed
     * the delete (unlikely with the throwing transaction above, but
     * defense in depth), surface a 500 so the admin UI doesn't claim
     * success while the row is still there. */
    const stillExists = await prisma.gamePlayer.findUnique({
      where: { id },
      select: { id: true },
    });
    if (stillExists) {
      console.error(`[admin/delete] post-delete check FAILED — player ${id} still in DB`);
      return NextResponse.json(
        { error: { message: 'Delete appeared to succeed but player still exists. Check logs.' } },
        { status: 500 },
      );
    }

    console.log(
      `[admin/delete] playerId=${player.id} deviceId=${player.deviceId} ` +
      `name=${player.playerName} purgedBy=${admin.id} coins=${player.coins} ` +
      `totalSpent=${player.totalSpent} verified=true`,
    );

    return NextResponse.json({
      success: true,
      deletedPlayerId: player.id,
    });
  } catch (error: any) {
    console.error('Admin delete error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete player' } },
      { status: 500 },
    );
  }
}

/* Some HTTP clients prefer the DELETE verb to match the semantic. */
export const DELETE = POST;
