import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getGamePlayerByToken, extractGameToken } from '@/lib/game-auth';

// GET: Ticket detail with all messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!ticket || ticket.playerId !== player.id) {
      return NextResponse.json(
        { error: { message: 'Ticket not found' } },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        createdAt: ticket.createdAt,
        resolvedAt: ticket.resolvedAt,
        resolution: ticket.resolution,
        messages: ticket.messages.map(m => ({
          id: m.id,
          authorName: m.authorName,
          authorType: m.authorType,
          content: m.content,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Ticket detail error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch ticket' } },
      { status: 500 },
    );
  }
}

// POST: Player replies to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: { message: 'Message content is required' } },
        { status: 400 },
      );
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket || ticket.playerId !== player.id) {
      return NextResponse.json(
        { error: { message: 'Ticket not found' } },
        { status: 404 },
      );
    }

    if (ticket.status === 'resolved') {
      return NextResponse.json(
        { error: { message: 'Cannot reply to a resolved ticket' } },
        { status: 400 },
      );
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        authorName: player.playerName,
        authorType: 'player',
        content: content.trim().slice(0, 2000),
      },
    });

    // If ticket was pending (admin replied), set back to open
    if (ticket.status === 'pending') {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: 'open' },
      });
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('Ticket reply error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to reply' } },
      { status: 500 },
    );
  }
}
