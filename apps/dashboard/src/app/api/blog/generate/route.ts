import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@donkey-ideas/database';
import { getUserByToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export const maxDuration = 60;

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

function stripMarkdown(text: string): string {
  if (!text) return text;
  return text
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic markers
    .replace(/\*\*\*(.*?)\*\*\*/g, '$1')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/___(.*?)___/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Convert markdown links to HTML anchor tags
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Remove image syntax
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// POST /api/blog/generate
export async function POST(request: NextRequest) {
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

    // Get user's DeepSeek API key
    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    const apiKey = settings?.deepSeekApiKey;
    if (!apiKey) {
      return NextResponse.json(
        { error: { message: 'DeepSeek API key not configured. Please add it in Settings.' } },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { topic } = body;

    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      return NextResponse.json(
        { error: { message: 'Please provide a topic for the blog post' } },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a professional blog content writer for Donkey Ideas, a venture builder and consulting company. Website: https://www.donkeyideas.com

Your task is to generate a complete blog post about the given topic.

CRITICAL RULES:
1. Output ONLY valid JSON. No text before or after the JSON.
2. Content must be written as plain HTML. Use ONLY these HTML tags: <p>, <h2>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <a>
3. Do NOT use any markdown formatting. No **, ##, *, _, \`\`\`, or any markdown syntax whatsoever.
4. Write in a professional, engaging, and authoritative tone.
5. Target 600-1000 words for the content.
6. The title should be 40-60 characters.
7. The excerpt should be 120-200 characters.
8. The meta description should be 120-160 characters.

LINKING RULES (important for SEO):
- Include 2-4 internal links to relevant Donkey Ideas pages using relative paths. Available internal pages:
  - /services - consulting and venture building services
  - /ventures - portfolio of ventures and case studies
  - /about - company mission, team, and values
  - /process - venture building methodology and approach
  - /blog - blog listing page
  - /contact - contact and get in touch page
- Include 2-3 external links to authoritative sources (industry reports, well-known publications, official documentation) that support claims or add value. Use full URLs with https:// for external links.
- All links must use <a> tags with descriptive anchor text. Example: <a href="/services">our venture building services</a> or <a href="https://hbr.org/some-article">Harvard Business Review reports</a>
- Open external links in new tab: <a href="https://example.com" target="_blank" rel="noopener noreferrer">text</a>
- Internal links should NOT have target="_blank".
- Weave links naturally into sentences. Do not cluster them.

Return this exact JSON structure:
{
  "title": "Blog Post Title Here",
  "slug": "blog-post-title-here",
  "excerpt": "A compelling excerpt that summarizes the post...",
  "content": "<p>First paragraph...</p><h2>Section Title</h2><p>More content with <a href=\\"/services\\">our services</a>...</p>",
  "category": "Category Name",
  "tags": ["tag1", "tag2", "tag3"],
  "seoTitle": "SEO Optimized Title | Donkey Ideas",
  "seoDescription": "Meta description for search engines...",
  "seoKeywords": ["keyword1", "keyword2", "keyword3"],
  "focusKeyword": "main keyword"
}`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Write a blog post about: ${topic.trim()}` },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('DeepSeek API error:', response.status, errText);
      let errMessage = `DeepSeek API error (${response.status})`;
      try {
        const errData = JSON.parse(errText);
        errMessage = errData.error?.message || errMessage;
      } catch {}
      if (response.status === 401) errMessage = 'DeepSeek API key is invalid or expired. Check Settings.';
      if (response.status === 429) errMessage = 'DeepSeek rate limit exceeded. Please wait a moment and try again.';
      if (response.status === 402) errMessage = 'DeepSeek account has insufficient balance. Please top up.';
      return NextResponse.json(
        { error: { message: errMessage } },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    // Track usage
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const totalTokens = data.usage?.total_tokens || 0;
    const cost = calculateCost(promptTokens, completionTokens);

    try {
      await prisma.apiUsage.create({
        data: {
          userId: user.id,
          provider: 'deepseek',
          endpoint: 'blog-generate',
          model: 'deepseek-chat',
          promptTokens,
          completionTokens,
          totalTokens,
          cost,
          metadata: { topic: topic.trim() },
        },
      });
    } catch (e) {
      console.error('Failed to log API usage:', e);
    }

    // Parse the JSON response
    let generated;
    try {
      let jsonStr = rawContent.trim();
      // Remove ```json ... ``` wrapping
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      // Try to find JSON object if there's text before/after it
      if (!jsonStr.startsWith('{')) {
        const objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) {
          jsonStr = objMatch[0];
        }
      }
      generated = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse DeepSeek response:', rawContent.substring(0, 500));
      return NextResponse.json(
        { error: { message: 'Failed to parse AI response. Please try again.' } },
        { status: 502 }
      );
    }

    // Strip any remaining markdown from all text fields
    if (generated.title) generated.title = stripMarkdown(generated.title);
    if (generated.excerpt) generated.excerpt = stripMarkdown(generated.excerpt);
    if (generated.content) generated.content = stripMarkdown(generated.content);
    if (generated.seoTitle) generated.seoTitle = stripMarkdown(generated.seoTitle);
    if (generated.seoDescription) generated.seoDescription = stripMarkdown(generated.seoDescription);

    // Ensure slug is URL-safe
    if (generated.title && !generated.slug) {
      generated.slug = generated.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    return NextResponse.json({
      generated,
      usage: { promptTokens, completionTokens, totalTokens, cost },
    });
  } catch (error: any) {
    console.error('Blog generate error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Failed to generate blog post' } },
      { status: 500 }
    );
  }
}
