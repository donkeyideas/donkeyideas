import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { TwitterApi } from 'twitter-api-v2';

const testSchema = z.object({
  platform: z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK']),
});

// POST /api/social-posts/test-connection
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const body = await request.json();
    const { platform } = testSchema.parse(body);

    const credential = await prisma.socialMediaCredential.findUnique({
      where: { userId_platform: { userId: user.id, platform: platform as any } },
    });

    if (!credential) {
      return NextResponse.json({ success: false, error: 'No credentials saved for this platform' });
    }

    let accountInfo: { name?: string; id?: string } = {};

    if (platform === 'TWITTER') {
      if (!credential.appKey || !credential.appSecret || !credential.accessToken || !credential.tokenSecret) {
        return NextResponse.json({ success: false, error: 'Missing Twitter credentials. Need: App Key, App Secret, Access Token, Token Secret.' });
      }
      const client = new TwitterApi({
        appKey: credential.appKey,
        appSecret: credential.appSecret,
        accessToken: credential.accessToken,
        accessSecret: credential.tokenSecret,
      });
      const me = await client.v2.me();
      accountInfo = { name: me.data.name, id: me.data.id };
    } else if (platform === 'LINKEDIN') {
      if (!credential.accessToken) {
        return NextResponse.json({ success: false, error: 'Missing LinkedIn access token.' });
      }
      const res = await fetch('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${credential.accessToken}` },
      });
      if (!res.ok) throw new Error(`LinkedIn API error: ${res.status}`);
      const data = await res.json();
      accountInfo = {
        name: `${data.localizedFirstName || ''} ${data.localizedLastName || ''}`.trim(),
        id: data.id,
      };
    } else if (platform === 'FACEBOOK') {
      if (!credential.accessToken) {
        return NextResponse.json({ success: false, error: 'Missing Facebook page access token.' });
      }
      const pageId = credential.pageId || 'me';
      const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=name,id&access_token=${credential.accessToken}`);
      if (!res.ok) throw new Error(`Facebook API error: ${res.status}`);
      const data = await res.json();
      accountInfo = { name: data.name, id: data.id };
    } else if (platform === 'INSTAGRAM') {
      return NextResponse.json({ success: false, error: 'Instagram text-only posting is not supported via API.' });
    } else if (platform === 'TIKTOK') {
      return NextResponse.json({ success: false, error: 'TikTok integration is coming soon.' });
    }

    // Update credential as connected
    await prisma.socialMediaCredential.update({
      where: { userId_platform: { userId: user.id, platform: platform as any } },
      data: { isConnected: true, lastTestedAt: new Date() },
    });

    return NextResponse.json({ success: true, accountInfo });
  } catch (error: any) {
    // Mark as disconnected on failure
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('auth-token')?.value;
      if (token) {
        const user = await getUserByToken(token);
        const body = await request.clone().json();
        if (user && body.platform) {
          await prisma.socialMediaCredential.update({
            where: { userId_platform: { userId: user.id, platform: body.platform as any } },
            data: { isConnected: false, lastTestedAt: new Date() },
          });
        }
      }
    } catch {}

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: 'Validation error', details: error.errors } }, { status: 400 });
    }
    console.error('Test connection error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Connection test failed' });
  }
}
