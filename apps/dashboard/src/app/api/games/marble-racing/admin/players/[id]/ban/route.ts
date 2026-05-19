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
    const { reason } = body;

    // Validate banReason — required non-empty string, trimmed length 3..500.
    // Prevents blank/garbage reasons from being recorded against players.
    if (typeof reason !== 'string') {
      return NextResponse.json(
        { error: { message: 'banReason must be a string' } },
        { status: 400 },
      );
    }
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3 || trimmedReason.length > 500) {
      return NextResponse.json(
        { error: { message: 'banReason must be 3-500 characters after trimming' } },
        { status: 400 },
      );
    }

    const player = await prisma.gamePlayer.findUnique({ where: { id } });
    if (!player) {
      return NextResponse.json({ error: { message: 'Player not found' } }, { status: 404 });
    }

    // ATOMIC: ban-flag flip and session invalidation must happen together.
    // A crash between them previously left a player half-banned (status=banned
    // but live sessions still valid, or sessions wiped but status not updated).
    await prisma.$transaction(async (tx) => {
      await tx.gamePlayer.update({
        where: { id },
        data: {
          status: 'banned',
          banReason: trimmedReason,
          bannedAt: new Date(),
          bannedBy: admin.id,
        },
      });
      // Invalidate all sessions
      await tx.gamePlayerSession.deleteMany({ where: { playerId: id } });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin ban error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to ban player' } },
      { status: 500 },
    );
  }
}
