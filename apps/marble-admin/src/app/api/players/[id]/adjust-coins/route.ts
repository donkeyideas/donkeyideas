import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
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
    const admin = await getUserByToken(token);
    if (!admin) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
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

    if (!Number.isFinite(amount) || !Number.isInteger(amount) || Math.abs(amount) > 1_000_000) {
      return NextResponse.json(
        { error: { message: 'amount must be a finite integer with |amount| <= 1,000,000' } },
        { status: 400 },
      );
    }

    if (Math.abs(amount) > 100_000 && (!note || typeof note !== 'string' || !note.trim())) {
      return NextResponse.json(
        { error: { message: 'A note is required for adjustments greater than 100,000 coins' } },
        { status: 400 },
      );
    }

    const player = await prisma.gamePlayer.findUnique({ where: { id } });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }

    const newBalance = Math.max(0, player.coins + amount);

    await prisma.gamePlayer.update({
      where: { id },
      data: { coins: newBalance },
    });

    await prisma.gameCoinTransaction.create({
      data: {
        playerId: id,
        type: 'admin_adjustment',
        amount,
        balance: newBalance,
        description: note || `Admin adjustment: ${amount > 0 ? '+' : ''}${amount} coins`,
        adminId: admin.id,
        adminNote: note || null,
      },
    });

    return NextResponse.json({
      success: true,
      newBalance,
    });
  } catch (error: any) {
    console.error('Admin adjust coins error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to adjust coins' } },
      { status: 500 },
    );
  }
}
