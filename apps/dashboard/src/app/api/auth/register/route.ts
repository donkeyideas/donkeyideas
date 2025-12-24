import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';
import { registerSchema } from '@donkey-ideas/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await registerUser(body);
    
    return NextResponse.json(
      { user },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message === 'User with this email already exists') {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: { message: error.message || 'Registration failed' } },
      { status: 400 }
    );
  }
}


