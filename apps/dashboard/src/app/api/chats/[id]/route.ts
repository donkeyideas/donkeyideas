import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const updateChatSchema = z.object({
  name: z.string().min(1).optional(),
});

// GET /api/chats/:id - Get a specific chat with all messages
export async function GET(
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
    
    let chat;
    try {
      chat = await prisma.chat.findFirst({
        where: {
          id: params.id,
          userId: user.id,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    } catch (dbError: any) {
      // If Chat table doesn't exist yet
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('Unknown model')) {
        return NextResponse.json(
          { error: { message: 'Chat history feature requires database migration. Please run: npx prisma migrate dev --name add_chat_history in packages/database directory' } },
          { status: 500 }
        );
      }
      throw dbError;
    }
    
    if (!chat) {
      return NextResponse.json(
        { error: { message: 'Chat not found' } },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ chat });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch chat' } },
      { status: 500 }
    );
  }
}

// PUT /api/chats/:id - Update chat name
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
    
    const body = await request.json();
    const validated = updateChatSchema.parse(body);
    
    let chat;
    try {
      chat = await prisma.chat.findFirst({
        where: {
          id: params.id,
          userId: user.id,
        },
      });
    } catch (dbError: any) {
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('Unknown model')) {
        return NextResponse.json(
          { error: { message: 'Chat history feature requires database migration' } },
          { status: 500 }
        );
      }
      throw dbError;
    }
    
    if (!chat) {
      return NextResponse.json(
        { error: { message: 'Chat not found' } },
        { status: 404 }
      );
    }
    
    let updated;
    try {
      updated = await prisma.chat.update({
        where: { id: params.id },
        data: validated,
      });
    } catch (dbError: any) {
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('Unknown model')) {
        return NextResponse.json(
          { error: { message: 'Chat history feature requires database migration' } },
          { status: 500 }
        );
      }
      throw dbError;
    }
    
    return NextResponse.json({ chat: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update chat' } },
      { status: 500 }
    );
  }
}

// DELETE /api/chats/:id - Delete a chat
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
    
    let chat;
    try {
      chat = await prisma.chat.findFirst({
        where: {
          id: params.id,
          userId: user.id,
        },
      });
    } catch (dbError: any) {
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('Unknown model')) {
        return NextResponse.json(
          { error: { message: 'Chat history feature requires database migration' } },
          { status: 500 }
        );
      }
      throw dbError;
    }
    
    if (!chat) {
      return NextResponse.json(
        { error: { message: 'Chat not found' } },
        { status: 404 }
      );
    }
    
    try {
      await prisma.chat.delete({
        where: { id: params.id },
      });
    } catch (dbError: any) {
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('Unknown model')) {
        return NextResponse.json(
          { error: { message: 'Chat history feature requires database migration' } },
          { status: 500 }
        );
      }
      throw dbError;
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete chat' } },
      { status: 500 }
    );
  }
}

