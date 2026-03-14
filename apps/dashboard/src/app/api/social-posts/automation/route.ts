import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

const automationSchema = z.object({
  enabled: z.boolean(),
  platforms: z.array(z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK'])),
  cronHour: z.number().min(0).max(23),
  topicPool: z.array(z.string()),
  tone: z.enum(['informative', 'engaging', 'promotional', 'controversial']),
  requireApproval: z.boolean(),
});

// GET /api/social-posts/automation - Get automation config
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const automation = await prisma.socialMediaAutomation.findUnique({
      where: { userId: user.id },
    });

    if (!automation) {
      return NextResponse.json({
        config: {
          enabled: false,
          platforms: [],
          cronHour: 9,
          topicPool: [],
          tone: 'engaging',
          requireApproval: true,
        },
      });
    }

    return NextResponse.json({
      config: {
        enabled: automation.enabled,
        platforms: automation.platforms,
        cronHour: automation.cronHour,
        topicPool: automation.topicPool,
        tone: automation.tone,
        requireApproval: automation.requireApproval,
      },
    });
  } catch (error: any) {
    console.error('Automation get error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to fetch automation config' } }, { status: 500 });
  }
}

// POST /api/social-posts/automation - Save automation config
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });

    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const body = await request.json();
    const data = automationSchema.parse(body);

    const automation = await prisma.socialMediaAutomation.upsert({
      where: { userId: user.id },
      update: {
        enabled: data.enabled,
        platforms: data.platforms,
        cronHour: data.cronHour,
        topicPool: data.topicPool,
        tone: data.tone,
        requireApproval: data.requireApproval,
      },
      create: {
        userId: user.id,
        enabled: data.enabled,
        platforms: data.platforms,
        cronHour: data.cronHour,
        topicPool: data.topicPool,
        tone: data.tone,
        requireApproval: data.requireApproval,
      },
    });

    return NextResponse.json({ success: true, config: automation });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { message: 'Validation error', details: error.errors } }, { status: 400 });
    }
    console.error('Automation save error:', error);
    return NextResponse.json({ error: { message: error.message || 'Failed to save automation config' } }, { status: 500 });
  }
}
