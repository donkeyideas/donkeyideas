import { api } from './client';

export interface AnalyticsCompany {
  id: string;
  name: string;
  logo?: string | null;
  users: number;
  sessions: number;
  pageviews: number;
  bounceRate: number;
  share: number;
}

export interface AnalyticsData {
  connected: boolean;
  data?: {
    overview: {
      totalUsers: number;
      sessions: number;
      pageviews: number;
      bounceRate: number;
      avgSessionDuration: number;
      engagementRate?: number;
    };
    sessionsOverTime: Array<{ date: string; sessions: number; users: number }>;
    trafficSources: Array<{ source: string; sessions: number; percentage: number }>;
    topPages: Array<{ page: string; title: string; pageviews: number }>;
    devices: Array<{ device: string; sessions: number; percentage: number }>;
    companyBreakdown: AnalyticsCompany[];
  };
}

export async function getConsolidatedAnalytics(dateRange = '30d'): Promise<AnalyticsData> {
  const { data } = await api.get('/companies/consolidated/analytics', { params: { dateRange } });
  const agg = data.aggregated;
  if (!agg) return { connected: false };
  return {
    connected: true,
    data: {
      overview: {
        totalUsers: agg.totalUsers || 0,
        sessions: agg.totalSessions || 0,
        pageviews: agg.totalPageviews || 0,
        bounceRate: agg.avgBounceRate || 0,
        avgSessionDuration: agg.avgSessionDuration || 0,
      },
      sessionsOverTime: agg.sessionsOverTime || [],
      trafficSources: agg.trafficSources || [],
      topPages: [],
      devices: [],
      companyBreakdown: agg.companyBreakdown || [],
    },
  };
}
