import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    const where: any = {};
    if (playerId) {
      where.playerId = playerId;
    }

    const messages = await prisma.gameMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        player: {
          select: {
            id: true,
            playerName: true,
          },
        },
      },
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Admin messages GET error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch messages' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, title, body: messageBody, type, coinsAttached } = body;

    if (!playerId || !title || !messageBody) {
      return NextResponse.json(
        { error: { message: 'playerId, title, and body are required' } },
        { status: 400 },
      );
    }

    if (coinsAttached !== undefined && coinsAttached !== null) {
      if (
        typeof coinsAttached !== 'number' ||
        !Number.isInteger(coinsAttached) ||
        coinsAttached < 0 ||
        coinsAttached > 1_000_000
      ) {
        return NextResponse.json(
          { error: { message: 'coinsAttached must be an integer between 0 and 1,000,000' } },
          { status: 400 },
        );
      }
    }

    const player = await prisma.gamePlayer.findUnique({ where: { id: playerId } });
    if (!player) {
      return NextResponse.json(
        { error: { message: 'Player not found' } },
        { status: 404 },
      );
    }

    const coins = coinsAttached && coinsAttached > 0 ? coinsAttached : 0;

    // If coins are attached, update player balance and create a transaction
    if (coins > 0) {
      const newBalance = player.coins + coins;

      await prisma.$transaction([
        prisma.gamePlayer.update({
          where: { id: playerId },
          data: { coins: newBalance },
        }),
        prisma.gameCoinTransaction.create({
          data: {
            playerId,
            type: 'admin_adjustment',
            amount: coins,
            balance: newBalance,
            description: `Message reward: ${title}`,
            adminId: user.id,
            adminNote: `Coins attached to message: "${title}"`,
          },
        }),
        prisma.gameMessage.create({
          data: {
            playerId,
            title,
            body: messageBody,
            type: type || 'info',
            coinsAttached: coins,
            createdBy: user.id,
          },
        }),
      ]);

      return NextResponse.json({ success: true, coinsAwarded: coins, newBalance }, { status: 201 });
    }

    // No coins attached, just create the message
    const message = await prisma.gameMessage.create({
      data: {
        playerId,
        title,
        body: messageBody,
        type: type || 'info',
        coinsAttached: 0,
        createdBy: user.id,
      },
    });

    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error: any) {
    console.error('Admin messages POST error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to send message' } },
      { status: 500 },
    );
  }
}
