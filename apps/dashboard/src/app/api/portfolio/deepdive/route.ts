import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken, getTokenFromRequest } from '@/lib/auth';
import { contextFor, PRODUCTS } from '@/lib/portfolio/config';
import { deepDive } from '@/lib/portfolio/deepdive';
import { fetchGa4Hostname } from '@/lib/google-analytics';

export const maxDuration = 60;

// POST /api/portfolio/deepdive  body: { key, displayName? }
// Fetches the product's website and runs a growth/SEO/conversion audit.
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = getTokenFromRequest(request, cookieStore.get('auth-token')?.value);
    if (!token) return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    const user = await getUserByToken(token);
    if (!user) return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const key = String(body?.key || '');
    const ctx = contextFor(key);
    if (!ctx) return NextResponse.json({ error: { message: `Unknown product: ${key}` } }, { status: 400 });

    // Resolve the domain: config first, else auto-discover from GA4's hostName.
    let domain = ctx.domain || null;
    if (!domain) {
      const pcfg = PRODUCTS.find((p) => p.key === key);
      if (pcfg) {
        const company = await prisma.company.findFirst({
          where: { userId: user.id, name: { contains: pcfg.companyNameMatch, mode: 'insensitive' } },
          include: { businessProfile: true },
        }).catch(() => null);
        const pid = company?.businessProfile?.gaPropertyId;
        if (pid) {
          const host = await fetchGa4Hostname(pid);
          if (host) domain = host.startsWith('http') ? host : `https://${host}`;
        }
      }
    }
    if (!domain) {
      return NextResponse.json({ error: { message: 'No website found for this product (no domain configured and no GA4 hostname).' } }, { status: 400 });
    }

    const settings = await prisma.userSettings.findUnique({ where: { userId: user.id }, select: { deepSeekApiKey: true } }).catch(() => null);
    const apiKey = settings?.deepSeekApiKey || process.env.DEEPSEEK_API_KEY || '';
    if (!apiKey) return NextResponse.json({ error: { message: 'DeepSeek API key not configured.' } }, { status: 400 });

    const result = await deepDive(domain, body?.displayName || key, ctx.thesis, apiKey);

    if (result.tokensUsed > 0) {
      await prisma.apiUsage.create({
        data: { userId: user.id, provider: 'deepseek', endpoint: 'portfolio-deepdive', model: 'deepseek-chat', totalTokens: result.tokensUsed, cost: result.cost, statusCode: 200 },
      }).catch(() => {});
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Deep dive failed:', error);
    return NextResponse.json({ error: { message: error?.message || 'Deep dive failed' } }, { status: 500 });
  }
}
