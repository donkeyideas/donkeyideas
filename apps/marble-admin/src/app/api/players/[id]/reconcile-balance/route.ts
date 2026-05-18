import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * Admin-side trigger for the same reconciliation flow the mobile app
 * fires automatically on first launch (see lib/balanceReconcile.ts and
 * the client_balance_reconciliation action in dashboard).
 *
 * Use case: operator looks at a player's phone, sees they have 6,112
 * coins, looks at admin and sees the server thinks 1,688. Clicks
 * Reconcile, types 6,112. Admin credits the 4,424 gap to bring the
 * server to 6,112 with a transaction tagged as
 * client_balance_reconciliation so the ledger is honest about the
 * source of the credit.
 *
 * Same caps and idempotency as the mobile-fired version:
 *   - Max credit per call: 50,000 coins
 *   - One reconciliation per player ever (natural key
 *     balance_reconcile:{playerId}:v1)
 *   - Subsequent calls return the original balance without re-applying
 */

const RECONCILE_MAX_DELTA = 50_000;
const RECONCILE_VERSION = 'v1';

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
    const body = await request.json();
    const { mobileBalance } = body as { mobileBalance?: number };

    if (
      typeof mobileBalance !== 'number' ||
      !Number.isFinite(mobileBalance) ||
      mobileBalance < 0
    ) {
      return NextResponse.json(
        { error: { message: 'mobileBalance (non-negative number) required' } },
        { status: 400 },
      );
    }

    const player = await prisma.gamePlayer.findUnique({
      where: { id },
      select: { id: true, playerName: true, coins: true },
    });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }

    const naturalKey = `balance_reconcile:${id}:${RECONCILE_VERSION}`;
    const existing = await prisma.gameCoinTransaction.findUnique({
      where: { idempotencyKey: naturalKey },
      select: { id: true, amount: true, balance: true, createdAt: true },
    });
    if (existing) {
      return NextResponse.json({
        success: true,
        replayed: true,
        balance: existing.balance,
        credited: existing.amount,
        reason: 'already_reconciled',
      });
    }

    const rawDelta = Math.floor(mobileBalance) - player.coins;
    if (rawDelta <= 0) {
      return NextResponse.json({
        success: true,
        balance: player.coins,
        credited: 0,
        reason: 'no_gap',
      });
    }

    const credited = Math.min(rawDelta, RECONCILE_MAX_DELTA);
    const newBalance = player.coins + credited;

    await prisma.$transaction(async (tx) => {
      await tx.gameCoinTransaction.create({
        data: {
          playerId: id,
          type: 'client_balance_reconciliation',
          amount: credited,
          balance: newBalance,
          description: `Admin reconcile from mobile (mobile=${mobileBalance}, server=${player.coins}, credited=${credited})`,
          idempotencyKey: naturalKey,
          adminId: admin.id,
          adminNote: `Operator-triggered reconcile v${RECONCILE_VERSION}: closed ${credited} of ${rawDelta} coin gap`,
        },
      });
      await tx.gamePlayer.update({
        where: { id },
        data: { coins: { increment: credited }, lastActiveAt: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      balance: newBalance,
      credited,
      capped: rawDelta > RECONCILE_MAX_DELTA,
    });
  } catch (error: any) {
    console.error('Admin reconcile error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to reconcile balance' } },
      { status: 500 },
    );
  }
}
