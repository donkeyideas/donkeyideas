import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { fetchRealAnalytics } from '@/lib/google-analytics';

// Deep Seek pricing
const PRICING = {
  'deepseek-chat': {
    input: 0.14, // $0.14 per 1M tokens
    output: 0.28, // $0.28 per 1M tokens
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

    const { searchParams: cacheParams } = new URL(request.url);
    const forceRegenerate = cacheParams.get('force') === 'true';

    if (!forceRegenerate) {
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

    // Fetch current analytics data from real GA4
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';

    let analyticsData;
    try {
      analyticsData = await fetchRealAnalytics(gaPropertyId, dateRange);
    } catch (gaError: any) {
      console.error('Failed to fetch GA data for recommendations:', gaError);
      return NextResponse.json({
        error: { message: 'Failed to fetch Google Analytics data. Please check your GA configuration.' },
      }, { status: 500 });
    }

    // Check if there's enough data to analyze
    const { totalUsers, sessions } = analyticsData.overview;
    if (totalUsers === 0 && sessions === 0) {
      return NextResponse.json({
        recommendation: {
          id: 'no-data',
          date: today,
          summary: 'Not enough analytics data to generate recommendations. Your Google Analytics property has no recorded traffic for this period. Make sure your GA tracking code is properly installed on your website.',
          pros: [],
          cons: [{ title: 'No Traffic Data', description: 'Your Google Analytics property is not recording any visitors. Verify that the GA4 tracking code is installed correctly on all pages of your website.' }],
          recommendations: [
            { title: 'Verify GA4 Installation', description: 'Check that your Google Analytics 4 measurement ID is correctly added to your website. Use the Google Tag Assistant browser extension to verify.', priority: 'high' },
            { title: 'Check Property ID', description: 'Ensure the GA4 Property ID in your Business Profile matches the one in your Google Analytics account.', priority: 'high' },
            { title: 'Wait for Data Collection', description: 'If you recently installed GA4, it may take 24-48 hours for data to start appearing.', priority: 'medium' },
          ],
          createdAt: new Date(),
        },
        cached: false,
        noData: true,
      });
    }

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

