import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken, verify2FA } from '@/lib/auth';
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
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: { message: 'Verification code is required' } },
        { status: 400 }
      );
    }

    // Verify and enable 2FA
    await verify2FA(user.id, code);

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
    });
  } catch (error: any) {
    console.error('2FA verify error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to verify 2FA' } },
      { status: 400 }
    );
  }
}
