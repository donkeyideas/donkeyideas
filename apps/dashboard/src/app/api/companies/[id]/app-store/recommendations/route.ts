import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { fetchAppStoreData } from '@/lib/app-store-connect';

const PRICING = {
  'deepseek-chat': { input: 0.14, output: 0.28 },
};

function calculateCost(promptTokens: number, completionTokens: number): number {
  const pricing = PRICING['deepseek-chat'];
  return (promptTokens / 1_000_000) * pricing.input + (completionTokens / 1_000_000) * pricing.output;
}

function buildAppStorePrompt(data: any, companyName: string) {
  const { overview, reviews } = data;

  const recentReviews = reviews.slice(0, 10).map((r: any) =>
    `- ${r.starRating}★: "${r.text?.slice(0, 100)}${r.text?.length > 100 ? '...' : ''}" (${r.device || 'unknown territory'})`
  ).join('\n');

  return `You are an expert iOS app quality analyst. Analyze the following App Store Connect data for "${companyName}" and provide actionable insights.

## APP STORE DATA

### Overview Metrics
- Total Installs (period): ${overview.totalInstalls.toLocaleString()}
- Daily Installs: ${overview.dailyInstalls}
- Active Devices: ${overview.activeDevices.toLocaleString()}
- Average Rating: ${overview.averageRating}/5.0
- Total Reviews (recent): ${overview.totalReviews}

### App Store Listing
- Store Page Visitors: ${data.storeListing?.visitors || 0}
- Acquisitions: ${data.storeListing?.acquisitions || 0}
- Conversion Rate: ${data.storeListing?.conversionRate || 0}%

### Recent User Reviews
${recentReviews || 'No recent reviews'}

## YOUR TASK

Provide a JSON response with the following structure:
{
  "summary": "A 2-3 sentence summary of overall app health on the App Store",
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
- Reference actual numbers from the data
- Focus on App Store optimization (ASO), ratings, reviews, conversion
- Be specific and actionable, not generic

Respond ONLY with valid JSON, no markdown code blocks.`;
}

function parseAIResponse(content: string): any {
  try {
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();
    return JSON.parse(cleaned);
  } catch {
    return { summary: 'Unable to parse AI response. Please try regenerating.', pros: [], cons: [], recommendations: [] };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: { message: 'Not authenticated' } }, { status: 401 });
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ error: { message: 'Invalid session' } }, { status: 401 });
    }

    const { id: companyId } = await params;

    const company = await prisma.company.findFirst({
      where: { id: companyId, userId: user.id },
      include: { businessProfile: true },
    });

    if (!company) {
      return NextResponse.json({ error: { message: 'Company not found' } }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { searchParams: cacheParams } = new URL(request.url);
    const forceRegenerate = cacheParams.get('force') === 'true';

    if (!forceRegenerate) {
      let recommendation = null;
      try {
        recommendation = await prisma.appStoreRecommendation.findFirst({
          where: { companyId, date: today },
          orderBy: { createdAt: 'desc' },
        });
      } catch (dbError: any) {
        if (dbError.code !== 'P2021' && !dbError.message?.includes('does not exist')) throw dbError;
      }

      if (recommendation) {
        const age = Date.now() - new Date(recommendation.createdAt).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          return NextResponse.json({
            recommendation: {
              id: recommendation.id, date: recommendation.date,
              summary: recommendation.summary, pros: recommendation.pros,
              cons: recommendation.cons, recommendations: recommendation.recommendations,
              createdAt: recommendation.createdAt,
            },
            cached: true,
          });
        }
      }
    }

    const ascBundleId = company.businessProfile?.ascBundleId;
    if (!ascBundleId) {
      return NextResponse.json({ error: { message: 'App Store Connect not configured for this company' } }, { status: 400 });
    }

    let userSettings = null;
    try {
      userSettings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: { deepSeekApiKey: true },
      });
    } catch (dbError: any) {
      if (dbError.code !== 'P2021' && !dbError.message?.includes('does not exist')) throw dbError;
    }

    if (!userSettings?.deepSeekApiKey) {
      return NextResponse.json({ error: { message: 'DeepSeek API key not configured. Please add it in Settings.' } }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';

    let appData;
    try {
      appData = await fetchAppStoreData(ascBundleId, dateRange);
    } catch (ascError: any) {
      return NextResponse.json({ error: { message: 'Failed to fetch App Store data.' } }, { status: 500 });
    }

    const prompt = buildAppStorePrompt(appData, company.name);

    const deepSeekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSettings.deepSeekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an iOS app quality and App Store optimization expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!deepSeekResponse.ok) {
      const errorData = await deepSeekResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to get response from DeepSeek API');
    }

    const aiData = await deepSeekResponse.json();
    const content = aiData.choices[0]?.message?.content || '';
    const parsed = parseAIResponse(content);

    const usage = aiData.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || promptTokens + completionTokens;
    const cost = calculateCost(promptTokens, completionTokens);

    let savedRecommendation = null;
    try {
      savedRecommendation = await prisma.appStoreRecommendation.upsert({
        where: { companyId_date: { companyId, date: today } },
        update: {
          appStoreData: appData, summary: parsed.summary || '',
          pros: parsed.pros || [], cons: parsed.cons || [],
          recommendations: parsed.recommendations || [],
          tokensUsed: totalTokens, cost, model: 'deepseek-chat',
        },
        create: {
          companyId, date: today, appStoreData: appData,
          summary: parsed.summary || '', pros: parsed.pros || [],
          cons: parsed.cons || [], recommendations: parsed.recommendations || [],
          tokensUsed: totalTokens, cost, model: 'deepseek-chat',
        },
      });
    } catch (dbError: any) {
      console.error('Failed to save app store recommendation:', dbError);
    }

    try {
      await prisma.apiUsage.create({
        data: {
          userId: user.id, provider: 'deepseek', endpoint: 'app-store-recommendations',
          model: 'deepseek-chat', promptTokens, completionTokens, totalTokens,
          cost, statusCode: deepSeekResponse.status,
        },
      });
    } catch (logError) {
      console.error('Failed to log API usage:', logError);
    }

    return NextResponse.json({
      recommendation: {
        id: savedRecommendation?.id || 'temp', date: today,
        summary: parsed.summary || '', pros: parsed.pros || [],
        cons: parsed.cons || [], recommendations: parsed.recommendations || [],
        createdAt: savedRecommendation?.createdAt || new Date(),
      },
      cached: false, tokensUsed: totalTokens, cost,
    });
  } catch (error: any) {
    console.error('App Store recommendations error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to get recommendations' } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const newUrl = new URL(request.url);
  newUrl.searchParams.set('force', 'true');
  const getRequest = new NextRequest(newUrl, { method: 'GET', headers: request.headers });
  return GET(getRequest, { params });
}
