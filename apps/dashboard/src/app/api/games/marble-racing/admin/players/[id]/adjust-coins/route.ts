import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { requireAdmin } from '@/lib/auth';
import { cookies } from 'next/headers';

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
    const admin = await requireAdmin(token);
    if (!admin) {
      return NextResponse.json({ error: { message: 'Forbidden' } }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { amount, note } = body;

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json(
        { error: { message: 'amount (number) is required' } },
        { status: 400 },
      );
    }

    /* ATOMIC + LEDGER-CONSISTENT.
     * Previously the player read and the two writes (update + ledger row)
     * ran as separate statements. Two issues that this fixes:
     *   1. A crash between writes could leave the balance changed with no
     *      ledger evidence (or vice versa). Now wrapped in $transaction.
     *   2. Math.max(0, ...) silently clamps a negative delta. The ledger
     *      then recorded `amount = requested delta` while `balance = clamped
     *      value`, breaking the invariant that sum(amount) == latest balance.
     *      Now: reject the request if it would drop below 0 OR record only
     *      the actual delta applied (the clamp). Choosing the former — an
     *      operator removing more coins than the player has is almost
     *      certainly a typo; ask them to confirm. */
    const result = await prisma.$transaction(async (tx) => {
      const player = await tx.gamePlayer.findUnique({
        where: { id },
        select: { coins: true },
      });
      if (!player) {
        return { __error: { status: 404, message: 'Player not found' } } as const;
      }
      const newBalance = player.coins + amount;
      if (newBalance < 0) {
        return {
          __error: {
            status: 400,
            message: `Adjustment would drop balance below 0 (current=${player.coins}, delta=${amount}). Use a smaller magnitude or set balance to 0 explicitly first.`,
          },
        } as const;
      }
      const updated = await tx.gamePlayer.update({
        where: { id },
        data: { coins: amount > 0 ? { increment: amount } : { decrement: -amount } },
        select: { coins: true },
      });
      await tx.gameCoinTransaction.create({
        data: {
          playerId: id,
          type: 'admin_adjustment',
          amount,
          balance: updated.coins,
          description: note || `Admin adjustment: ${amount > 0 ? '+' : ''}${amount} coins`,
          adminId: admin.id,
          adminNote: note || null,
        },
      });
      return { __ok: { newBalance: updated.coins } } as const;
    });

    if ('__error' in result) {
      return NextResponse.json(
        { error: { message: result.__error.message } },
        { status: result.__error.status },
      );
    }

    return NextResponse.json({
      success: true,
      newBalance: result.__ok.newBalance,
    });
  } catch (error: any) {
    console.error('Admin adjust coins error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to adjust coins' } },
      { status: 500 },
    );
  }
}
