import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/**
 * Mark / unmark a player as an internal test user. Sets flagReason to
 * the literal "test_user" sentinel without changing status, so the
 * player still functions normally in the app but is excluded from
 * Financials revenue / refund metrics.
 *
 * Uses the existing flagReason column on game_players — no migration
 * needed. The Financials route filters on `player.flagReason !=
 * 'test_user'` for every aggregate.
 */

const TEST_USER_FLAG = 'test_user';

export async function POST(
  _request: NextRequest,
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
    const player = await prisma.gamePlayer.findUnique({ where: { id }, select: { id: true } });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }

    await prisma.gamePlayer.update({
      where: { id },
      data: { flagReason: TEST_USER_FLAG },
    });
    return NextResponse.json({ marked: true });
  } catch (error: any) {
    console.error('Mark-test error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to mark test user' } },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
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
      select: { id: true, flagReason: true },
    });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }
    if (player.flagReason !== TEST_USER_FLAG) {
      return NextResponse.json({ marked: false });
    }

    await prisma.gamePlayer.update({
      where: { id },
      data: { flagReason: null },
    });
    return NextResponse.json({ marked: false });
  } catch (error: any) {
    console.error('Unmark-test error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to unmark test user' } },
      { status: 500 },
    );
  }
}
