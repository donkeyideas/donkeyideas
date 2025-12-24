import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  content: z.any(),
  published: z.boolean().optional(),
});

// GET /api/website/content/:section
export async function GET(
  request: NextRequest,
  { params }: { params: { section: string } }
) {
  try {
    const content = await prisma.websiteContent.findUnique({
      where: { section: params.section },
    });

    if (!content) {
      return NextResponse.json(
        { error: { message: 'Content not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch content' } },
      { status: 500 }
    );
  }
}

// PUT /api/website/content/:section
export async function PUT(
  request: NextRequest,
  { params }: { params: { section: string } }
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

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const content = await prisma.websiteContent.upsert({
      where: { section: params.section },
      update: {
        content: validated.content,
        published: validated.published ?? true,
      },
      create: {
        section: params.section,
        content: validated.content,
        published: validated.published ?? true,
      },
    });

    return NextResponse.json({ content });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { message: error.message || 'Failed to update content' } },
      { status: 500 }
    );
  }
}


