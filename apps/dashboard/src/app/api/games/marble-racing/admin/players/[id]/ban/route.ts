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
    const { reason } = body;

    const player = await prisma.gamePlayer.findUnique({ where: { id } });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }

    await prisma.gamePlayer.update({
      where: { id },
      data: {
        status: 'banned',
        banReason: reason || 'Banned by admin',
        bannedAt: new Date(),
        bannedBy: admin.id,
      },
    });

    // Invalidate all sessions
    await prisma.gamePlayerSession.deleteMany({ where: { playerId: id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin ban error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to ban player' } },
      { status: 500 },
    );
  }
}
