import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

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
            content: 'You are a helpful AI assistant for Donkey Ideas, a venture builder platform. You help users with pitch decks, financial analysis, and project management. Be concise and helpful.',
          },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 2000,
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
            metadata: {
              requestSize: JSON.stringify(messages).length,
              responseSize: JSON.stringify(response).length,
            },
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

