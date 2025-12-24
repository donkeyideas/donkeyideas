import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { logActivity } from '@/lib/activity-logger';

const updateCardSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  columnId: z.string().optional(),
  position: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
});

// PUT /api/cards/:id
export async function PUT(
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
    
    // Verify card ownership
    const card = await prisma.card.findFirst({
      where: { id: params.id },
      include: {
        column: {
          include: {
            board: {
              include: { company: true },
            },
          },
        },
      },
    });
    
    if (!card || card.column.board.company.userId !== user.id) {
      return NextResponse.json(
        { error: { message: 'Card not found' } },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const validated = updateCardSchema.parse(body);
    
    const oldCard = { ...card };
    const updatedCard = await prisma.card.update({
      where: { id: params.id },
      data: {
        title: validated.title,
        description: validated.description,
        columnId: validated.columnId,
        position: validated.position,
        tags: validated.tags,
      },
    });
    
    // Log activity
    await logActivity(
      user.id,
      card.column.board.companyId,
      'update',
      'card',
      params.id,
      {
        before: { title: oldCard.title, description: oldCard.description },
        after: { title: updatedCard.title, description: updatedCard.description },
      }
    );
    
    return NextResponse.json({ card: updatedCard });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update card' } },
      { status: 500 }
    );
  }
}

// DELETE /api/cards/:id
export async function DELETE(
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
    
    // Verify card ownership
    const card = await prisma.card.findFirst({
      where: { id: params.id },
      include: {
        column: {
          include: {
            board: {
              include: { company: true },
            },
          },
        },
      },
    });
    
    if (!card || card.column.board.company.userId !== user.id) {
      return NextResponse.json(
        { error: { message: 'Card not found' } },
        { status: 404 }
      );
    }
    
    const companyId = card.column.board.companyId;
    const cardTitle = card.title;
    
    await prisma.card.delete({
      where: { id: params.id },
    });
    
    // Log activity
    await logActivity(
      user.id,
      companyId,
      'delete',
      'card',
      params.id,
      { title: cardTitle }
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete card' } },
      { status: 500 }
    );
  }
}

