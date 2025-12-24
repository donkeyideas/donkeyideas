import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { logActivity } from '@/lib/activity-logger';

const createCardSchema = z.object({
  title: z.string().min(1, 'Card title is required'),
  description: z.string().optional().nullable(),
  position: z.number().int().min(0),
  tags: z.array(z.string()).default([]),
});

// POST /api/columns/:id/cards
export async function POST(
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
    
    // Verify column ownership through board -> company
    const column = await prisma.column.findFirst({
      where: { id: params.id },
      include: {
        board: {
          include: { company: true },
        },
      },
    });
    
    if (!column || column.board.company.userId !== user.id) {
      return NextResponse.json(
        { error: { message: 'Column not found' } },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const validated = createCardSchema.parse(body);
    
    const card = await prisma.card.create({
      data: {
        columnId: params.id,
        title: validated.title,
        description: validated.description || null,
        position: validated.position,
        tags: validated.tags,
      },
    });
    
    // Log activity
    await logActivity(
      user.id,
      column.board.companyId,
      'create',
      'card',
      card.id,
      { title: card.title }
    );
    
    return NextResponse.json({ card }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create card' } },
      { status: 500 }
    );
  }
}

