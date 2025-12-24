import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (token) {
      await logoutUser(token);
    }
    
    // Clear cookie
    cookieStore.delete('auth-token');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message || 'Logout failed' } },
      { status: 500 }
    );
  }
}


