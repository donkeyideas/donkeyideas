import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const updatePostSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  excerpt: z.string().optional().nullable(),
  content: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().optional().nullable(),
  published: z.boolean().optional(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  seoKeywords: z.array(z.string()).optional(),
  focusKeyword: z.string().optional().nullable(),
});

function countWords(text: string): number {
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped ? stripped.split(/\s+/).length : 0;
}

// GET /api/blog/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const post = await prisma.blogPost.findUnique({
      where: { id },
      include: { author: { select: { name: true, email: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: { message: 'Post not found' } }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error('Blog get error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch post' } },
      { status: 500 }
    );
  }
}

// PUT /api/blog/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: { message: 'Post not found' } }, { status: 404 });
    }

    const body = await request.json();
    const data = updatePostSchema.parse(body);

    // Check slug uniqueness if changing
    if (data.slug && data.slug !== existing.slug) {
      const slugTaken = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
      if (slugTaken) {
        return NextResponse.json(
          { error: { message: 'A post with this slug already exists' } },
          { status: 409 }
        );
      }
    }

    const content = data.content || existing.content;
    const wordCount = countWords(content);
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Set publishedAt when first published
    let publishedAt = existing.publishedAt;
    if (data.published === true && !existing.publishedAt) {
      publishedAt = new Date();
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...data,
        wordCount,
        readTime,
        publishedAt,
      },
    });

    return NextResponse.json({ post });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    console.error('Blog update error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update post' } },
      { status: 500 }
    );
  }
}

// DELETE /api/blog/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    await prisma.blogPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Blog delete error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete post' } },
      { status: 500 }
    );
  }
}
