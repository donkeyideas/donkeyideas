import { NextRequest, NextResponse } from 'next/server';
import { getUserByToken, setup2FA } from '@/lib/auth';
import { cookies } from 'next/headers';
import QRCode from 'qrcode';

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

    // Generate 2FA secret
    const { secret, otpauthUrl } = await setup2FA(user.id);

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      otpauthUrl,
    });
  } catch (error: any) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to setup 2FA' } },
      { status: 500 }
    );
  }
}
