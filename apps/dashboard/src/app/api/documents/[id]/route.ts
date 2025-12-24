import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const updateDocumentSchema = z.object({
  filename: z.string().min(1).optional(),
});

// PUT /api/documents/:id
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
    
    // Find document and verify company ownership
    const document = await prisma.document.findFirst({
      where: { id: params.id },
      include: {
        company: true,
      },
    });
    
    if (!document) {
      return NextResponse.json(
        { error: { message: 'Document not found' } },
        { status: 404 }
      );
    }
    
    if (document.company.userId !== user.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validated = updateDocumentSchema.parse(body);
    
    const updatedDocument = await prisma.document.update({
      where: { id: params.id },
      data: {
        ...(validated.filename && { filename: validated.filename }),
      },
    });
    
    return NextResponse.json({ document: updatedDocument });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update document' } },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/:id
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
    
    // Find document and verify company ownership
    const document = await prisma.document.findFirst({
      where: { id: params.id },
      include: {
        company: true,
      },
    });
    
    if (!document) {
      return NextResponse.json(
        { error: { message: 'Document not found' } },
        { status: 404 }
      );
    }
    
    if (document.company.userId !== user.id) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }
    
    await prisma.document.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete document' } },
      { status: 500 }
    );
  }
}

