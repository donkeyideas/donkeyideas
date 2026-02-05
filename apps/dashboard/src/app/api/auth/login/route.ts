import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await loginUser(body);

    // Check if 2FA is required
    if (result.requires2FA) {
      return NextResponse.json({
        requires2FA: true,
        userId: result.userId,
        message: 'Two-factor authentication code required',
      });
    }

    // Create response with user data
    const response = NextResponse.json({ user: result.user });

    // Set HTTP-only cookie using NextResponse
    response.cookies.set('auth-token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Login failed' } },
      { status: 401 }
    );
  }
}


