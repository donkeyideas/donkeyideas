import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { logActivity } from '@/lib/activity-logger';

const updateColumnSchema = z.object({
  name: z.string().min(1),
  position: z.number().int().min(0).optional(),
});

// PUT /api/columns/:id
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
    
    // Verify column ownership
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
    const validated = updateColumnSchema.parse(body);
    
    const oldName = column.name;
    const updatedColumn = await prisma.column.update({
      where: { id: params.id },
      data: {
        name: validated.name,
        position: validated.position,
      },
    });
    
    // Log activity
    await logActivity(
      user.id,
      column.board.companyId,
      'update',
      'column',
      params.id,
      {
        before: { name: oldName },
        after: { name: updatedColumn.name },
      }
    );
    
    return NextResponse.json({ column: updatedColumn });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update column' } },
      { status: 500 }
    );
  }
}

// DELETE /api/columns/:id
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
    
    // Verify column ownership
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
    
    const companyId = column.board.companyId;
    const columnName = column.name;
    
    await prisma.column.delete({
      where: { id: params.id },
    });
    
    // Log activity
    await logActivity(
      user.id,
      companyId,
      'delete',
      'column',
      params.id,
      { name: columnName }
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete column' } },
      { status: 500 }
    );
  }
}

