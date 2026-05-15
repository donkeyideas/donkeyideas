import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: { message: 'Email and password required' } },
        { status: 400 },
      );
    }

    const result = await loginUser({ email, password });

    if (!result || !result.token) {
      return NextResponse.json(
        { error: { message: 'Invalid credentials' } },
        { status: 401 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set('auth-token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.json({ user: result.user });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Login failed' } },
      { status: 500 },
    );
  }
}
