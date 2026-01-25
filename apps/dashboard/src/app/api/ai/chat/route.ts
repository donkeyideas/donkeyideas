import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Helper function to build user context from database
async function buildUserContext(userId: string) {
  try {
    // Fetch user's companies with ALL key financial data
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
          take: 20,
          orderBy: { date: 'desc' },
        },
        transactions: {
          take: 50,
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
        balanceSheets: {
          take: 6,
          orderBy: { period: 'desc' },
        },
        cashFlows: {
          take: 6,
          orderBy: { period: 'desc' },
        },
      },
    });

    // Calculate aggregate metrics across all companies
    const totalCompanies = companies.length;
    const activeCompanies = companies.filter(c => c.status === 'active').length;

    // Calculate totals from all companies
    let totalCash = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalBudgetSpend = 0;
    let totalBudgetIncome = 0;
    const budgetWarnings = [];

    for (const company of companies) {
      // Get balance sheet data
      const latestBS = company.balanceSheets?.[0];
      if (latestBS) {
        totalCash += Number(latestBS.cashEquivalents || 0);
        totalAssets += Number(latestBS.cashEquivalents || 0) +
                       Number(latestBS.accountsReceivable || 0) +
                       Number(latestBS.fixedAssets || 0);
        totalLiabilities += Number(latestBS.accountsPayable || 0) +
                           Number(latestBS.shortTermDebt || 0) +
                           Number(latestBS.longTermDebt || 0);
      }

      // Get P&L data
      const latestPL = company.plStatements?.[0];
      if (latestPL) {
        totalRevenue += Number(latestPL.productRevenue || 0) +
                        Number(latestPL.serviceRevenue || 0) +
                        Number(latestPL.otherRevenue || 0);
        totalExpenses += Number(latestPL.directCosts || 0) +
                         Number(latestPL.infrastructureCosts || 0) +
                         Number(latestPL.salesMarketing || 0) +
                         Number(latestPL.rdExpenses || 0) +
                         Number(latestPL.adminExpenses || 0);
      }

      // Budget calculations
      const recentLines = company.budgetLines || [];
      const expenses = recentLines
        .filter(l => Number(l.amount) < 0)
        .reduce((sum, l) => sum + Number(l.amount), 0);
      const income = recentLines
        .filter(l => Number(l.amount) > 0)
        .reduce((sum, l) => sum + Number(l.amount), 0);

      totalBudgetSpend += Math.abs(expenses);
      totalBudgetIncome += income;

      // Detect budget warnings
      if (Math.abs(expenses) > income * 1.5 && income > 0) {
        budgetWarnings.push(`${company.name}: High burn rate detected - spending ${Math.abs(expenses).toFixed(0)} vs income ${income.toFixed(0)}`);
      }
    }

    totalEquity = totalAssets - totalLiabilities;

    return {
      user: { id: userId, totalCompanies, activeCompanies },
      companies: companies.map(c => {
        const latestBS = c.balanceSheets?.[0];
        const latestCF = c.cashFlows?.[0];
        const latestPL = c.plStatements?.[0];

        return {
          id: c.id,
          name: c.name,
          status: c.status,
          tagline: c.tagline,
          description: c.description,
          profile: c.businessProfile,
          recentTransactions: c.transactions?.slice(0, 10) || [],
          latestKPIs: c.kpis?.[0] || null,
          latestPL: latestPL,
          latestBalanceSheet: latestBS ? {
            cash: Number(latestBS.cashEquivalents || 0),
            accountsReceivable: Number(latestBS.accountsReceivable || 0),
            fixedAssets: Number(latestBS.fixedAssets || 0),
            accountsPayable: Number(latestBS.accountsPayable || 0),
            shortTermDebt: Number(latestBS.shortTermDebt || 0),
            longTermDebt: Number(latestBS.longTermDebt || 0),
            totalAssets: Number(latestBS.cashEquivalents || 0) + Number(latestBS.accountsReceivable || 0) + Number(latestBS.fixedAssets || 0),
            totalLiabilities: Number(latestBS.accountsPayable || 0) + Number(latestBS.shortTermDebt || 0) + Number(latestBS.longTermDebt || 0),
          } : null,
          latestCashFlow: latestCF ? {
            beginningCash: Number(latestCF.beginningCash || 0),
            operatingCashFlow: Number(latestCF.operatingCashFlow || 0),
            investingCashFlow: Number(latestCF.investingCashFlow || 0),
            financingCashFlow: Number(latestCF.financingCashFlow || 0),
            netCashFlow: Number(latestCF.netCashFlow || 0),
            endingCash: Number(latestCF.endingCash || 0),
          } : null,
          activeBudgets: c.budgetPeriods?.length || 0,
        };
      }),
      summary: {
        totalCash,
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
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
      summary: { totalCash: 0, totalAssets: 0, totalLiabilities: 0, totalEquity: 0, totalRevenue: 0, totalExpenses: 0, netProfit: 0, totalBudgetSpend: 0, totalBudgetIncome: 0, netCashFlow: 0, budgetWarnings: [] },
    };
  }
}

