import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { logActivity } from '@/lib/activity-logger';

const moveCardSchema = z.object({
  columnId: z.string(),
  position: z.number().int().min(0),
});

// PUT /api/cards/:id/move
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
    const validated = moveCardSchema.parse(body);
    
    // Verify new column ownership
    const newColumn = await prisma.column.findFirst({
      where: { id: validated.columnId },
      include: {
        board: {
          include: { company: true },
        },
      },
    });
    
    if (!newColumn || newColumn.board.company.userId !== user.id) {
      return NextResponse.json(
        { error: { message: 'Column not found' } },
        { status: 404 }
      );
    }
    
    // Update card position
    const oldColumnId = card.columnId;
    const updatedCard = await prisma.card.update({
      where: { id: params.id },
      data: {
        columnId: validated.columnId,
        position: validated.position,
      },
    });
    
    // Log activity if moved to different column
    if (oldColumnId !== validated.columnId) {
      await logActivity(
        user.id,
        card.column.board.companyId,
        'move',
        'card',
        params.id,
        {
          fromColumn: oldColumnId,
          toColumn: validated.columnId,
          title: card.title,
        }
      );
    }
    
    return NextResponse.json({ card: updatedCard });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to move card' } },
      { status: 500 }
    );
  }
}

