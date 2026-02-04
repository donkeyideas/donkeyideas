import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/admin/messages - Get all contact messages
export async function GET(request: NextRequest) {
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

    // Get query params
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // all, unread, read
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (filter === 'unread') {
      where.read = false;
    } else if (filter === 'read') {
      where.read = true;
    }

    // Fetch messages with pagination
    const [messages, total, unreadCount] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.contactSubmission.count({ where }),
      prisma.contactSubmission.count({ where: { read: false } }),
    ]);

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error: any) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch messages' } },
      { status: 500 }
    );
  }
}
