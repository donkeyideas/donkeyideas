import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().optional(),
  published: z.boolean().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.array(z.string()).optional(),
  focusKeyword: z.string().optional(),
});

function countWords(text: string): number {
  const stripped = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return stripped ? stripped.split(/\s+/).length : 0;
}

// GET /api/blog - List all blog posts
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const publishedOnly = searchParams.get('published') === 'true';

    const posts = await prisma.blogPost.findMany({
      where: publishedOnly ? { published: true } : {},
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true, email: true } } },
    });

    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error('Blog list error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch blog posts' } },
      { status: 500 }
    );
  }
}

// POST /api/blog - Create a new blog post
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const data = createPostSchema.parse(body);

    const wordCount = countWords(data.content);
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    // Ensure unique slug
    const existing = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
    if (existing) {
      return NextResponse.json(
        { error: { message: 'A post with this slug already exists' } },
        { status: 409 }
      );
    }

    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || null,
        content: data.content,
        category: data.category || null,
        tags: data.tags || [],
        featuredImage: data.featuredImage || null,
        published: data.published || false,
        publishedAt: data.published ? new Date() : null,
        authorId: user.id,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
        seoKeywords: data.seoKeywords || [],
        focusKeyword: data.focusKeyword || null,
        wordCount,
        readTime,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    console.error('Blog create error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create blog post' } },
      { status: 500 }
    );
  }
}
