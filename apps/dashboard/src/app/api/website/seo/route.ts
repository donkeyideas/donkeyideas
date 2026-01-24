import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// GET /api/website/seo - Get SEO settings
export async function GET() {
  try {
    const seoSettings = await prisma.websiteContent.findFirst({
      where: { section: 'seo-settings' },
    });

    if (!seoSettings) {
      // Return default SEO settings
      return NextResponse.json({
        seo: {
          title: 'Donkey Ideas — Transform Your Vision Into Reality',
          description: 'Build and scale your ventures with Donkey Ideas. Comprehensive tools for financial management, project tracking, pitch decks, and strategic planning.',
          keywords: 'venture builder, startup platform, financial management, pitch deck builder, business planning',
          ogImage: '/og-image.png',
        },
        domain: {
          customDomain: '',
          sslEnabled: true,
        },
        analytics: {
          googleAnalyticsId: '',
          googleTagManagerId: '',
        },
      });
    }

    return NextResponse.json(seoSettings.content);
  } catch (error) {
    console.error('Failed to fetch SEO settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEO settings' },
      { status: 500 }
    );
  }
}

// POST /api/website/seo - Update SEO settings
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();

    // Upsert SEO settings
    await prisma.websiteContent.upsert({
      where: { section: 'seo-settings' },
      update: {
        content: body,
        updatedAt: new Date(),
      },
      create: {
        section: 'seo-settings',
        content: body,
        published: true,
      },
    });

    // Revalidate all pages to apply new SEO settings
    revalidatePath('/');
    revalidatePath('/ventures');
    revalidatePath('/services');
    revalidatePath('/process');
    revalidatePath('/about');
    revalidatePath('/privacy');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save SEO settings:', error);
    return NextResponse.json(
      { error: 'Failed to save SEO settings' },
      { status: 500 }
    );
  }
}
