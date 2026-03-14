import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

export const maxDuration = 60;

const PRICING = {
  'deepseek-chat': {
    input: 0.14,
    output: 0.28,
  },
};

const CHAR_LIMITS: Record<string, number> = {
  TWITTER: 280,
  TIKTOK: 300,
  FACEBOOK: 2000,
  INSTAGRAM: 2200,
  LINKEDIN: 3000,
};

const MAX_TOKENS: Record<string, number> = {
  TWITTER: 150,
  TIKTOK: 150,
  FACEBOOK: 600,
  INSTAGRAM: 600,
  LINKEDIN: 600,
};

function calculateCost(promptTokens: number, completionTokens: number): number {
  const pricing = PRICING['deepseek-chat'];
  return (promptTokens / 1_000_000) * pricing.input + (completionTokens / 1_000_000) * pricing.output;
}

const generateSchema = z.object({
  topic: z.string().optional().default(''),
  tone: z.enum(['informative', 'engaging', 'promotional', 'controversial']).default('engaging'),
  platforms: z.array(z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK'])).min(1),
});

function buildPrompt(platform: string, tone: string, charLimit: number): string {
  return `You are a professional social media content creator for Donkey Ideas, a creative consulting and venture building studio. Website: https://www.donkeyideas.com

Generate a ${platform.toLowerCase()} post with a ${tone} tone.

RULES:
1. Output ONLY valid JSON. No text before or after.
2. Stay within ${charLimit} characters for the main content.
3. Write compelling, platform-appropriate content.
4. Include relevant hashtags (3-5 for Twitter/TikTok, 5-10 for others).
5. Include a suggested image prompt for AI image generation.
6. Do NOT use markdown. Plain text only.
7. For ${platform === 'LINKEDIN' ? 'LinkedIn: Use professional language, may include line breaks for readability.' : platform === 'TWITTER' ? 'Twitter: Be concise and punchy. Use thread hooks if needed.' : platform === 'FACEBOOK' ? 'Facebook: Conversational and engaging. Can be slightly longer.' : platform === 'INSTAGRAM' ? 'Instagram: Visual-focused caption. Use emojis strategically.' : 'TikTok: Casual, trendy, use Gen-Z language if appropriate.'}

Return this exact JSON:
{
  "content": "The post content here (max ${charLimit} chars)",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "imagePrompt": "A descriptive prompt for generating a matching image"
}`;
}

// POST /api/social-posts/generate - AI-generate posts for multiple platforms
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });
    const apiKey = settings?.deepSeekApiKey;
    if (!apiKey) {
      return NextResponse.json(
        { error: { message: 'DeepSeek API key not configured. Please add it in Settings.' } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { topic, tone, platforms } = generateSchema.parse(body);

    // Generate posts in parallel for each platform
    const results = await Promise.allSettled(
      platforms.map(async (platform) => {
        const charLimit = CHAR_LIMITS[platform];
        const maxTokens = MAX_TOKENS[platform];
        const systemPrompt = buildPrompt(platform, tone, charLimit);

        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: topic.trim()
                ? `Write a social media post about: ${topic.trim()}`
                : 'Write an engaging social media post about creative consulting, venture building, or business innovation' },
            ],
            temperature: 0.8,
            max_tokens: maxTokens,
          }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`DeepSeek API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || '';
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const totalTokens = data.usage?.total_tokens || 0;
        const cost = calculateCost(promptTokens, completionTokens);

        // Track usage
        try {
          await prisma.apiUsage.create({
            data: {
              userId: user.id,
              provider: 'deepseek',
              endpoint: 'social-post-generate',
              model: 'deepseek-chat',
              promptTokens,
              completionTokens,
              totalTokens,
              cost,
              metadata: { topic: topic.trim(), platform, tone },
            },
          });
        } catch (e) {
          console.error('Failed to log API usage:', e);
        }

        // Parse JSON response
        let parsed;
        try {
          let jsonStr = rawContent.trim();
          const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) jsonStr = jsonMatch[1].trim();
          if (!jsonStr.startsWith('{')) {
            const objMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (objMatch) jsonStr = objMatch[0];
          }
          parsed = JSON.parse(jsonStr);
        } catch {
          throw new Error('Failed to parse AI response');
        }

        return {
          platform,
          content: parsed.content || '',
          hashtags: parsed.hashtags || [],
          imagePrompt: parsed.imagePrompt || '',
          usage: { promptTokens, completionTokens, totalTokens, cost },
        };
      })
    );

    const posts: any[] = [];
    const errors: any[] = [];

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        posts.push(result.value);
      } else {
        errors.push({ platform: platforms[i], error: result.reason?.message || 'Generation failed' });
      }
    });

    return NextResponse.json({ posts, errors });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: 'Validation error', details: error.errors } }, { status: 400 });
    }
    console.error('Social post generate error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to generate posts' } }, { status: 500 });
  }
}
