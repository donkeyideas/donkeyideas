import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const createBoardSchema = z.object({
  name: z.string().min(1, 'Board name is required'),
});

// GET /api/companies/consolidated/boards - Get consolidated board for all companies
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
    
    // Get or create a consolidated board for the user
    // We'll use a special naming convention or create a board in the first company
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    
    if (companies.length === 0) {
      return NextResponse.json({ boards: [] });
    }
    
    // Look for existing "Donkey Ideas" board or create one
    let consolidatedBoard = await prisma.board.findFirst({
      where: {
        companyId: companies[0].id, // Use first company as container
        name: 'Donkey Ideas Board',
      },
      include: {
        columns: {
          include: {
            cards: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
    
    // If no consolidated board exists, create one
    if (!consolidatedBoard) {
      consolidatedBoard = await prisma.board.create({
        data: {
          companyId: companies[0].id,
          name: 'Donkey Ideas Board',
        },
        include: {
          columns: {
            include: {
              cards: {
                orderBy: { position: 'asc' },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
      });
    }
    
    return NextResponse.json({ boards: [consolidatedBoard] });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Failed to fetch consolidated board' } },
      { status: 500 }
    );
  }
}

// POST /api/companies/consolidated/boards - Create consolidated board
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
    
    const companies = await prisma.company.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    
    if (companies.length === 0) {
      return NextResponse.json(
        { error: { message: 'No companies found. Please create a company first.' } },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    const validated = createBoardSchema.parse(body);
    
    const board = await prisma.board.create({
      data: {
        companyId: companies[0].id, // Use first company as container
        name: validated.name,
      },
      include: {
        columns: {
          include: {
            cards: true,
          },
        },
      },
    });
    
    return NextResponse.json({ board }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Validation error', details: error.errors } },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Failed to create board' } },
      { status: 500 }
    );
  }
}

