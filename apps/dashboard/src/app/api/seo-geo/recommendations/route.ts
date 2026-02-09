import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const PRICING = {
  'deepseek-chat': {
    input: 0.14, // $0.14 per 1M tokens
    output: 0.28, // $0.28 per 1M tokens
  },
};

function calculateCost(promptTokens: number, completionTokens: number): number {
  const pricing = PRICING['deepseek-chat'];
  return (promptTokens / 1_000_000) * pricing.input + (completionTokens / 1_000_000) * pricing.output;
}

function buildSeoGeoPrompt(data: any) {
  const { searchConsole, pageSpeed, seoAudit, geoAudit } = data;

  let prompt = `You are an expert in SEO (Search Engine Optimization) and GEO (Generative Engine Optimization). Analyze the following data for donkeyideas.com and provide actionable insights.\n\n`;

  if (searchConsole?.data) {
    const { overview, topKeywords, topPages } = searchConsole.data;
    prompt += `## SEARCH CONSOLE DATA\n`;
    prompt += `- Total Clicks: ${overview.totalClicks}\n`;
    prompt += `- Total Impressions: ${overview.totalImpressions}\n`;
    prompt += `- Average CTR: ${overview.avgCtr}%\n`;
    prompt += `- Average Position: ${overview.avgPosition}\n\n`;
    prompt += `### Top Keywords\n`;
    for (const kw of (topKeywords || []).slice(0, 10)) {
      prompt += `- "${kw.keyword}": ${kw.clicks} clicks, ${kw.impressions} impressions, position ${kw.position}\n`;
    }
    prompt += `\n### Top Pages\n`;
    for (const page of (topPages || []).slice(0, 10)) {
      prompt += `- ${page.page}: ${page.clicks} clicks, position ${page.position}\n`;
    }
    prompt += '\n';
  } else {
    prompt += `## SEARCH CONSOLE: ${searchConsole?.error || 'Not connected'}\n\n`;
  }

  if (pageSpeed?.mobile) {
    const { coreWebVitals, lighthouseScores } = pageSpeed.mobile;
    prompt += `## CORE WEB VITALS (Mobile)\n`;
    prompt += `- LCP: ${coreWebVitals.lcp}ms\n`;
    prompt += `- FID: ${coreWebVitals.fid}ms\n`;
    prompt += `- CLS: ${coreWebVitals.cls}\n`;
    prompt += `- Performance Score: ${lighthouseScores.performanceScore}/100\n`;
    prompt += `- SEO Score: ${lighthouseScores.seoScore}/100\n`;
    prompt += `- Accessibility Score: ${lighthouseScores.accessibilityScore}/100\n\n`;
  }

  if (seoAudit) {
    prompt += `## ON-PAGE SEO AUDIT\n`;
    prompt += `- Overall Score: ${seoAudit.overallScore}/100\n`;
    prompt += `- Errors: ${seoAudit.totalIssues?.errors || 0}\n`;
    prompt += `- Warnings: ${seoAudit.totalIssues?.warnings || 0}\n`;
    if (seoAudit.commonIssues?.length > 0) {
      prompt += `- Common Issues: ${seoAudit.commonIssues.join(', ')}\n`;
    }
    prompt += '\n';
  }

  if (geoAudit) {
    prompt += `## GEO READINESS\n`;
    prompt += `- Overall GEO Score: ${geoAudit.overallScore}/100\n`;
    prompt += `- Structured Data Score: ${geoAudit.structuredData?.score || 0}/100\n`;
    prompt += `- LLM Accessibility Score: ${geoAudit.llmAccessibility?.score || 0}/100\n`;
    prompt += `- Content Quality Score: ${geoAudit.contentQuality?.score || 0}/100\n`;
    prompt += `- Technical Signals Score: ${geoAudit.technicalSignals?.score || 0}/100\n\n`;
  }

  prompt += `## YOUR TASK

Provide a JSON response with the following structure:
{
  "overallGrade": "A+/A/B+/B/C+/C/D/F",
  "summary": "2-3 sentence summary of overall SEO and GEO performance",
  "seoInsights": [
    {"title": "Short title", "description": "Detailed insight", "priority": "high|medium|low", "category": "rankings|content|technical|backlinks"}
  ],
  "geoInsights": [
    {"title": "Short title", "description": "Detailed insight about AI engine optimization", "priority": "high|medium|low", "category": "structured-data|llm-access|content-quality|technical"}
  ],
  "actionItems": [
    {"title": "Action item", "description": "How to implement", "priority": "high|medium|low", "effort": "easy|medium|hard", "impact": "high|medium|low"}
  ]
}

Rules:
- Provide 3-5 SEO insights
- Provide 3-5 GEO insights
- Provide 5-8 actionable items sorted by priority
- Be specific and reference actual data
- For GEO, focus on how to make content more discoverable by AI engines (ChatGPT, Claude, Perplexity, Google AI Overviews)
- Respond ONLY with valid JSON, no markdown code blocks.`;

  return prompt;
}

function parseAIResponse(content: string): any {
  try {
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    return JSON.parse(cleaned.trim());
  } catch {
    return {
      overallGrade: 'N/A',
      summary: 'Unable to parse AI response. Please try regenerating.',
      seoInsights: [],
      geoInsights: [],
      actionItems: [],
    };
  }
}

