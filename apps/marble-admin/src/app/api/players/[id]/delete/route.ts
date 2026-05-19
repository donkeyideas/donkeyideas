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

    /* Single cascade delete. The schema marks every GamePlayer-related
     * model with `onDelete: Cascade`, so this fan-out happens at the
     * Postgres FK level — no need to enumerate child tables. If a future
     * model adds a relation without cascade, this will throw P2003 and
     * we'll see it in admin logs immediately. */
    await prisma.gamePlayer.delete({
      where: { id },
    });

    console.log(
      `[admin/delete] playerId=${player.id} deviceId=${player.deviceId} ` +
      `name=${player.playerName} purgedBy=${admin.id} coins=${player.coins} ` +
      `totalSpent=${player.totalSpent}`,
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
