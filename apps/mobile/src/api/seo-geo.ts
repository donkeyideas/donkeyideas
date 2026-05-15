import { api } from './client';

export interface SeoGeoData {
  searchConsole: {
    connected: boolean;
    error?: string;
    data?: {
      overview: {
        totalClicks: number;
        totalImpressions: number;
        avgCtr: number;
        avgPosition: number;
      };
      topKeywords: Array<{
        keyword: string;
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
      }>;
      performanceOverTime: Array<{
        date: string;
        clicks: number;
        impressions: number;
      }>;
    };
  };
  pageSpeed: {
    mobile: {
      coreWebVitals: { lcp: number; fid: number; cls: number; fcp: number; ttfb: number };
      lighthouseScores: { performanceScore: number; seoScore: number; accessibilityScore: number };
    };
  } | null;
  seoAudit: {
    overallScore: number;
    totalIssues: { errors: number; warnings: number; info: number };
  } | null;
  geoAudit: {
    overallScore: number;
    structuredData: { score: number };
    llmAccessibility: { score: number };
    contentQuality: { score: number };
    technicalSignals: { score: number };
  } | null;
  snapshot: {
    seoScore: number;
    geoScore: number;
    performanceScore: number;
  } | null;
}

export async function getSeoGeoData(dateRange = '30d'): Promise<SeoGeoData> {
  const { data } = await api.get('/seo-geo', { params: { dateRange } });
  return data;
}

export async function getSeoRecommendations(): Promise<Array<{ id: string; title: string; description: string; impact: string; priority: string }>> {
  const { data } = await api.get('/seo-geo/recommendations');
  return data.recommendations || data;
}
