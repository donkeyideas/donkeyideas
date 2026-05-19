import { NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

/* ------------------------------------------------------------------ */
/*  GET /api/decks/list                                                 */
/*                                                                     */
/*  Returns the latest few generated decks for each type so the admin  */
/*  page can show "current pitch deck + history" and lets the user     */
/*  roll back to a previous version if a fresh regenerate produces     */
/*  something they don't like.                                         */
/* ------------------------------------------------------------------ */

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const admin = await getUserByToken(token);
    if (!admin) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const decks = await prisma.generatedDeck.findMany({
      orderBy: { generatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        shareToken: true,
        title: true,
        generatedAt: true,
        generatedBy: true,
      },
    });

    // Group by type, latest first
    const pitch = decks.filter((d) => d.type === 'pitch');
    const business = decks.filter((d) => d.type === 'business');

    return NextResponse.json({
      latest: {
        pitch: pitch[0] || null,
        business: business[0] || null,
      },
      history: { pitch: pitch.slice(0, 10), business: business.slice(0, 10) },
    });
  } catch (error: any) {
    console.error('List decks error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to list decks' } },
      { status: 500 },
    );
  }
}
