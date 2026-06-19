// Portfolio Growth Agent — per-product DEEP DIVE.
// Fetches a product's website, runs technical SEO/health checks, then has
// DeepSeek act as a growth/SEO/conversion auditor on the real page content —
// finding errors, weak/missing SEO, spelling/clarity issues, conversion
// blockers, and trust gaps, specific to THIS site. This is the investigative
// layer (beyond the scoring instrument).

const PRICING = { input: 0.14, output: 0.28 };
const calcCost = (p: number, c: number) => (p / 1e6) * PRICING.input + (c / 1e6) * PRICING.output;

export interface DeepDiveIssue {
  severity: 'high' | 'medium' | 'low';
  category: 'seo' | 'copy' | 'conversion' | 'trust' | 'technical';
  title: string;
  detail: string;
  fix: string;
}
export interface DeepDiveResult {
  domain: string;
  httpStatus: number | null;
  technical: Record<string, unknown>;
  summary: string;
  issues: DeepDiveIssue[];
  tokensUsed: number;
  cost: number;
  error?: string;
}

async function fetchSite(url: string) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DonkeyIdeasPortfolioAgent/1.0)' },
      cache: 'no-store',
    });
    const html = await res.text();
    return { status: res.status, html, finalUrl: res.url };
  } finally {
    clearTimeout(t);
  }
}

function technicalChecks(html: string) {
  const get = (re: RegExp) => { const m = html.match(re); return m ? m[1].trim() : null; };
  const title = get(/<title[^>]*>([^<]*)<\/title>/i);
  const desc = get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const h1raw = get(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1raw ? h1raw.replace(/<[^>]+>/g, '').trim() : null;
  return {
    title, titleLength: title?.length ?? 0,
    metaDescription: desc, metaDescriptionLength: desc?.length ?? 0,
    h1,
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    noindex: /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html),
    hasOgTitle: /<meta[^>]+property=["']og:title["']/i.test(html),
    hasOgImage: /<meta[^>]+property=["']og:image["']/i.test(html),
    hasCanonical: /<link[^>]+rel=["']canonical["']/i.test(html),
    hasAnalytics: /googletagmanager|gtag\(|google-analytics|plausible\.io|posthog|mixpanel|segment\.com|clarity\.ms/i.test(html),
    hasFavicon: /<link[^>]+rel=["'][^"']*icon/i.test(html),
    htmlBytes: html.length,
  };
}

function visibleText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);
}

export async function deepDive(domain: string, productName: string, thesis: string, apiKey: string): Promise<DeepDiveResult> {
  let status: number | null = null;
  let technical: Record<string, unknown> = {};
  let text = '';
  try {
    const r = await fetchSite(domain);
    status = r.status;
    technical = technicalChecks(r.html);
    text = visibleText(r.html);
    if (status >= 400) {
      return {
        domain, httpStatus: status, technical, summary: `${productName}'s site returned HTTP ${status}.`,
        issues: [{ severity: 'high', category: 'technical', title: `Site returns HTTP ${status}`, detail: `${domain} responded with ${status} — visitors (and Google) may be hitting an error page.`, fix: 'Fix the server error / broken route so the homepage returns 200.' }],
        tokensUsed: 0, cost: 0,
      };
    }
  } catch (e: any) {
    return {
      domain, httpStatus: null, technical: {}, summary: `${productName}'s site could not be loaded.`,
      issues: [{ severity: 'high', category: 'technical', title: 'Site unreachable', detail: `Could not load ${domain}: ${e?.message || 'timeout/error'}. This can be DNS, SSL, downtime, or bot-blocking.`, fix: 'Verify DNS resolves, SSL is valid, the site is up, and it is not blocking crawlers/agents.' }],
      tokensUsed: 0, cost: 0, error: e?.message,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are a senior growth + SEO + conversion-rate expert auditing the HOMEPAGE of "${productName}". Today's date is ${today} (do NOT flag a current-year copyright as wrong).
WHAT THIS PRODUCT IS: ${thesis}

TECHNICAL FINDINGS (from the live page): ${JSON.stringify(technical)}
HTTP STATUS: ${status}
VISIBLE PAGE TEXT (truncated): """${text}"""

Find the highest-impact, SPECIFIC problems hurting this product's growth & conversion. Look hard for: SEO issues (missing/weak/too-long title or meta description, missing H1, noindex, no canonical, no OG tags, no analytics), spelling/grammar/clarity errors in the actual copy above, a missing or weak call-to-action, trust/credibility gaps, mobile/technical issues, and traffic blockers. Quote the actual page text when relevant. Be blunt and concrete — no generic advice.
Return ONLY JSON: { "summary": "2-sentence blunt verdict on this homepage", "issues": [ { "severity":"high|medium|low", "category":"seo|copy|conversion|trust|technical", "title":"short", "detail":"specific, cite the page", "fix":"the concrete fix" } ] }. Order by severity, max 8 issues.`;

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a blunt, specific growth/SEO/conversion auditor. You cite the actual page content. Never use emojis. You always return valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3, max_tokens: 1600, response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) return { domain, httpStatus: status, technical, summary: 'AI analysis failed.', issues: [], tokensUsed: 0, cost: 0, error: 'deepseek error' };
    const data = await res.json();
    const usage = data.usage ?? {};
    let parsed: any = {};
    try { parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}'); } catch { /* keep empty */ }
    return {
      domain, httpStatus: status, technical,
      summary: String(parsed.summary ?? ''),
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 8) : [],
      tokensUsed: usage.total_tokens ?? 0,
      cost: calcCost(usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0),
    };
  } catch (e: any) {
    return { domain, httpStatus: status, technical, summary: '', issues: [], tokensUsed: 0, cost: 0, error: e?.message };
  }
}
