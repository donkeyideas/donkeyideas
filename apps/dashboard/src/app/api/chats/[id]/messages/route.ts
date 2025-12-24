import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

// POST /api/chats/:id/messages - Add a message to a chat
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
    
    const body = await request.json();
    const validated = createMessageSchema.parse(body);
    
    let message;
    try {
      message = await prisma.chatMessage.create({
        data: {
          chatId: params.id,
          role: validated.role,
          content: validated.content,
        },
      });
      
      // Update chat's updatedAt timestamp
      await prisma.chat.update({
        where: { id: params.id },
        data: { updatedAt: new Date() },
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
    
    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create message' } },
      { status: 500 }
    );
  }
}

