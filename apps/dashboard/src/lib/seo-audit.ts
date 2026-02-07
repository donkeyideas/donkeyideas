const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.donkeyideas.com';

const PUBLIC_PAGES = [
  '/',
  '/ventures',
  '/services',
  '/process',
  '/about',
  '/contact',
  '/privacy',
];

export interface PageIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  element?: string;
}

export interface PageAuditResult {
  url: string;
  title: { value: string; length: number; hasIssue: boolean; issue?: string };
  metaDescription: { value: string; length: number; hasIssue: boolean; issue?: string };
  h1: { count: number; values: string[]; hasIssue: boolean; issue?: string };
  headingStructure: { h2Count: number; h3Count: number; hasIssue: boolean; issue?: string };
  images: { total: number; withoutAlt: number; hasIssue: boolean };
  links: { internal: number; external: number };
  canonicalUrl: string | null;
  ogTags: { title: boolean; description: boolean; image: boolean };
  structuredData: { found: boolean; types: string[] };
  wordCount: number;
  score: number;
  issues: PageIssue[];
}

export interface SiteAuditResult {
  pages: PageAuditResult[];
  overallScore: number;
  totalIssues: { errors: number; warnings: number; info: number };
  commonIssues: string[];
}

function extractBetween(html: string, startTag: string, endTag: string): string {
  const startIdx = html.indexOf(startTag);
  if (startIdx === -1) return '';
  const contentStart = startIdx + startTag.length;
  const endIdx = html.indexOf(endTag, contentStart);
  if (endIdx === -1) return '';
  return html.substring(contentStart, endIdx);
}

function countOccurrences(html: string, pattern: RegExp): number {
  return (html.match(pattern) || []).length;
}

function extractAll(html: string, pattern: RegExp): string[] {
  const matches: string[] = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    matches.push(match[1] || match[0]);
  }
  return matches;
}

