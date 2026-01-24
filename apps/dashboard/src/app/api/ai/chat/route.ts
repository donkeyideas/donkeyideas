import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Helper function to build user context from database
async function buildUserContext(userId: string) {
  try {
    // Fetch user's companies with key metrics
    const companies = await prisma.company.findMany({
      where: { userId },
      include: {
        businessProfile: true,
        budgetPeriods: {
          where: { status: 'ACTIVE' },
          take: 3,
          orderBy: { startDate: 'desc' },
        },
        budgetLines: {
          take: 10,
          orderBy: { date: 'desc' },
        },
        transactions: {
          take: 20,
          orderBy: { date: 'desc' },
        },
        kpis: {
          take: 6,
          orderBy: { period: 'desc' },
        },
        plStatements: {
          take: 6,
          orderBy: { period: 'desc' },
        },
      },
    });

    // Calculate aggregate metrics across all companies
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter(c => c.status === 'active').length;

    // Calculate total budget, spend, and burn rate
    let totalBudgetSpend = 0;
    let totalBudgetIncome = 0;
    const budgetWarnings = [];

    for (const company of companies) {
      const recentLines = company.budgetLines || [];
      const expenses = recentLines
        .filter(l => l.amount < 0)
        .reduce((sum, l) => sum + Number(l.amount), 0);
      const income = recentLines
        .filter(l => l.amount > 0)
        .reduce((sum, l) => sum + Number(l.amount), 0);

      totalBudgetSpend += Math.abs(expenses);
      totalBudgetIncome += income;

      // Detect budget warnings
      if (Math.abs(expenses) > income * 1.5) {
        budgetWarnings.push(`${company.name}: High burn rate detected - spending ${Math.abs(expenses).toFixed(0)} vs income ${income.toFixed(0)}`);
      }
    }

    return {
      user: { id: userId, totalCompanies, activeCompanies },
      companies: companies.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        tagline: c.tagline,
        description: c.description,
        profile: c.businessProfile,
        recentTransactions: c.transactions?.slice(0, 5) || [],
        latestKPIs: c.kpis?.[0] || null,
        latestPL: c.plStatements?.[0] || null,
        activeBudgets: c.budgetPeriods?.length || 0,
      })),
      summary: {
        totalBudgetSpend,
        totalBudgetIncome,
        netCashFlow: totalBudgetIncome - totalBudgetSpend,
        budgetWarnings,
      },
    };
  } catch (error) {
    console.error('Failed to build user context:', error);
    return {
      user: { id: userId, totalCompanies: 0, activeCompanies: 0 },
      companies: [],
      summary: { totalBudgetSpend: 0, totalBudgetIncome: 0, netCashFlow: 0, budgetWarnings: [] },
    };
  }
}

