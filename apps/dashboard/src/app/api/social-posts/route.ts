import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createPostSchema = z.object({
  platform: z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK']),
  content: z.string().min(1),
  hashtags: z.array(z.string()).optional(),
  imagePrompt: z.string().optional(),
  tone: z.string().optional(),
  topic: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED']).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// GET /api/social-posts - List posts with filters
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const where: any = { userId: user.id };
    if (status) {
      const statuses = status.split(',');
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }
    if (platform) where.platform = platform;

    const [posts, total, counts] = await Promise.all([
      prisma.socialMediaPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.socialMediaPost.count({ where }),
      prisma.socialMediaPost.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: true,
      }),
    ]);

    const statusCounts = counts.reduce((acc: any, c) => {
      acc[c.status] = c._count;
      return acc;
    }, {});

    return NextResponse.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      counts: statusCounts,
    });
  } catch (error: any) {
    console.error('Social posts list error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to fetch posts' } }, { status: 500 });
  }
}

// POST /api/social-posts - Create a post
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const body = await request.json();
    const data = createPostSchema.parse(body);

    const post = await prisma.socialMediaPost.create({
      data: {
        userId: user.id,
        platform: data.platform as any,
        content: data.content,
        hashtags: data.hashtags || [],
        imagePrompt: data.imagePrompt || null,
        tone: data.tone || null,
        topic: data.topic || null,
        status: (data.status as any) || 'DRAFT',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: 'Validation error', details: error.errors } }, { status: 400 });
    }
    console.error('Social post create error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to create post' } }, { status: 500 });
  }
}
