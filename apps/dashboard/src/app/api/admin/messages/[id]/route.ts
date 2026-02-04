import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/admin/messages/:id - Get single message
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid session' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    const message = await prisma.contactSubmission.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json(
        { error: { message: 'Message not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('Failed to fetch message:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch message' } },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/messages/:id - Update message (mark as read/unread)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid session' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { read } = body;

    const message = await prisma.contactSubmission.update({
      where: { id },
      data: {
        read: read,
        readAt: read ? new Date() : null,
      },
    });

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('Failed to update message:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update message' } },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/messages/:id - Delete message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: { message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid session' } },
        { status: 401 }
      );
    }

    const { id } = await params;

    await prisma.contactSubmission.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete message:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete message' } },
      { status: 500 }
    );
  }
}
