import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET /api/aso/suggest?term=marble&store=play — get keyword suggestions
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const term = request.nextUrl.searchParams.get('term') || '';
    const store = request.nextUrl.searchParams.get('store') || 'play';

    if (!term || term.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    let suggestions: string[] = [];

    if (store === 'play') {
      const gplay = require('google-play-scraper').default;
      suggestions = await gplay.suggest({ term });
    } else if (store === 'ios') {
      const appStore = require('app-store-scraper');
      suggestions = await appStore.suggest({ term });
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 10) });
  } catch (error: any) {
    console.error('ASO suggest error:', error);
    return NextResponse.json({ error: { message: error.message || 'Suggest failed' } }, { status: 500 });
  }
}
