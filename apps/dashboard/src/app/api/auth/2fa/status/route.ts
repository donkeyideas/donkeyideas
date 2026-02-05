import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken, get2FAStatus } from '@/lib/auth';
import { cookies } from 'next/headers';

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

    // Get 2FA status
    const status = await get2FAStatus(user.id);

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('2FA status error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to get 2FA status' } },
      { status: 500 }
    );
  }
}