export async function auditPage(url: string): Promise<PageAuditResult> {
  const issues: PageIssue[] = [];

  let html = '';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DonkeyIdeas-SEO-Audit/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    html = await res.text();
  } catch {
    return {
      url,
      title: { value: '', length: 0, hasIssue: true, issue: 'Page unreachable' },
      metaDescription: { value: '', length: 0, hasIssue: true, issue: 'Page unreachable' },
      h1: { count: 0, values: [], hasIssue: true, issue: 'Page unreachable' },
      headingStructure: { h2Count: 0, h3Count: 0, hasIssue: true, issue: 'Page unreachable' },
      images: { total: 0, withoutAlt: 0, hasIssue: false },
      links: { internal: 0, external: 0 },
      canonicalUrl: null,
      ogTags: { title: false, description: false, image: false },
      structuredData: { found: false, types: [] },
      wordCount: 0,
      score: 0,
      issues: [{ type: 'error', message: `Failed to fetch page: ${url}` }],
    };
  }

  // Title analysis
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const titleValue = titleMatch ? titleMatch[1].trim() : '';
  const titleLength = titleValue.length;
  const titleResult = { value: titleValue, length: titleLength, hasIssue: false as boolean, issue: undefined as string | undefined };

  if (!titleValue) {
    titleResult.hasIssue = true;
    titleResult.issue = 'Missing title tag';
    issues.push({ type: 'error', message: 'Missing title tag', element: 'title' });
  } else if (titleLength < 30) {
    titleResult.hasIssue = true;
    titleResult.issue = 'Title too short (< 30 chars)';
    issues.push({ type: 'warning', message: `Title too short: ${titleLength} chars`, element: 'title' });
  } else if (titleLength > 60) {
    titleResult.hasIssue = true;
    titleResult.issue = 'Title too long (> 60 chars)';
    issues.push({ type: 'warning', message: `Title too long: ${titleLength} chars`, element: 'title' });
  }

  // Meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDescValue = metaDescMatch ? metaDescMatch[1].trim() : '';
  const metaDescLength = metaDescValue.length;
  const metaDescResult = { value: metaDescValue, length: metaDescLength, hasIssue: false as boolean, issue: undefined as string | undefined };

  if (!metaDescValue) {
    metaDescResult.hasIssue = true;
    metaDescResult.issue = 'Missing meta description';
    issues.push({ type: 'error', message: 'Missing meta description', element: 'meta description' });
  } else if (metaDescLength < 70) {
    metaDescResult.hasIssue = true;
    metaDescResult.issue = 'Meta description too short (< 70 chars)';
    issues.push({ type: 'warning', message: `Meta description too short: ${metaDescLength} chars`, element: 'meta description' });
  } else if (metaDescLength > 160) {
    metaDescResult.hasIssue = true;
    metaDescResult.issue = 'Meta description too long (> 160 chars)';
    issues.push({ type: 'warning', message: `Meta description too long: ${metaDescLength} chars`, element: 'meta description' });
  }

  // H1 analysis - use [\s\S]*? to capture content with nested tags like <br />, <span>, etc.
  const h1RawValues = extractAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  const h1Values = h1RawValues.map(v => v.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  const h1Count = h1Values.length;
  const h1Result = { count: h1Count, values: h1Values, hasIssue: false as boolean, issue: undefined as string | undefined };

  if (h1Count === 0) {
    h1Result.hasIssue = true;
    h1Result.issue = 'Missing H1 tag';
    issues.push({ type: 'error', message: 'Missing H1 tag', element: 'h1' });
  } else if (h1Count > 1) {
    h1Result.hasIssue = true;
    h1Result.issue = `Multiple H1 tags found (${h1Count})`;
    issues.push({ type: 'warning', message: `Multiple H1 tags: ${h1Count}`, element: 'h1' });
  }

  // Heading structure
  const h2Count = countOccurrences(html, /<h2[^>]*>/gi);
  const h3Count = countOccurrences(html, /<h3[^>]*>/gi);
  const headingResult = { h2Count, h3Count, hasIssue: false as boolean, issue: undefined as string | undefined };

  if (h2Count === 0) {
    headingResult.hasIssue = true;
    headingResult.issue = 'No H2 headings found';
    issues.push({ type: 'info', message: 'No H2 headings found', element: 'h2' });
  }

  // Image analysis
  const imgTotal = countOccurrences(html, /<img[^>]*>/gi);
  const imgWithAlt = countOccurrences(html, /<img[^>]*alt=["'][^"']+["'][^>]*>/gi);
  const imgWithoutAlt = imgTotal - imgWithAlt;
  const imagesResult = { total: imgTotal, withoutAlt: imgWithoutAlt, hasIssue: imgWithoutAlt > 0 };

  if (imgWithoutAlt > 0) {
    issues.push({ type: 'warning', message: `${imgWithoutAlt} images missing alt text`, element: 'img' });
  }

  // Links
  const internalLinks = countOccurrences(html, new RegExp(`href=["'](?:${SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})?/[^"']*["']`, 'gi'));
  const allLinks = countOccurrences(html, /href=["']https?:\/\/[^"']*["']/gi);
  const externalLinks = allLinks - internalLinks;

  // Canonical URL
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
  const canonicalUrl = canonicalMatch ? canonicalMatch[1] : null;

  if (!canonicalUrl) {
    issues.push({ type: 'info', message: 'No canonical URL specified', element: 'link[rel=canonical]' });
  }

  // Open Graph tags
  const hasOgTitle = /<meta[^>]*property=["']og:title["']/i.test(html);
  const hasOgDesc = /<meta[^>]*property=["']og:description["']/i.test(html);
  const hasOgImage = /<meta[^>]*property=["']og:image["']/i.test(html);

  if (!hasOgTitle) issues.push({ type: 'warning', message: 'Missing og:title', element: 'og:title' });
  if (!hasOgDesc) issues.push({ type: 'warning', message: 'Missing og:description', element: 'og:description' });
  if (!hasOgImage) issues.push({ type: 'warning', message: 'Missing og:image', element: 'og:image' });

  // Structured data (JSON-LD)
  const jsonLdMatches = extractAll(html, /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  const structuredDataTypes: string[] = [];
  for (const jsonStr of jsonLdMatches) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed['@type']) structuredDataTypes.push(parsed['@type']);
    } catch { /* skip invalid */ }
  }

  if (structuredDataTypes.length === 0) {
    issues.push({ type: 'info', message: 'No structured data (JSON-LD) found', element: 'script[type=application/ld+json]' });
  }

  // Word count (rough estimate from body text)
  const bodyContent = extractBetween(html, '<body', '</body>');
  const textOnly = bodyContent.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
  const wordCount = textOnly.split(/\s+/).filter(w => w.length > 0).length;

  if (wordCount < 300) {
    issues.push({ type: 'info', message: `Low word count: ${wordCount} words`, element: 'body' });
  }

  // Calculate score
  let score = 100;
  for (const issue of issues) {
    if (issue.type === 'error') score -= 15;
    else if (issue.type === 'warning') score -= 5;
    else score -= 2;
  }
  score = Math.max(0, Math.min(100, score));

  return {
    url,
    title: titleResult,
    metaDescription: metaDescResult,
    h1: h1Result,
    headingStructure: headingResult,
    images: imagesResult,
    links: { internal: internalLinks, external: externalLinks },
    canonicalUrl,
    ogTags: { title: hasOgTitle, description: hasOgDesc, image: hasOgImage },
    structuredData: { found: structuredDataTypes.length > 0, types: structuredDataTypes },
    wordCount,
    score,
    issues,
  };
}

export async function auditAllPublicPages(): Promise<SiteAuditResult> {
  const pages = await Promise.all(
    PUBLIC_PAGES.map(path => auditPage(`${SITE_URL}${path}`))
  );

  const totalIssues = { errors: 0, warnings: 0, info: 0 };
  for (const page of pages) {
    for (const issue of page.issues) {
      totalIssues[issue.type === 'error' ? 'errors' : issue.type === 'warning' ? 'warnings' : 'info']++;
    }
  }

  // Find common issues (appear on 3+ pages)
  const issueCounts = new Map<string, number>();
  for (const page of pages) {
    for (const issue of page.issues) {
      issueCounts.set(issue.message, (issueCounts.get(issue.message) || 0) + 1);
    }
  }
  const commonIssues = Array.from(issueCounts.entries())
    .filter(([, count]) => count >= 3)
    .map(([message]) => message);

  const overallScore = pages.length > 0
    ? Math.round(pages.reduce((sum, p) => sum + p.score, 0) / pages.length)
    : 0;

  return { pages, overallScore, totalIssues, commonIssues };
}
