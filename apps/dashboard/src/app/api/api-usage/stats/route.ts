import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Deep Seek pricing
const PRICING = {
  deepseek: {
    'deepseek-chat': {
      input: 0.00014, // $0.14 per 1M tokens
      output: 0.00028, // $0.28 per 1M tokens
    },
  },
  openai: {
    'gpt-4': {
      input: 0.03,
      output: 0.06,
    },
    'gpt-3.5-turbo': {
      input: 0.0005,
      output: 0.0015,
    },
  },
  anthropic: {
    'claude-3-opus': {
      input: 0.015,
      output: 0.075,
    },
    'claude-3-sonnet': {
      input: 0.003,
      output: 0.015,
    },
  },
};

function calculateCost(
  provider: string,
  model: string | null,
  promptTokens: number,
  completionTokens: number
): number {
  if (!model) return 0;

  const providerPricing = PRICING[provider as keyof typeof PRICING];
  if (!providerPricing) return 0;

  const modelPricing = providerPricing[model as keyof typeof providerPricing] as { input: number; output: number } | undefined;
  if (!modelPricing || typeof modelPricing !== 'object' || !('input' in modelPricing) || !('output' in modelPricing)) return 0;

  const inputCost = (promptTokens / 1_000_000) * modelPricing.input;
  const outputCost = (completionTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

// GET /api/api-usage/stats - Get API usage statistics
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    let startDate = new Date();
    switch (range) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get usage data
    let usage: any[] = [];
    try {
      // Check if apiUsage model exists in Prisma client
      if (!prisma.apiUsage) {
        // If model doesn't exist, return empty stats
        console.warn('ApiUsage model not found in Prisma client. Please regenerate: npx prisma generate');
        return NextResponse.json({
          totalCalls: 0,
          totalCost: 0,
          totalTokens: 0,
          byProvider: [],
          recentCalls: [],
          dailyStats: [],
        });
      }

      usage = await prisma.apiUsage.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (dbError: any) {
      // If table doesn't exist, return empty stats
      if (dbError.code === 'P2021' || dbError.code === 'P2001' || dbError.message?.includes('does not exist') || dbError.message?.includes('relation') || dbError.message?.includes('Unknown arg')) {
        console.warn('api_usage table does not exist yet or Prisma client needs regeneration.');
        return NextResponse.json({
          totalCalls: 0,
          totalCost: 0,
          totalTokens: 0,
          byProvider: [],
          recentCalls: [],
          dailyStats: [],
        });
      }
      console.error('Database error:', dbError);
      throw dbError;
    }

    // Calculate totals
    const totalCalls = usage.length;
    const totalCost = usage.reduce((sum, u) => sum + Number(u.cost), 0);
    const totalTokens = usage.reduce((sum, u) => sum + (u.totalTokens || 0), 0);

    // Group by provider
    const byProviderMap = new Map<string, { calls: number; cost: number; tokens: number }>();
    usage.forEach((u) => {
      const existing = byProviderMap.get(u.provider) || { calls: 0, cost: 0, tokens: 0 };
      byProviderMap.set(u.provider, {
        calls: existing.calls + 1,
        cost: existing.cost + Number(u.cost),
        tokens: existing.tokens + (u.totalTokens || 0),
      });
    });

    const byProvider = Array.from(byProviderMap.entries()).map(([provider, data]) => ({
      provider,
      ...data,
    }));

    // Get recent calls (last 50)
    const recentCalls = usage.slice(0, 50).map((u) => ({
      id: u.id,
      provider: u.provider,
      model: u.model || 'N/A',
      promptTokens: u.promptTokens || 0,
      completionTokens: u.completionTokens || 0,
      totalTokens: u.totalTokens || 0,
      cost: Number(u.cost),
      createdAt: u.createdAt.toISOString(),
    }));

    // Daily stats
    const dailyMap = new Map<string, { calls: number; cost: number; tokens: number }>();
    usage.forEach((u) => {
      const date = u.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { calls: 0, cost: 0, tokens: 0 };
      dailyMap.set(date, {
        calls: existing.calls + 1,
        cost: existing.cost + Number(u.cost),
        tokens: existing.tokens + (u.totalTokens || 0),
      });
    });

    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totalCalls,
      totalCost,
      totalTokens,
      byProvider,
      recentCalls,
      dailyStats,
    });
  } catch (error: any) {
    console.error('Failed to get API usage stats:', error);
    return NextResponse.json(
      { error: { message: 'Failed to retrieve API usage statistics' } },
      { status: 500 }
    );
  }
}

// Note: calculateCost and PRICING are not exported as Next.js route files
// should only export HTTP method handlers. If needed elsewhere, move to a utility file.

