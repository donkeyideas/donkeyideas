import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { generateDeck } from '@/lib/deck-generator';

/* ------------------------------------------------------------------ */
/*  POST /api/decks/generate                                            */
/*                                                                     */
/*  Builds both decks (pitch + business) from a fresh snapshot of      */
/*  platform data. Returns the two new GeneratedDeck rows so the       */
/*  admin UI can immediately show the share links.                     */
/*                                                                     */
/*  Body: { type?: 'pitch' | 'business' | 'both' } — defaults to both. */
/* ------------------------------------------------------------------ */

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const requestedType: 'pitch' | 'business' | 'both' =
      body.type === 'pitch' || body.type === 'business' ? body.type : 'both';

    const generated: { type: string; shareToken: string; id: string; title: string; generatedAt: Date }[] = [];

    if (requestedType === 'pitch' || requestedType === 'both') {
      generated.push(await generateDeck('pitch', admin.id));
    }
    if (requestedType === 'business' || requestedType === 'both') {
      generated.push(await generateDeck('business', admin.id));
    }

    return NextResponse.json({ success: true, decks: generated });
  } catch (error: any) {
    console.error('Generate deck error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to generate deck', stack: (error?.stack ?? '').split('\n').slice(0, 3).join(' | ') } },
      { status: 500 },
    );
  }
}
