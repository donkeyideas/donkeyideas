import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// Deep Seek pricing
const PRICING = {
  'deepseek-chat': {
    input: 0.00014, // $0.14 per 1M tokens
    output: 0.00028, // $0.28 per 1M tokens
  },
};

function calculateCost(promptTokens: number, completionTokens: number): number {
  const pricing = PRICING['deepseek-chat'];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

// Build prompt for analytics analysis
function buildAnalyticsPrompt(analyticsData: any, companyName: string) {
  const { overview, trafficSources, topPages, devices } = analyticsData;

  return `You are an expert digital marketing analyst. Analyze the following Google Analytics data for "${companyName}" and provide actionable insights.

## ANALYTICS DATA

### Overview Metrics
- Total Users: ${overview.totalUsers.toLocaleString()}
- New Users: ${overview.newUsers?.toLocaleString() || 'N/A'}
- Sessions: ${overview.sessions.toLocaleString()}
- Pageviews: ${overview.pageviews.toLocaleString()}
- Avg. Session Duration: ${Math.floor(overview.avgSessionDuration / 60)}m ${overview.avgSessionDuration % 60}s
- Bounce Rate: ${overview.bounceRate}%
- Engagement Rate: ${overview.engagementRate}%

### Traffic Sources
${trafficSources.map((s: any) => `- ${s.source}: ${s.sessions} sessions (${s.percentage}%)`).join('\n')}

### Top Pages
${topPages.map((p: any) => `- ${p.title} (${p.page}): ${p.pageviews} views, ${p.avgTimeOnPage}s avg time`).join('\n')}

### Devices
${devices.map((d: any) => `- ${d.device}: ${d.percentage}%`).join('\n')}

## YOUR TASK

Provide a JSON response with the following structure:
{
  "summary": "A 2-3 sentence summary of overall website performance",
  "pros": [
    {"title": "Short title", "description": "Detailed explanation of this strength"}
  ],
  "cons": [
    {"title": "Short title", "description": "Detailed explanation of this weakness"}
  ],
  "recommendations": [
    {"title": "Action item", "description": "How to implement this", "priority": "high|medium|low"}
  ]
}

Rules:
- Provide 3-5 pros (things going well)
- Provide 2-4 cons (areas for improvement)
- Provide 3-5 recommendations (actionable steps)
- Recommendations should have priority based on potential impact
- Be specific and actionable, not generic
- Reference actual numbers from the data

Respond ONLY with valid JSON, no markdown code blocks.`;
}

// Parse AI response safely
function parseAIResponse(content: string): any {
  try {
    // Remove potential markdown code blocks
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse AI response:', e);
    return {
      summary: 'Unable to parse AI response. Please try regenerating.',
      pros: [],
      cons: [],
      recommendations: [],
    };
  }
}

// GET /api/companies/:id/analytics/recommendations
// Returns cached recommendations or generates new ones if stale
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id: companyId } = await params;

    // Verify company ownership
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
        userId: user.id,
      },
      include: {
        businessProfile: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: { message: 'Company not found' } },
        { status: 404 }
      );
    }

    // Check for existing recommendation from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let recommendation = null;
    try {
      recommendation = await prisma.analyticsRecommendation.findFirst({
        where: {
          companyId,
          date: today,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbError: any) {
      // Table might not exist yet
      if (dbError.code !== 'P2021' && !dbError.message?.includes('does not exist')) {
        throw dbError;
      }
    }

    // Check if recommendation is fresh (< 24 hours old)
    if (recommendation) {
      const age = Date.now() - new Date(recommendation.createdAt).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (age < maxAge) {
        return NextResponse.json({
          recommendation: {
            id: recommendation.id,
            date: recommendation.date,
            summary: recommendation.summary,
            pros: recommendation.pros,
            cons: recommendation.cons,
            recommendations: recommendation.recommendations,
            createdAt: recommendation.createdAt,
          },
          cached: true,
        });
      }
    }

    // Need to generate new recommendation
    // First, get the analytics data
    const gaPropertyId = company.businessProfile?.gaPropertyId;
    if (!gaPropertyId) {
      return NextResponse.json({
        error: { message: 'Google Analytics not configured for this company' },
      }, { status: 400 });
    }

    // Get user's DeepSeek API key
    let userSettings = null;
    try {
      userSettings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: { deepSeekApiKey: true },
      });
    } catch (dbError: any) {
      if (dbError.code !== 'P2021' && !dbError.message?.includes('does not exist')) {
        throw dbError;
      }
    }

    if (!userSettings?.deepSeekApiKey) {
      return NextResponse.json({
        error: { message: 'DeepSeek API key not configured. Please add it in Settings.' },
      }, { status: 400 });
    }

    // Fetch current analytics data
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';

    // Generate demo analytics (or fetch real data in production)
    const analyticsData = generateDemoAnalytics(dateRange, company.name);

    // Call DeepSeek API
    const prompt = buildAnalyticsPrompt(analyticsData, company.name);

    const deepSeekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSettings.deepSeekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a digital marketing analytics expert. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!deepSeekResponse.ok) {
      const errorData = await deepSeekResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to get response from DeepSeek API');
    }

    const data = await deepSeekResponse.json();
    const content = data.choices[0]?.message?.content || '';
    const parsed = parseAIResponse(content);

    // Extract token usage
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || promptTokens + completionTokens;
    const cost = calculateCost(promptTokens, completionTokens);

    // Save recommendation to database
    let savedRecommendation = null;
    try {
      savedRecommendation = await prisma.analyticsRecommendation.upsert({
        where: {
          companyId_date: {
            companyId,
            date: today,
          },
        },
        update: {
          analyticsData: analyticsData,
          summary: parsed.summary || '',
          pros: parsed.pros || [],
          cons: parsed.cons || [],
          recommendations: parsed.recommendations || [],
          tokensUsed: totalTokens,
          cost: cost,
          model: 'deepseek-chat',
        },
        create: {
          companyId,
          date: today,
          analyticsData: analyticsData,
          summary: parsed.summary || '',
          pros: parsed.pros || [],
          cons: parsed.cons || [],
          recommendations: parsed.recommendations || [],
          tokensUsed: totalTokens,
          cost: cost,
          model: 'deepseek-chat',
        },
      });
    } catch (dbError: any) {
      console.error('Failed to save recommendation:', dbError);
      // Continue without saving - return the generated data
    }

    // Log API usage
    try {
      await prisma.apiUsage.create({
        data: {
          userId: user.id,
          provider: 'deepseek',
          endpoint: 'analytics-recommendations',
          model: 'deepseek-chat',
          promptTokens,
          completionTokens,
          totalTokens,
          cost,
          statusCode: deepSeekResponse.status,
        },
      });
    } catch (logError) {
      console.error('Failed to log API usage:', logError);
    }

    return NextResponse.json({
      recommendation: {
        id: savedRecommendation?.id || 'temp',
        date: today,
        summary: parsed.summary || '',
        pros: parsed.pros || [],
        cons: parsed.cons || [],
        recommendations: parsed.recommendations || [],
        createdAt: savedRecommendation?.createdAt || new Date(),
      },
      cached: false,
      tokensUsed: totalTokens,
      cost,
    });
  } catch (error: any) {
    console.error('Analytics recommendations error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to get recommendations' } },
      { status: 500 }
    );
  }
}

