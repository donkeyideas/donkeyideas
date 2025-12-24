import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { logActivity } from '@/lib/activity-logger';

const createColumnSchema = z.object({
  name: z.string().min(1, 'Column name is required'),
  position: z.number().int().min(0),
});

// POST /api/boards/:id/columns
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
    
    // Verify board ownership through company
    const board = await prisma.board.findFirst({
      where: { id: params.id },
      include: { company: true },
    });
    
    if (!board || board.company.userId !== user.id) {
      return NextResponse.json(
        { error: { message: 'Board not found' } },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const validated = createColumnSchema.parse(body);
    
    const column = await prisma.column.create({
      data: {
        boardId: params.id,
        name: validated.name,
        position: validated.position,
      },
      include: {
        cards: {
          orderBy: { position: 'asc' },
        },
      },
    });
    
    // Log activity
    await logActivity(
      user.id,
      board.companyId,
      'create',
      'column',
      column.id,
      { name: column.name }
    );
    
    return NextResponse.json({ column }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create column' } },
      { status: 500 }
    );
  }
}