// GET /api/seo-geo/recommendations
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check cache
    if (!force) {
      try {
        const cached = await prisma.seoGeoRecommendation.findUnique({ where: { date: today } });
        if (cached) {
          const age = Date.now() - new Date(cached.createdAt).getTime();
          if (age < 24 * 60 * 60 * 1000) {
            return NextResponse.json({
              recommendation: {
                id: cached.id,
                date: cached.date,
                summary: cached.summary,
                overallGrade: cached.overallGrade,
                seoInsights: cached.seoInsights,
                geoInsights: cached.geoInsights,
                actionItems: cached.actionItems,
                createdAt: cached.createdAt,
              },
              cached: true,
            });
          }
        }
      } catch { /* table might not exist */ }
    }

    // Get user's DeepSeek API key
    let userSettings = null;
    try {
      userSettings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: { deepSeekApiKey: true },
      });
    } catch { /* ignore */ }

    if (!userSettings?.deepSeekApiKey) {
      return NextResponse.json({
        error: { message: 'DeepSeek API key not configured. Please add it in Settings.' },
      }, { status: 400 });
    }

    // Fetch current snapshot data for context
    let snapshotData: any = {};
    try {
      const snapshot = await prisma.seoGeoSnapshot.findUnique({ where: { date: today } });
      if (snapshot) {
        snapshotData = {
          searchConsole: {
            data: snapshot.totalClicks !== null ? {
              overview: {
                totalClicks: snapshot.totalClicks,
                totalImpressions: snapshot.totalImpressions,
                avgCtr: Number(snapshot.avgCtr),
                avgPosition: Number(snapshot.avgPosition),
              },
              topKeywords: [],
              topPages: [],
            } : null,
          },
          pageSpeed: snapshot.performanceScore !== null ? {
            mobile: {
              coreWebVitals: {
                lcp: Number(snapshot.lcp),
                fid: Number(snapshot.fid),
                cls: Number(snapshot.cls),
                fcp: Number(snapshot.fcp),
                ttfb: Number(snapshot.ttfb),
              },
              lighthouseScores: {
                performanceScore: snapshot.performanceScore,
                seoScore: snapshot.seoScore,
                accessibilityScore: snapshot.accessibilityScore,
              },
            },
          } : null,
          seoAudit: snapshot.seoAuditScore !== null ? {
            overallScore: snapshot.seoAuditScore,
            totalIssues: { errors: 0, warnings: 0 },
            commonIssues: [],
          } : null,
          geoAudit: snapshot.geoOverallScore !== null ? {
            overallScore: snapshot.geoOverallScore,
            structuredData: { score: snapshot.structuredDataScore },
            llmAccessibility: { score: snapshot.llmAccessScore },
            contentQuality: { score: snapshot.contentQualityScore },
            technicalSignals: { score: 0 },
          } : null,
        };
      }

      // Also fetch top keywords for context
      const keywords = await prisma.keywordTracking.findMany({
        where: { date: today },
        orderBy: { clicks: 'desc' },
        take: 10,
      });
      if (keywords.length > 0 && snapshotData.searchConsole?.data) {
        snapshotData.searchConsole.data.topKeywords = keywords.map((k: any) => ({
          keyword: k.keyword,
          clicks: k.clicks,
          impressions: k.impressions,
          position: Number(k.position),
        }));
      }
    } catch { /* ignore */ }

    // Build prompt and call DeepSeek
    const prompt = buildSeoGeoPrompt(snapshotData);

    const deepSeekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userSettings.deepSeekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an expert in SEO and Generative Engine Optimization. Always respond with valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
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

    // Save recommendation
    let saved = null;
    try {
      saved = await prisma.seoGeoRecommendation.upsert({
        where: { date: today },
        update: {
          snapshotData: snapshotData,
          summary: parsed.summary || '',
          overallGrade: parsed.overallGrade || 'N/A',
          seoInsights: parsed.seoInsights || [],
          geoInsights: parsed.geoInsights || [],
          actionItems: parsed.actionItems || [],
          tokensUsed: totalTokens,
          cost,
          model: 'deepseek-chat',
        },
        create: {
          date: today,
          snapshotData: snapshotData,
          summary: parsed.summary || '',
          overallGrade: parsed.overallGrade || 'N/A',
          seoInsights: parsed.seoInsights || [],
          geoInsights: parsed.geoInsights || [],
          actionItems: parsed.actionItems || [],
          tokensUsed: totalTokens,
          cost,
          model: 'deepseek-chat',
        },
      });
    } catch (e) {
      console.error('Failed to save recommendation:', e);
    }

    // Log API usage
    try {
      await prisma.apiUsage.create({
        data: {
          userId: user.id,
          provider: 'deepseek',
          endpoint: 'seo-geo-recommendations',
          model: 'deepseek-chat',
          promptTokens,
          completionTokens,
          totalTokens,
          cost,
          statusCode: deepSeekResponse.status,
        },
      });
    } catch { /* ignore */ }

    return NextResponse.json({
      recommendation: {
        id: saved?.id || 'temp',
        date: today,
        summary: parsed.summary || '',
        overallGrade: parsed.overallGrade || 'N/A',
        seoInsights: parsed.seoInsights || [],
        geoInsights: parsed.geoInsights || [],
        actionItems: parsed.actionItems || [],
        createdAt: saved?.createdAt || new Date(),
      },
      cached: false,
      tokensUsed: totalTokens,
      cost,
    });
  } catch (error: any) {
    console.error('SEO-GEO recommendations error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to get recommendations' } },
      { status: 500 }
    );
  }
}

// POST /api/seo-geo/recommendations - Force regenerate
export async function POST(request: NextRequest) {
  const newUrl = new URL(request.url);
  newUrl.searchParams.set('force', 'true');
  const getRequest = new NextRequest(newUrl, { method: 'GET', headers: request.headers });
  return GET(getRequest);
}
