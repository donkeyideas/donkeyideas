import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, token } = await loginUser(body);
    
    // Create response with user data
    const response = NextResponse.json({ user });
    
    // Set HTTP-only cookie using NextResponse
    response.cookies.set('auth-token', token, {
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


