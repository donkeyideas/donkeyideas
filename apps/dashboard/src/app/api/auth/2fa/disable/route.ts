import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken, disable2FA } from '@/lib/auth';
import { cookies } from 'next/headers';

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

    const body = await request.json();
    const { password, code } = body;

    if (!password) {
      return NextResponse.json(
        { error: { message: 'Password is required' } },
        { status: 400 }
      );
    }

    // Disable 2FA
    await disable2FA(user.id, password, code);

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication disabled successfully',
    });
  } catch (error: any) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to disable 2FA' } },
      { status: 400 }
    );
  }
}
