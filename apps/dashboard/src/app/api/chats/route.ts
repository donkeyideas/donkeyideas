import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createChatSchema = z.object({
  name: z.string().min(1, 'Chat name is required'),
});

// GET /api/chats - Get all chats for the user
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
    
    // Check if Chat model exists in Prisma client
    if (!prisma.chat) {
      return NextResponse.json(
        { 
          error: { 
            message: 'Chat history feature requires database migration. Please run: cd packages/database && npx prisma migrate dev --name add_chat_history && npx prisma generate' 
          } 
        },
        { status: 500 }
      );
    }

    let chats = [];
    try {
      chats = await prisma.chat.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 1, // Just get count, not all messages
          },
          _count: {
            select: { messages: true },
          },
        },
      });
    } catch (dbError: any) {
      // If Chat table doesn't exist yet, return empty array
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('Unknown model') || dbError.message?.includes('prisma.chat')) {
        console.warn('Chat table does not exist yet. Run: npx prisma migrate dev --name add_chat_history');
        return NextResponse.json({ chats: [] });
      }
      throw dbError;
    }
    
    return NextResponse.json({ chats });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch chats' } },
      { status: 500 }
    );
  }
}

// POST /api/chats - Create a new chat
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
    
    // Check if Chat model exists in Prisma client
    if (!prisma.chat) {
      return NextResponse.json(
        { 
          error: { 
            message: 'Chat history feature requires database migration. Please run: cd packages/database && npx prisma migrate dev --name add_chat_history && npx prisma generate' 
          } 
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validated = createChatSchema.parse(body);
    
    let chat;
    try {
      chat = await prisma.chat.create({
        data: {
          userId: user.id,
          name: validated.name,
        },
      });
    } catch (dbError: any) {
      // If Chat table doesn't exist yet, provide helpful error
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist') || dbError.message?.includes('Unknown model') || dbError.message?.includes('prisma.chat')) {
        return NextResponse.json(
          { error: { message: 'Chat history feature requires database migration. Please run: cd packages/database && npx prisma migrate dev --name add_chat_history && npx prisma generate' } },
          { status: 500 }
        );
      }
      throw dbError;
    }
    
    return NextResponse.json({ chat }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create chat' } },
      { status: 500 }
    );
  }
}