// Helper function to build comprehensive system prompt
function buildSystemPrompt(context: any) {
  const { user, companies, summary } = context;

  let prompt = `You are an intelligent AI assistant for Donkey Ideas, a comprehensive venture builder platform. You have deep knowledge of the system and the user's data.

## YOUR ROLE
You provide smart insights, forecasting, warnings, and actionable suggestions based on the user's actual data. You are an expert in:
- Financial analysis and forecasting
- Budget management and cost optimization
- Business strategy and growth planning
- Project management and execution
- Pitch deck creation and investor relations
- KPI tracking and performance optimization

## SYSTEM CAPABILITIES
Donkey Ideas offers the following features:

### Financial Management
- **P&L Statements**: Track product revenue, service revenue, direct costs, infrastructure costs, sales/marketing, R&D, admin expenses
- **Balance Sheets**: Monitor cash equivalents, accounts receivable/payable, fixed assets, debt
- **Cash Flow**: Analyze operating, investing, and financing cash flows
- **Transactions**: Detailed transaction tracking with categories (revenue, expense, asset, liability, equity)
- **Budget & Forecasting**: Multi-period budgeting with categories, actuals tracking, approval workflows

### Performance Tracking
- **KPIs**: Track MRR, CAC, LTV, churn rate, NPS, active users, growth rate
- **Valuations**: Calculate company valuations using multiple methods (revenue multiple, DCF, market comps)
- **Business Profiles**: Store mission, target market, competitive advantage, key achievements

### Content & Documentation
- **Pitch Decks**: Create investor, sales, and partnership decks with customizable slides
- **Whitepapers**: Comprehensive technical and business documentation
- **Documents**: Version-controlled document management

### Project Management
- **Kanban Boards**: Organize work with boards, columns, and cards
- **Team Management**: Invite team members with role-based permissions
- **Activity Logs**: Track all changes and actions across the platform

### Investor Relations
- **Investor Access**: Grant read-only access to investors
- **Investor Updates**: Send periodic updates with key metrics

## USER'S CURRENT STATE
- **Total Companies**: ${user.totalCompanies}
- **Active Companies**: ${user.activeCompanies}
- **Total Budget Spend**: $${summary.totalBudgetSpend.toFixed(2)}
- **Total Budget Income**: $${summary.totalBudgetIncome.toFixed(2)}
- **Net Cash Flow**: $${summary.netCashFlow.toFixed(2)}
`;

  // Add company-specific context
  if (companies.length > 0) {
    prompt += `\n## USER'S COMPANIES\n`;
    companies.forEach((company: any, idx: number) => {
      prompt += `\n### ${idx + 1}. ${company.name} (${company.status})`;
      if (company.tagline) prompt += `\n- Tagline: ${company.tagline}`;
      if (company.profile?.mission) prompt += `\n- Mission: ${company.profile.mission}`;
      if (company.profile?.targetMarket) prompt += `\n- Target Market: ${company.profile.targetMarket}`;
      if (company.profile?.projectStatus) prompt += `\n- Project Status: ${company.profile.projectStatus}`;

      if (company.latestKPIs) {
        prompt += `\n- Latest KPIs:`;
        if (company.latestKPIs.mrr) prompt += ` MRR: $${company.latestKPIs.mrr}`;
        if (company.latestKPIs.activeUsers) prompt += `, Active Users: ${company.latestKPIs.activeUsers}`;
        if (company.latestKPIs.growthRate) prompt += `, Growth: ${company.latestKPIs.growthRate}%`;
      }

      if (company.latestPL) {
        const totalRevenue = Number(company.latestPL.productRevenue) + Number(company.latestPL.serviceRevenue) + Number(company.latestPL.otherRevenue);
        const totalExpenses = Number(company.latestPL.directCosts) + Number(company.latestPL.infrastructureCosts) + Number(company.latestPL.salesMarketing) + Number(company.latestPL.rdExpenses) + Number(company.latestPL.adminExpenses);
        const netIncome = totalRevenue - totalExpenses;
        prompt += `\n- Latest P&L: Revenue: $${totalRevenue.toFixed(2)}, Expenses: $${totalExpenses.toFixed(2)}, Net: $${netIncome.toFixed(2)}`;
      }

      if (company.activeBudgets > 0) {
        prompt += `\n- Active Budget Periods: ${company.activeBudgets}`;
      }
    });
  }

  // Add warnings if any
  if (summary.budgetWarnings.length > 0) {
    prompt += `\n\n## ⚠️ WARNINGS & ALERTS\n`;
    summary.budgetWarnings.forEach((warning: string) => {
      prompt += `- ${warning}\n`;
    });
  }

  prompt += `\n\n## YOUR INSTRUCTIONS
1. **Be Proactive**: When you notice issues (high burn rate, declining KPIs, cash flow problems), proactively warn the user
2. **Provide Forecasting**: Use historical data to forecast future trends and outcomes
3. **Give Specific Suggestions**: Reference actual numbers and specific actions the user can take
4. **Be Concise**: Keep responses clear and actionable, avoid being overly verbose
5. **Use Context**: Always reference the user's actual data when providing insights
6. **Financial Accuracy**: When discussing finances, be precise with numbers and calculations
7. **Strategic Thinking**: Think like a CFO, strategist, and advisor combined

## EXAMPLE RESPONSES
- "Based on your current burn rate of $X/month, you have approximately Y months of runway. Consider reducing Z costs or increasing revenue through A."
- "I notice [Company Name]'s MRR growth has slowed from X% to Y% over the last 3 months. This could indicate churn issues or market saturation. Have you analyzed your customer retention metrics?"
- "Your Q1 budget shows expenses exceeding income by $X. I recommend focusing on these cost categories: [list top 3 expense categories]"
- "Great news! [Company Name] is showing strong P&L performance with X% margin. To maintain this, ensure your infrastructure costs stay below Y% of revenue."

Now, help the user with their question based on this context.`;

  return prompt;
}

