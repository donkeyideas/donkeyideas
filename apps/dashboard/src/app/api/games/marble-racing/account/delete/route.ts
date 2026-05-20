import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';

/* ------------------------------------------------------------------ */
/*  DELETE /api/games/marble-racing/account/delete                     */
/*                                                                     */
/*  Purges the authenticated player's account and ALL related data.    */
/*  Schema-level onDelete: Cascade handles the fan-out — see           */
/*  GamePlayer relations in packages/database/prisma/schema.prisma     */
/*  (bet records, coin transactions, race records, purchases, season   */
/*  progress, support tickets, announcement deliveries, etc.).         */
/*                                                                     */
/*  Required for GDPR/CCPA "right to be forgotten" compliance and to   */
/*  honor the in-app "Delete Everything" UX. Mobile client calls this  */
/*  before clearing local AsyncStorage so the server state matches the */
/*  user's intent — without this, the client wipe was undone by the    */
/*  next /sync/state pull from the still-existing server record.       */
/* ------------------------------------------------------------------ */

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

    /* Hard delete inside a transaction. Most child tables cascade via
     * `onDelete: Cascade` in schema.prisma but a few have `playerId`
     * without a FK relation (GameABTestAssignment, GameApiLog). Wipe
     * those explicitly so deletion is GDPR-clean, not just FK-clean. */
    await prisma.$transaction(async (tx) => {
      await tx.gameABTestAssignment.deleteMany({ where: { playerId: player.id } });
      await tx.gameApiLog.updateMany({
        where: { playerId: player.id },
        data: { playerId: null },
      });
      await tx.gamePlayer.delete({ where: { id: player.id } });
    });

    /* Verify the row is actually gone before claiming success — the
     * previous bare delete was the reason the mobile client kept
     * rehydrating "deleted" accounts on next launch. */
    const stillExists = await prisma.gamePlayer.findUnique({
      where: { id: player.id },
      select: { id: true },
    });
    if (stillExists) {
      console.error(`[account/delete] post-delete check FAILED — player ${player.id} still in DB`);
      return NextResponse.json(
        { error: { message: 'Account deletion appeared to succeed but the player record still exists.' } },
        { status: 500 },
      );
    }

    console.log(`[account/delete] playerId=${player.id} deviceId=${player.deviceId} purged verified=true`);

    return NextResponse.json({
      success: true,
      deletedPlayerId: player.id,
    });
  } catch (error: any) {
    console.error('Game account/delete error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Account deletion failed' } },
      { status: 500 },
    );
  }
}

/* Some clients (axios, fetch with method:'DELETE') prefer the verb to match
 * the action. Mirror DELETE to POST for friendliness. */
export const DELETE = POST;
