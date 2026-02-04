import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/admin/messages/unread-count - Get unread message count
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ count: 0 });
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ count: 0 });
    }

    try {
      const count = await prisma.contactSubmission.count({
        where: { read: false },
      });

      return NextResponse.json({ count });
    } catch (dbError: any) {
      // If table doesn't have 'read' column yet, return 0
      if (dbError.code === 'P2022' || dbError.message?.includes('column')) {
        return NextResponse.json({ count: 0 });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error('Failed to get unread count:', error);
    return NextResponse.json({ count: 0 });
  }
}
