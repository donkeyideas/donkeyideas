import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const platformEnum = z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK']);

const saveCredentialSchema = z.object({
  platform: platformEnum,
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenSecret: z.string().optional(),
  appKey: z.string().optional(),
  appSecret: z.string().optional(),
  pageId: z.string().optional(),
  personUrn: z.string().optional(),
});

function maskToken(token: string | null | undefined): string {
  if (!token) return '';
  if (token.length <= 8) return '****';
  return token.substring(0, 4) + '****' + token.substring(token.length - 4);
}

// GET /api/social-posts/credentials - List all credentials (masked)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const credentials = await prisma.socialMediaCredential.findMany({
      where: { userId: user.id },
    });

    const masked = credentials.map((c) => ({
      platform: c.platform,
      isConnected: c.isConnected,
      lastTestedAt: c.lastTestedAt,
      hasAccessToken: !!c.accessToken,
      hasRefreshToken: !!c.refreshToken,
      hasTokenSecret: !!c.tokenSecret,
      hasAppKey: !!c.appKey,
      hasAppSecret: !!c.appSecret,
      pageId: c.pageId || '',
      personUrn: c.personUrn || '',
      accessTokenMasked: maskToken(c.accessToken),
      appKeyMasked: maskToken(c.appKey),
    }));

    return NextResponse.json({ credentials: masked });
  } catch (error: any) {
    console.error('Credentials list error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to fetch credentials' } }, { status: 500 });
  }
}

// POST /api/social-posts/credentials - Save/update credentials for a platform
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const body = await request.json();
    const data = saveCredentialSchema.parse(body);

    const credential = await prisma.socialMediaCredential.upsert({
      where: {
        userId_platform: { userId: user.id, platform: data.platform as any },
      },
      update: {
        accessToken: data.accessToken ?? undefined,
        refreshToken: data.refreshToken ?? undefined,
        tokenSecret: data.tokenSecret ?? undefined,
        appKey: data.appKey ?? undefined,
        appSecret: data.appSecret ?? undefined,
        pageId: data.pageId ?? undefined,
        personUrn: data.personUrn ?? undefined,
      },
      create: {
        userId: user.id,
        platform: data.platform as any,
        accessToken: data.accessToken || null,
        refreshToken: data.refreshToken || null,
        tokenSecret: data.tokenSecret || null,
        appKey: data.appKey || null,
        appSecret: data.appSecret || null,
        pageId: data.pageId || null,
        personUrn: data.personUrn || null,
      },
    });

    return NextResponse.json({
      success: true,
      platform: credential.platform,
      isConnected: credential.isConnected,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: 'Validation error', details: error.errors } }, { status: 400 });
    }
    console.error('Credentials save error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to save credentials' } }, { status: 500 });
  }
}
