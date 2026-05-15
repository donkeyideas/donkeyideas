import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

    const player = await prisma.gamePlayer.findUnique({ where: { id } });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }

    await prisma.gamePlayer.update({
      where: { id },
      data: {
        status: 'active',
        banReason: null,
        bannedAt: null,
        bannedBy: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin unban error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to unban player' } },
      { status: 500 },
    );
  }
}
