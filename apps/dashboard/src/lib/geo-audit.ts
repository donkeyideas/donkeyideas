const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.donkeyideas.com';

export interface GeoCategory {
  score: number;
  checks: Array<{ label: string; passed: boolean; detail?: string }>;
  issues: string[];
}

export interface GeoAuditResult {
  overallScore: number;
  structuredData: GeoCategory;
  llmAccessibility: GeoCategory;
  contentQuality: GeoCategory;
  technicalSignals: GeoCategory;
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    effort: 'easy' | 'medium' | 'hard';
    category: string;
  }>;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DonkeyIdeas-GEO-Audit/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function auditGeoReadiness(): Promise<GeoAuditResult> {
  // Fetch key resources in parallel
  const [homepage, robotsTxt, llmsTxt, sitemapXml] = await Promise.all([
    fetchText(SITE_URL),
    fetchText(`${SITE_URL}/robots.txt`),
    fetchText(`${SITE_URL}/llms.txt`),
    fetchText(`${SITE_URL}/sitemap.xml`),
  ]);

  // --- Structured Data Analysis ---
  const sdChecks: GeoCategory['checks'] = [];
  const sdIssues: string[] = [];
  let sdScore = 0;

  if (homepage) {
    const jsonLdMatches = homepage.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    const types: string[] = [];
    for (const match of jsonLdMatches) {
      try {
        const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
        const parsed = JSON.parse(jsonStr);
        if (parsed['@type']) types.push(parsed['@type']);
      } catch { /* skip */ }
    }

    const hasOrganization = types.includes('Organization');
    const hasWebsite = types.includes('WebSite');
    const hasBreadcrumbs = types.includes('BreadcrumbList');
    const hasService = types.includes('Service') || types.includes('ProfessionalService');
    const hasFAQ = types.includes('FAQPage');

    sdChecks.push(
      { label: 'Organization schema', passed: hasOrganization },
      { label: 'WebSite schema', passed: hasWebsite },
      { label: 'BreadcrumbList schema', passed: hasBreadcrumbs },
      { label: 'Service schema', passed: hasService },
      { label: 'FAQ schema', passed: hasFAQ },
    );

    const passedCount = sdChecks.filter(c => c.passed).length;
    sdScore = Math.round((passedCount / sdChecks.length) * 100);

    if (!hasOrganization) sdIssues.push('Add Organization structured data to help AI engines understand your brand');
    if (!hasWebsite) sdIssues.push('Add WebSite structured data with SearchAction for site search');
    if (!hasFAQ) sdIssues.push('Add FAQ schema to make your content directly answerable by AI engines');
  } else {
    sdIssues.push('Could not fetch homepage for structured data analysis');
  }

  // --- LLM Accessibility Analysis ---
  const llmChecks: GeoCategory['checks'] = [];
  const llmIssues: string[] = [];

  const hasLlmsTxt = llmsTxt !== null && llmsTxt.length > 50;
  llmChecks.push({ label: 'llms.txt present', passed: hasLlmsTxt, detail: hasLlmsTxt ? `${llmsTxt!.length} chars` : undefined });

  if (!hasLlmsTxt) {
    llmIssues.push('Create llms.txt file to describe your site for AI crawlers');
  }

  // Check robots.txt for AI crawler rules
  const hasGPTBot = robotsTxt?.includes('GPTBot') || false;
  const hasClaudeBot = robotsTxt?.includes('Claude-Web') || false;
  const hasPerplexityBot = robotsTxt?.includes('PerplexityBot') || false;
  const hasGoogleExtended = robotsTxt?.includes('Google-Extended') || false;

  llmChecks.push(
    { label: 'GPTBot allowed', passed: hasGPTBot },
    { label: 'Claude-Web allowed', passed: hasClaudeBot },
    { label: 'PerplexityBot allowed', passed: hasPerplexityBot },
    { label: 'Google-Extended allowed', passed: hasGoogleExtended },
  );

  if (!hasGPTBot) llmIssues.push('Add GPTBot rules to robots.txt');
  if (!hasClaudeBot) llmIssues.push('Add Claude-Web rules to robots.txt');

  const llmPassedCount = llmChecks.filter(c => c.passed).length;
  const llmScore = Math.round((llmPassedCount / llmChecks.length) * 100);

  // --- Content Quality Analysis ---
  const cqChecks: GeoCategory['checks'] = [];
  const cqIssues: string[] = [];

  if (homepage) {
    const bodyContent = homepage.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ');
    const wordCount = bodyContent.split(/\s+/).filter(w => w.length > 0).length;

    const hasSemanticHtml = /<(article|section|nav|header|footer|main|aside)/i.test(homepage);
    const hasHeadings = /<h[1-6][^>]*>/i.test(homepage);
    const hasMetaKeywords = /<meta[^>]*name=["']keywords["']/i.test(homepage);
    const hasSufficientContent = wordCount >= 500;

    cqChecks.push(
      { label: 'Sufficient content (500+ words)', passed: hasSufficientContent, detail: `${wordCount} words` },
      { label: 'Semantic HTML elements', passed: hasSemanticHtml },
      { label: 'Clear heading structure', passed: hasHeadings },
      { label: 'Meta keywords present', passed: hasMetaKeywords },
    );

    if (!hasSufficientContent) cqIssues.push('Homepage has less than 500 words - add more substantive content for AI engines');
    if (!hasSemanticHtml) cqIssues.push('Use semantic HTML elements (article, section, main) for better content understanding');
  } else {
    cqIssues.push('Could not fetch homepage for content analysis');
  }

  const cqPassedCount = cqChecks.filter(c => c.passed).length;
  const cqScore = cqChecks.length > 0 ? Math.round((cqPassedCount / cqChecks.length) * 100) : 0;

  // --- Technical Signals Analysis ---
  const tsChecks: GeoCategory['checks'] = [];
  const tsIssues: string[] = [];

  if (homepage) {
    const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(homepage);
    const hasOgTitle = /<meta[^>]*property=["']og:title["']/i.test(homepage);
    const hasTwitterCard = /<meta[^>]*name=["']twitter:card["']/i.test(homepage);
    const hasFavicon = /<link[^>]*rel=["'](?:icon|shortcut icon)["']/i.test(homepage);

    tsChecks.push(
      { label: 'Canonical URL', passed: hasCanonical },
      { label: 'Open Graph tags', passed: hasOgTitle },
      { label: 'Twitter Card tags', passed: hasTwitterCard },
      { label: 'Favicon', passed: hasFavicon },
      { label: 'Sitemap available', passed: sitemapXml !== null },
      { label: 'Robots.txt configured', passed: robotsTxt !== null },
    );

    if (!hasCanonical) tsIssues.push('Add canonical URLs to prevent duplicate content issues');
    if (!hasOgTitle) tsIssues.push('Add Open Graph tags for better social and AI sharing');
  } else {
    tsIssues.push('Could not fetch homepage for technical analysis');
  }

  const tsPassedCount = tsChecks.filter(c => c.passed).length;
  const tsScore = tsChecks.length > 0 ? Math.round((tsPassedCount / tsChecks.length) * 100) : 0;

  // --- Overall Score ---
  const overallScore = Math.round((sdScore + llmScore + cqScore + tsScore) / 4);

  // --- Recommendations ---
  const recommendations: GeoAuditResult['recommendations'] = [];

  if (!hasLlmsTxt) {
    recommendations.push({
      title: 'Create llms.txt file',
      description: 'Add a llms.txt file to your public directory describing your site, services, and key pages for AI crawlers.',
      priority: 'critical',
      effort: 'easy',
      category: 'LLM Accessibility',
    });
  }
  if (sdScore < 60) {
    recommendations.push({
      title: 'Add structured data schemas',
      description: 'Implement Organization, WebSite, Service, and FAQ JSON-LD schemas to help AI engines understand your content.',
      priority: 'high',
      effort: 'medium',
      category: 'Structured Data',
    });
  }
  if (!hasGPTBot || !hasClaudeBot) {
    recommendations.push({
      title: 'Configure AI crawler rules in robots.txt',
      description: 'Add explicit allow rules for GPTBot, Claude-Web, PerplexityBot, and Google-Extended in robots.txt.',
      priority: 'high',
      effort: 'easy',
      category: 'LLM Accessibility',
    });
  }
  if (cqScore < 75) {
    recommendations.push({
      title: 'Improve content quality for AI engines',
      description: 'Add more substantive, factual content. Use semantic HTML, clear headings, and structured information that AI can extract.',
      priority: 'medium',
      effort: 'medium',
      category: 'Content Quality',
    });
  }
  if (tsScore < 100) {
    recommendations.push({
      title: 'Complete technical SEO signals',
      description: 'Ensure all pages have canonical URLs, Open Graph tags, Twitter Cards, and proper meta tags.',
      priority: 'medium',
      effort: 'easy',
      category: 'Technical Signals',
    });
  }

  return {
    overallScore,
    structuredData: { score: sdScore, checks: sdChecks, issues: sdIssues },
    llmAccessibility: { score: llmScore, checks: llmChecks, issues: llmIssues },
    contentQuality: { score: cqScore, checks: cqChecks, issues: cqIssues },
    technicalSignals: { score: tsScore, checks: tsChecks, issues: tsIssues },
    recommendations,
  };
}
