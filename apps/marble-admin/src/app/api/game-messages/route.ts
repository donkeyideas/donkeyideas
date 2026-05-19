import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';

/* ------------------------------------------------------------------ */
/*  Public endpoint — no cookie auth. Game sends its playerId param.  */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  try {
    const playerId = request.nextUrl.searchParams.get('playerId');
    if (!playerId) {
      return NextResponse.json({ messages: [] });
    }

    const messages = await prisma.gameMessage.findMany({
      where: {
        playerId,
        read: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        coinsAttached: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    // On error, return empty array so the game never breaks
    return NextResponse.json({ messages: [] });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const playerId = request.nextUrl.searchParams.get('playerId');
    if (!playerId) {
      return NextResponse.json({ error: 'playerId required' }, { status: 400 });
    }

    const body = await request.json();
    const { messageIds } = body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'messageIds required' }, { status: 400 });
    }

    // Security: verify all requested messages actually belong to this player.
    // No admin session token is available on this public endpoint, so we
    // defensively confirm ownership before mutating.
    const owned = await prisma.gameMessage.findMany({
      where: { id: { in: messageIds } },
      select: { id: true, playerId: true },
    });

    const mismatched = owned.find((m) => m.playerId !== playerId);
    if (mismatched) {
      return NextResponse.json(
        { error: 'One or more messages do not belong to the supplied player' },
        { status: 403 },
      );
    }

    await prisma.gameMessage.updateMany({
      where: {
        id: { in: messageIds },
        playerId,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to mark messages as read' }, { status: 500 });
  }
}
