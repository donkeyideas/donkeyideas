import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserByToken, getTokenFromRequest } from '@/lib/auth';
import { runBriefing } from '@/lib/portfolio/run';

// POST /api/portfolio/run — manually trigger a portfolio briefing for the
// signed-in owner. Body: { email?: boolean } to also send the email.
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = getTokenFromRequest(request, cookieStore.get('auth-token')?.value);
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const briefing = await runBriefing({
      userId: user.id,
      ownerEmail: user.email,
      trigger: 'manual',
      email: body?.email === true,
    });

    return NextResponse.json({ briefing });
  } catch (error: any) {
    console.error('Portfolio run failed:', error);
    return NextResponse.json(
      { error: { message: error?.message || 'Failed to run portfolio briefing' } },
      { status: 500 },
    );
  }
}
