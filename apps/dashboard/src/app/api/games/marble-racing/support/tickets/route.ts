import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';

// GET: List player's own tickets
export async function GET(request: NextRequest) {
  try {
    const token = extractGameToken(request);
    if (!token) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 },
      );
    }
    const player = await getGamePlayerByToken(token);
    if (!player) {
      return NextResponse.json(
        { error: { message: 'Invalid session' } },
        { status: 401 },
      );
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { playerId: player.id },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json({
      tickets: tickets.map(t => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt,
        resolvedAt: t.resolvedAt,
        messageCount: t.messages.length,
        lastMessage: t.messages.length > 0
          ? {
              authorType: t.messages[t.messages.length - 1].authorType,
              content: t.messages[t.messages.length - 1].content,
              createdAt: t.messages[t.messages.length - 1].createdAt,
            }
          : null,
        hasUnreadAdminReply:
          t.messages.length > 0 &&
          t.messages[t.messages.length - 1].authorType === 'admin',
      })),
    });
  } catch (error: any) {
    console.error('Support tickets list error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch tickets' } },
      { status: 500 },
    );
  }
}

// POST: Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const token = extractGameToken(request);
    if (!token) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 },
      );
    }
    const player = await getGamePlayerByToken(token);
    if (!player) {
      return NextResponse.json(
        { error: { message: 'Invalid session' } },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { subject, category, message } = body;

    if (!subject?.trim() || !category || !message?.trim()) {
      return NextResponse.json(
        { error: { message: 'subject, category, and message are required' } },
        { status: 400 },
      );
    }

    // Generate ticket number using timestamp + random suffix instead of
    // `count + 1`. The old scheme had a race: two parallel POSTs could both
    // read the same count and both insert TKT-0042. Timestamp + 6-char base36
    // random avoids the collision without needing a sequence or extra lock.
    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        playerId: player.id,
        playerName: player.playerName,
        playerEmail: player.email,
        platform: player.platform,
        subject: subject.trim().slice(0, 200),
        category,
        priority: 'low',
        status: 'open',
      },
    });

    // Create the initial message
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorName: player.playerName,
        authorType: 'player',
        content: message.trim().slice(0, 2000),
      },
    });

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create ticket error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create ticket' } },
      { status: 500 },
    );
  }
}
