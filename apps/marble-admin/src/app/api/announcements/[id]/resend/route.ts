import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { dispatchAnnouncement, checkReceipts } from '@/lib/pushDispatch';

/**
 * Manually re-dispatch a push for an existing announcement, and optionally
 * poll receipts. Used by the Live Ops "Resend" button.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }
    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const receiptsOnly = searchParams.get('receiptsOnly') === '1';

    if (receiptsOnly) {
      const result = await checkReceipts(id);
      return NextResponse.json({ receipts: result });
    }

    const summary = await dispatchAnnouncement(id);
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Announcement resend error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to resend announcement' } },
      { status: 500 },
    );
  }
}
