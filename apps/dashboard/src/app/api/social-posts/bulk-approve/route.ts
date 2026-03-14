import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const bulkApproveSchema = z.object({
  ids: z.array(z.string()).min(1).optional(),
  approveAll: z.boolean().optional(),
});

// POST /api/social-posts/bulk-approve - Schedule drafts for 9 AM UTC next day
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const body = await request.json();
    const data = bulkApproveSchema.parse(body);

    // Calculate 9 AM UTC next day
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(9, 0, 0, 0);

    const where: any = { userId: user.id, status: 'DRAFT' };
    if (data.ids && !data.approveAll) {
      where.id = { in: data.ids };
    }

    const result = await prisma.socialMediaPost.updateMany({
      where,
      data: {
        status: 'SCHEDULED',
        scheduledAt: tomorrow,
      },
    });

    return NextResponse.json({ updated: result.count, scheduledAt: tomorrow.toISOString() });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: 'Validation error', details: error.errors } }, { status: 400 });
    }
    console.error('Bulk approve error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to bulk approve' } }, { status: 500 });
  }
}
