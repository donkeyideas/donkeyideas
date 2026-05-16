import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/aso/keywords?store=play
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const store = request.nextUrl.searchParams.get('store') || 'play';

    const keywords = await prisma.asoKeyword.findMany({
      where: { store },
      orderBy: [{ rank: { sort: 'asc', nulls: 'last' } }, { keyword: 'asc' }],
    });

    return NextResponse.json({ keywords });
  } catch (error: any) {
    console.error('ASO keywords GET error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed' } }, { status: 500 });
  }
}

// POST /api/aso/keywords — create or update a keyword
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const body = await request.json();
    const { store, keyword, rank, volume, difficulty, kei, topCompetitor, relevance, intent, delta7d } = body;

    if (!store || !keyword) {
      return NextResponse.json({ error: { message: 'store and keyword are required' } }, { status: 400 });
    }

    const result = await prisma.asoKeyword.upsert({
      where: { store_keyword: { store, keyword } },
      create: {
        store,
        keyword,
        rank: rank ?? null,
        volume: volume || null,
        difficulty: difficulty ?? 0,
        kei: kei ?? 0,
        topCompetitor: topCompetitor || null,
        relevance: relevance ?? 0,
        intent: intent || 'informational',
        delta7d: delta7d ?? null,
      },
      update: {
        rank: rank ?? null,
        volume: volume || null,
        difficulty: difficulty ?? 0,
        kei: kei ?? 0,
        topCompetitor: topCompetitor || null,
        relevance: relevance ?? 0,
        intent: intent || 'informational',
        delta7d: delta7d ?? null,
      },
    });

    return NextResponse.json({ keyword: result });
  } catch (error: any) {
    console.error('ASO keywords POST error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed' } }, { status: 500 });
  }
}

// DELETE /api/aso/keywords?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: { message: 'id is required' } }, { status: 400 });

    await prisma.asoKeyword.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('ASO keywords DELETE error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed' } }, { status: 500 });
  }
}
