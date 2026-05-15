import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Reply to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const admin = await getUserByToken(token);
    if (!admin) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: { message: 'Message content is required' } }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: { message: 'Ticket not found' } }, { status: 404 });
    }

    // Create the message
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        authorName: admin.name || admin.email || 'Admin',
        authorType: 'admin',
        content: content.trim(),
      },
    });

    // Update ticket status to pending if it was open
    if (ticket.status === 'open') {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: 'pending', assignedTo: admin.name || admin.email },
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

// Update ticket status (resolve, reopen, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const admin = await getUserByToken(token);
    if (!admin) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { status, resolution } = body;

    const data: any = {};
    if (status) {
      data.status = status;
      if (status === 'resolved') {
        data.resolvedAt = new Date();
        if (resolution) data.resolution = resolution;
      }
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ticket });
  } catch (error: any) {
    console.error('Ticket update error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update ticket' } },
      { status: 500 },
    );
  }
}