// Deep Seek pricing
const PRICING = {
  deepseek: {
    'deepseek-chat': {
      input: 0.00014, // $0.14 per 1M tokens
      output: 0.00028, // $0.28 per 1M tokens
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

  const modelPricing = providerPricing[model as keyof typeof providerPricing];
  if (!modelPricing) return 0;

  const inputCost = (promptTokens / 1_000_000) * modelPricing.input;
  const outputCost = (completionTokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  chatId: z.string().optional(), // Optional chat ID to save messages
});

// POST /api/ai/chat - Chat with AI assistant using Deep Seek
export async function POST(request: NextRequest) {
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
    
    // Get user's API keys
    let userSettings = null;
    try {
      userSettings = await prisma.userSettings.findUnique({
        where: { userId: user.id },
        select: {
          deepSeekApiKey: true,
          openaiApiKey: true,
          anthropicApiKey: true,
        },
      });
    } catch (dbError: any) {
      // If table doesn't exist yet, treat as no settings
      if (dbError.code === 'P2021' || dbError.message?.includes('does not exist')) {
        console.warn('UserSettings table does not exist yet.');
      } else {
        throw dbError;
      }
    }
    
    const apiKey = userSettings?.deepSeekApiKey;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: { message: 'Deep Seek API key not configured. Please add it in Settings. If you see a database migration error, run: npx prisma migrate dev --name add_user_settings' } },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { message, conversationHistory = [], chatId } = chatSchema.parse(body);

    // Fetch user's context from database for smart insights
    const userContext = await buildUserContext(user.id);

    // Build comprehensive system prompt with database context
    const systemPrompt = buildSystemPrompt(userContext);

    // Prepare messages for Deep Seek API
    const messages = [
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content: message,
      },
    ];

    // Call Deep Seek API
    const deepSeekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });
    
    if (!deepSeekResponse.ok) {
      const errorData = await deepSeekResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to get response from Deep Seek API');
    }
    
    const data = await deepSeekResponse.json();
    const response = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
    
    // Extract token usage from response
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || promptTokens + completionTokens;
    const model = data.model || 'deepseek-chat';
    
    // Calculate cost
    const cost = calculateCost('deepseek', model, promptTokens, completionTokens);
    
    // Save messages to chat if chatId is provided
    if (chatId) {
      try {
        // Check if Chat model exists
        if (prisma.chat) {
          // Verify chat belongs to user
          const chat = await prisma.chat.findFirst({
            where: {
              id: chatId,
              userId: user.id,
            },
          });
          
          if (chat && prisma.chatMessage) {
            // Save user message
            await prisma.chatMessage.create({
              data: {
                chatId: chatId,
                role: 'user',
                content: message,
              },
            });
            
            // Save assistant response
            await prisma.chatMessage.create({
              data: {
                chatId: chatId,
                role: 'assistant',
                content: response,
              },
            });
            
            // Update chat timestamp
            await prisma.chat.update({
              where: { id: chatId },
              data: { updatedAt: new Date() },
            });
          }
        }
      } catch (chatError: any) {
        // Log error but don't fail the request - chat history is optional
        if (chatError.code !== 'P2021' && !chatError.message?.includes('does not exist') && !chatError.message?.includes('Unknown model')) {
          console.error('Failed to save messages to chat:', chatError);
        }
      }
    }
    
    // Log API usage (don't block response if logging fails)
    try {
      if (prisma.apiUsage) {
        await prisma.apiUsage.create({
          data: {
            userId: user.id,
            provider: 'deepseek',
            endpoint: 'chat',
            model: model,
            promptTokens: promptTokens,
            completionTokens: completionTokens,
            totalTokens: totalTokens,
            cost: cost,
            statusCode: deepSeekResponse.status,
            metadata: JSON.stringify({
              requestSize: JSON.stringify(messages).length,
              responseSize: JSON.stringify(response).length,
            }),
          },
        });
      }
    } catch (logError: any) {
      // Log error but don't fail the request
      console.error('Failed to log API usage:', logError);
    }
    
    return NextResponse.json({ response });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { message: 'Invalid input', details: error.errors } },
        { status: 400 }
      );
    }
    
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to process chat request' } },
      { status: 500 }
    );
  }
}

