import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// PUT /api/companies/:id/decks/:deckId - Update deck content
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; deckId: string } }
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

    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }

    // Verify deck ownership
    const deck = await prisma.deck.findFirst({
      where: {
        id: params.deckId,
        companyId: params.id,
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: { message: 'Deck not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content, title } = body;

    // Update deck
    const updatedDeck = await prisma.deck.update({
      where: { id: params.deckId },
      data: {
        content: content || deck.content,
        title: title || deck.title,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ deck: updatedDeck });
  } catch (error: any) {
    console.error('Failed to update deck:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to update deck' } },
      { status: 500 }
    );
  }
}

// DELETE /api/companies/:id/decks/:deckId - Delete deck
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; deckId: string } }
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

    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }

    // Verify deck ownership
    const deck = await prisma.deck.findFirst({
      where: {
        id: params.deckId,
        companyId: params.id,
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: { message: 'Deck not found' } },
        { status: 404 }
      );
    }

    // Delete deck
    await prisma.deck.delete({
      where: { id: params.deckId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete deck:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to delete deck' } },
      { status: 500 }
    );
  }
}

// GET /api/companies/:id/decks/:deckId - Get specific deck
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; deckId: string } }
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

    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }

    // Get deck
    const deck = await prisma.deck.findFirst({
      where: {
        id: params.deckId,
        companyId: params.id,
      },
    });

    if (!deck) {
      return NextResponse.json(
        { error: { message: 'Deck not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ deck });
  } catch (error: any) {
    console.error('Failed to get deck:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to get deck' } },
      { status: 500 }
    );
  }
}
