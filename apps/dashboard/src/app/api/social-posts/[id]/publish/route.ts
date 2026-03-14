import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { TwitterApi } from 'twitter-api-v2';

// POST /api/social-posts/[id]/publish - Publish a post to its platform
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const { id } = await params;
    const post = await prisma.socialMediaPost.findUnique({ where: { id } });
    if (!post || post.userId !== user.id) {
      return NextResponse.json({ error: { message: 'Post not found' } }, { status: 404 });
    }
    if (post.status === 'PUBLISHED') {
      return NextResponse.json({ error: { message: 'Post is already published' } }, { status: 400 });
    }

    const credential = await prisma.socialMediaCredential.findUnique({
      where: { userId_platform: { userId: user.id, platform: post.platform } },
    });
    if (!credential || !credential.isConnected) {
      return NextResponse.json(
        { error: { message: `No connected ${post.platform} credentials. Configure in the Connections tab.` } },
        { status: 400 }
      );
    }

    // Append hashtags to content
    let fullContent = post.content;
    if (post.hashtags.length > 0) {
      const uniqueTags = [...new Set(post.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)))];
      fullContent = `${post.content}\n\n${uniqueTags.join(' ')}`;
    }

    let platformPostId: string | null = null;

    try {
      if (post.platform === 'TWITTER') {
        // Truncate to 280 chars
        const tweetContent = fullContent.substring(0, 280);
        const client = new TwitterApi({
          appKey: credential.appKey!,
          appSecret: credential.appSecret!,
          accessToken: credential.accessToken!,
          accessSecret: credential.tokenSecret!,
        });
        const tweet = await client.v2.tweet(tweetContent);
        platformPostId = tweet.data.id;
      } else if (post.platform === 'LINKEDIN') {
        const personUrn = credential.personUrn;
        if (!personUrn) throw new Error('LinkedIn Person URN not configured');

        const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${credential.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author: personUrn.startsWith('urn:') ? personUrn : `urn:li:person:${personUrn}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: fullContent.substring(0, 3000) },
                shareMediaCategory: 'NONE',
              },
            },
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
          }),
        });
        if (!res.ok) {
          const err = await res.text().catch(() => '');
          throw new Error(`LinkedIn API error (${res.status}): ${err}`);
        }
        const data = await res.json();
        platformPostId = data.id || null;
      } else if (post.platform === 'FACEBOOK') {
        const pageId = credential.pageId;
        if (!pageId) throw new Error('Facebook Page ID not configured');

        const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: fullContent.substring(0, 2000),
            access_token: credential.accessToken,
          }),
        });
        if (!res.ok) {
          const err = await res.text().catch(() => '');
          throw new Error(`Facebook API error (${res.status}): ${err}`);
        }
        const data = await res.json();
        platformPostId = data.id || null;
      } else if (post.platform === 'INSTAGRAM') {
        throw new Error('Instagram text-only posting is not supported via API');
      } else if (post.platform === 'TIKTOK') {
        throw new Error('TikTok integration is coming soon');
      }

      // Mark as published
      const updated = await prisma.socialMediaPost.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          platformPostId,
          publishError: null,
        },
      });

      return NextResponse.json({ post: updated });
    } catch (publishError: any) {
      // Mark as failed
      await prisma.socialMediaPost.update({
        where: { id },
        data: {
          status: 'FAILED',
          publishError: publishError.message || 'Publishing failed',
        },
      });

      return NextResponse.json(
        { error: { message: publishError.message || 'Publishing failed' } },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error('Social post publish error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to publish post' } }, { status: 500 });
  }
}
