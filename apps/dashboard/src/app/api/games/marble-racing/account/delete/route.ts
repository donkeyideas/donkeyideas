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

    /* Single delete cascades through every related table via FK rules.
     * If any future model adds a GamePlayer relation WITHOUT cascade,
     * this will throw a P2003 foreign-key error — at which point we'll
     * need to either add the cascade or delete the orphans here first. */
    await prisma.gamePlayer.delete({
      where: { id: player.id },
    });

    console.log(`[account/delete] playerId=${player.id} deviceId=${player.deviceId} purged`);

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
