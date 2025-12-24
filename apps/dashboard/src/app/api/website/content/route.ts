import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { z } from 'zod';

const contentSchema = z.object({
  section: z.string(),
  content: z.any(),
  published: z.boolean().optional(),
});

// GET /api/website/content
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

    const content = await prisma.websiteContent.findMany({
      orderBy: { section: 'asc' },
    });

    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch content' } },
      { status: 500 }
    );
  }
}

// POST /api/website/content
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validated = contentSchema.parse(body);

    const content = await prisma.websiteContent.upsert({
      where: { section: validated.section },
      update: {
        content: validated.content,
        published: validated.published ?? true,
      },
      create: {
        section: validated.section,
        content: validated.content,
        published: validated.published ?? true,
      },
    });

    return NextResponse.json({ content }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { message: error.message || 'Failed to save content' } },
      { status: 500 }
    );
  }
}