// Helper function to build comprehensive system prompt
function buildSystemPrompt(context: any) {
  const { user, companies, summary } = context;

  let prompt = `You are a smart, direct financial assistant for Donkey Ideas. You have access to ALL the user's financial data and must answer questions with SPECIFIC NUMBERS.

## CRITICAL RULES
1. **ALWAYS give direct answers first** - If asked "how much cash?", say "You have $X in cash" as the FIRST sentence
2. **Never say "I need to check"** - You already have all the data below
3. **Use actual numbers** - Reference the exact figures from the data provided
4. **Be concise** - Short, clear answers. No unnecessary explanations unless asked
5. **Format numbers nicely** - Use $1,234.56 format

## CONSOLIDATED FINANCIALS (ALL COMPANIES COMBINED)
- **Total Cash**: $${summary.totalCash?.toLocaleString() || '0'}
- **Total Assets**: $${summary.totalAssets?.toLocaleString() || '0'}
- **Total Liabilities**: $${summary.totalLiabilities?.toLocaleString() || '0'}
- **Total Equity**: $${summary.totalEquity?.toLocaleString() || '0'}
- **Total Revenue**: $${summary.totalRevenue?.toLocaleString() || '0'}
- **Total Expenses**: $${summary.totalExpenses?.toLocaleString() || '0'}
- **Net Profit**: $${summary.netProfit?.toLocaleString() || '0'}
- **Active Companies**: ${user.activeCompanies} of ${user.totalCompanies}
`;

  // Add detailed company data
  if (companies.length > 0) {
    prompt += `\n## COMPANY DETAILS\n`;
    companies.forEach((company: any, idx: number) => {
      prompt += `\n### ${company.name}`;
      prompt += `\nStatus: ${company.status}`;

      // Balance Sheet
      if (company.latestBalanceSheet) {
        const bs = company.latestBalanceSheet;
        prompt += `\n**Balance Sheet:**`;
        prompt += `\n- Cash: $${bs.cash.toLocaleString()}`;
        prompt += `\n- Accounts Receivable: $${bs.accountsReceivable.toLocaleString()}`;
        prompt += `\n- Fixed Assets: $${bs.fixedAssets.toLocaleString()}`;
        prompt += `\n- Total Assets: $${bs.totalAssets.toLocaleString()}`;
        prompt += `\n- Accounts Payable: $${bs.accountsPayable.toLocaleString()}`;
        prompt += `\n- Short-term Debt: $${bs.shortTermDebt.toLocaleString()}`;
        prompt += `\n- Long-term Debt: $${bs.longTermDebt.toLocaleString()}`;
        prompt += `\n- Total Liabilities: $${bs.totalLiabilities.toLocaleString()}`;
        prompt += `\n- Equity: $${(bs.totalAssets - bs.totalLiabilities).toLocaleString()}`;
      } else {
        prompt += `\n**Balance Sheet:** No data`;
      }

      // Cash Flow
      if (company.latestCashFlow) {
        const cf = company.latestCashFlow;
        prompt += `\n**Cash Flow:**`;
        prompt += `\n- Beginning Cash: $${cf.beginningCash.toLocaleString()}`;
        prompt += `\n- Operating Cash Flow: $${cf.operatingCashFlow.toLocaleString()}`;
        prompt += `\n- Investing Cash Flow: $${cf.investingCashFlow.toLocaleString()}`;
        prompt += `\n- Financing Cash Flow: $${cf.financingCashFlow.toLocaleString()}`;
        prompt += `\n- Net Cash Flow: $${cf.netCashFlow.toLocaleString()}`;
        prompt += `\n- Ending Cash: $${cf.endingCash.toLocaleString()}`;
      }

      // P&L
      if (company.latestPL) {
        const pl = company.latestPL;
        const totalRevenue = Number(pl.productRevenue || 0) + Number(pl.serviceRevenue || 0) + Number(pl.otherRevenue || 0);
        const totalExpenses = Number(pl.directCosts || 0) + Number(pl.infrastructureCosts || 0) + Number(pl.salesMarketing || 0) + Number(pl.rdExpenses || 0) + Number(pl.adminExpenses || 0);
        prompt += `\n**P&L:**`;
        prompt += `\n- Revenue: $${totalRevenue.toLocaleString()}`;
        prompt += `\n- Expenses: $${totalExpenses.toLocaleString()}`;
        prompt += `\n- Net Income: $${(totalRevenue - totalExpenses).toLocaleString()}`;
      }

      // KPIs
      if (company.latestKPIs) {
        const kpi = company.latestKPIs;
        prompt += `\n**KPIs:**`;
        if (kpi.mrr) prompt += ` MRR: $${Number(kpi.mrr).toLocaleString()}`;
        if (kpi.activeUsers) prompt += `, Users: ${kpi.activeUsers}`;
        if (kpi.growthRate) prompt += `, Growth: ${kpi.growthRate}%`;
        if (kpi.churnRate) prompt += `, Churn: ${kpi.churnRate}%`;
      }

      prompt += `\n`;
    });
  }

  // Add warnings
  if (summary.budgetWarnings && summary.budgetWarnings.length > 0) {
    prompt += `\n## WARNINGS\n`;
    summary.budgetWarnings.forEach((w: string) => prompt += `- ${w}\n`);
  }

  prompt += `
## RESPONSE FORMAT
- Start with the direct answer to the question
- Use bullet points for lists
- Keep it brief unless more detail is requested
- If a company has no data for something, say "No data available for [X]"

Answer the user's question now.`;

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

