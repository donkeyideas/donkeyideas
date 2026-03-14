import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const updatePostSchema = z.object({
  content: z.string().min(1).optional(),
  hashtags: z.array(z.string()).optional(),
  imagePrompt: z.string().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'CANCELLED']).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

// PATCH /api/social-posts/[id] - Update a post
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const { id } = await params;
    const post = await prisma.socialMediaPost.findUnique({ where: { id } });
    if (!post || post.userId !== user.id) {
      return NextResponse.json({ error: { message: 'Post not found' } }, { status: 404 });
    }
    if (post.status !== 'DRAFT' && post.status !== 'SCHEDULED') {
      return NextResponse.json({ error: { message: 'Can only edit DRAFT or SCHEDULED posts' } }, { status: 400 });
    }

    const body = await request.json();
    const data = updatePostSchema.parse(body);

    const updated = await prisma.socialMediaPost.update({
      where: { id },
      data: {
        content: data.content ?? undefined,
        hashtags: data.hashtags ?? undefined,
        imagePrompt: data.imagePrompt ?? undefined,
        status: (data.status as any) ?? undefined,
        scheduledAt: data.scheduledAt === null ? null : data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
    });

    return NextResponse.json({ post: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: 'Validation error', details: error.errors } }, { status: 400 });
    }
    console.error('Social post update error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to update post' } }, { status: 500 });
  }
}

// DELETE /api/social-posts/[id] - Delete a post
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const { id } = await params;
    const post = await prisma.socialMediaPost.findUnique({ where: { id } });
    if (!post || post.userId !== user.id) {
      return NextResponse.json({ error: { message: 'Post not found' } }, { status: 404 });
    }
    if (post.status === 'PUBLISHED') {
      return NextResponse.json({ error: { message: 'Cannot delete published posts' } }, { status: 400 });
    }

    await prisma.socialMediaPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Social post delete error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to delete post' } }, { status: 500 });
  }
}