// POST /api/companies/:id/analytics/recommendations
// Force regenerate recommendations
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Reuse GET logic but always regenerate
  const { searchParams } = new URL(request.url);
  const newUrl = new URL(request.url);
  newUrl.searchParams.set('force', 'true');

  // Create a new request to GET with force flag
  const getRequest = new NextRequest(newUrl, {
    method: 'GET',
    headers: request.headers,
  });

  return GET(getRequest, { params });
}

// Demo analytics generator (same as main analytics route)
function generateDemoAnalytics(dateRange: string, companyName: string) {
  const days = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : 30;
  const seed = companyName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseUsers = (seed % 500) + 100;
  const baseSessions = Math.floor(baseUsers * 1.3);
  const basePageviews = Math.floor(baseSessions * 2.5);

  const sessionsOverTime = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const variance = 0.7 + Math.random() * 0.6;
    sessionsOverTime.push({
      date: date.toISOString().split('T')[0],
      sessions: Math.floor((baseSessions / days) * variance),
      users: Math.floor((baseUsers / days) * variance),
      pageviews: Math.floor((basePageviews / days) * variance),
    });
  }

  return {
    overview: {
      totalUsers: baseUsers,
      newUsers: Math.floor(baseUsers * 0.6),
      returningUsers: Math.floor(baseUsers * 0.4),
      sessions: baseSessions,
      pageviews: basePageviews,
      avgSessionDuration: Math.floor(120 + Math.random() * 180),
      bounceRate: Math.floor(35 + Math.random() * 25),
      engagementRate: Math.floor(40 + Math.random() * 30),
    },
    sessionsOverTime,
    trafficSources: [
      { source: 'Organic Search', sessions: Math.floor(baseSessions * 0.35), percentage: 35 },
      { source: 'Direct', sessions: Math.floor(baseSessions * 0.28), percentage: 28 },
      { source: 'Social', sessions: Math.floor(baseSessions * 0.18), percentage: 18 },
      { source: 'Referral', sessions: Math.floor(baseSessions * 0.12), percentage: 12 },
      { source: 'Email', sessions: Math.floor(baseSessions * 0.07), percentage: 7 },
    ],
    topPages: [
      { page: '/', title: 'Home', pageviews: Math.floor(basePageviews * 0.25), avgTimeOnPage: 45 },
      { page: '/products', title: 'Products', pageviews: Math.floor(basePageviews * 0.18), avgTimeOnPage: 120 },
      { page: '/about', title: 'About Us', pageviews: Math.floor(basePageviews * 0.12), avgTimeOnPage: 90 },
      { page: '/contact', title: 'Contact', pageviews: Math.floor(basePageviews * 0.10), avgTimeOnPage: 60 },
      { page: '/blog', title: 'Blog', pageviews: Math.floor(basePageviews * 0.08), avgTimeOnPage: 180 },
    ],
    devices: [
      { device: 'Desktop', sessions: Math.floor(baseSessions * 0.55), percentage: 55 },
      { device: 'Mobile', sessions: Math.floor(baseSessions * 0.38), percentage: 38 },
      { device: 'Tablet', sessions: Math.floor(baseSessions * 0.07), percentage: 7 },
    ],
    countries: [
      { country: 'United States', sessions: Math.floor(baseSessions * 0.40), percentage: 40 },
      { country: 'United Kingdom', sessions: Math.floor(baseSessions * 0.15), percentage: 15 },
      { country: 'Canada', sessions: Math.floor(baseSessions * 0.10), percentage: 10 },
      { country: 'Germany', sessions: Math.floor(baseSessions * 0.08), percentage: 8 },
      { country: 'Australia', sessions: Math.floor(baseSessions * 0.07), percentage: 7 },
    ],
  };
}
