const PAGESPEED_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export interface CoreWebVitals {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

export interface LighthouseScores {
  performanceScore: number;
  seoScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
}

export interface Diagnostic {
  id: string;
  title: string;
  description: string;
  score: number | null;
  displayValue?: string;
}

export interface PageSpeedResult {
  url: string;
  strategy: 'mobile' | 'desktop';
  coreWebVitals: CoreWebVitals;
  lighthouseScores: LighthouseScores;
  diagnostics: Diagnostic[];
}

export async function fetchPageSpeedInsights(
  url: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PageSpeedResult> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  const params = new URLSearchParams({
    url,
    strategy,
    ...(apiKey ? { key: apiKey } : {}),
  });

  // Add multiple category params (URLSearchParams only keeps last value for same key)
  const categories = ['performance', 'seo', 'accessibility', 'best-practices'];
  for (const cat of categories) {
    params.append('category', cat);
  }
  const fullUrl = `${PAGESPEED_API_URL}?${params.toString()}`;

  const res = await fetch(fullUrl, { cache: 'no-store' });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    console.error('PageSpeed API error:', res.status, errData);
    throw new Error(errData.error?.message || `PageSpeed API error: ${res.status}`);
  }

  const data = await res.json();
  const lighthouse = data.lighthouseResult;

  if (!lighthouse) {
    console.error('PageSpeed API returned no lighthouse data for', url, strategy);
    throw new Error('PageSpeed API did not return Lighthouse results');
  }

  // Extract Core Web Vitals from field data or lab data
  const fieldMetrics = data.loadingExperience?.metrics || {};
  const labAudits = lighthouse?.audits || {};

  const coreWebVitals: CoreWebVitals = {
    lcp: fieldMetrics['LARGEST_CONTENTFUL_PAINT_MS']?.percentile
      || Math.round(parseFloat(labAudits['largest-contentful-paint']?.numericValue || '0')),
    fid: fieldMetrics['FIRST_INPUT_DELAY_MS']?.percentile
      || Math.round(parseFloat(labAudits['max-potential-fid']?.numericValue || '0')),
    cls: (fieldMetrics['CUMULATIVE_LAYOUT_SHIFT_SCORE']?.percentile
      || parseFloat(labAudits['cumulative-layout-shift']?.numericValue || '0')) / 100,
    fcp: fieldMetrics['FIRST_CONTENTFUL_PAINT_MS']?.percentile
      || Math.round(parseFloat(labAudits['first-contentful-paint']?.numericValue || '0')),
    ttfb: fieldMetrics['EXPERIMENTAL_TIME_TO_FIRST_BYTE']?.percentile
      || Math.round(parseFloat(labAudits['server-response-time']?.numericValue || '0')),
  };

  const lighthouseScores: LighthouseScores = {
    performanceScore: Math.round((lighthouse?.categories?.performance?.score || 0) * 100),
    seoScore: Math.round((lighthouse?.categories?.seo?.score || 0) * 100),
    accessibilityScore: Math.round((lighthouse?.categories?.accessibility?.score || 0) * 100),
    bestPracticesScore: Math.round((lighthouse?.categories?.['best-practices']?.score || 0) * 100),
  };

  // Extract diagnostics (failed or warning audits)
  const diagnostics: Diagnostic[] = [];
  const auditRefs = lighthouse?.categories?.performance?.auditRefs || [];
  for (const ref of auditRefs) {
    const audit = labAudits[ref.id];
    if (audit && audit.score !== null && audit.score < 0.9) {
      diagnostics.push({
        id: ref.id,
        title: audit.title || ref.id,
        description: audit.description || '',
        score: audit.score,
        displayValue: audit.displayValue,
      });
    }
  }

  return { url, strategy, coreWebVitals, lighthouseScores, diagnostics };
}

export async function fetchCoreWebVitals(url: string): Promise<{
  mobile: PageSpeedResult;
  desktop: PageSpeedResult;
}> {
  const [mobile, desktop] = await Promise.all([
    fetchPageSpeedInsights(url, 'mobile'),
    fetchPageSpeedInsights(url, 'desktop'),
  ]);
  return { mobile, desktop };
}

// CWV thresholds per Google's standards
export const CWV_THRESHOLDS = {
  lcp: { good: 2500, needsImprovement: 4000 },
  fid: { good: 100, needsImprovement: 300 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  fcp: { good: 1800, needsImprovement: 3000 },
  ttfb: { good: 800, needsImprovement: 1800 },
} as const;

export function getCWVRating(metric: keyof typeof CWV_THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = CWV_THRESHOLDS[metric];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}
