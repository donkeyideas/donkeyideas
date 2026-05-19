import { api } from './client';

export interface AppStoreCompany {
  id: string;
  name: string;
  logo?: string | null;
  packageName?: string | null;
  crashRate?: number;
  anrRate?: number;
  activeDevices: number;
  rating: number;
  reviews: number;
  totalInstalls: number;
  dailyInstalls: number;
  dailyUninstalls?: number;
  storeVisitors?: number;
  storeAcquisitions?: number;
  conversionRate?: number;
  share: number;
}

export interface AppStoreData {
  connected: boolean;
  data?: {
    overview: {
      totalInstalls: number;
      dailyInstalls: number;
      dailyUninstalls?: number;
      activeDevices: number;
      averageRating: number;
      totalReviews: number;
      crashRate?: number;
      anrRate?: number;
    };
    installTimeSeries: Array<{ date: string; installs: number; uninstalls?: number }>;
    ratingDistribution?: Record<string, number>;
    reviews?: Array<{
      author: string;
      rating: number;
      text: string;
      date: string;
    }>;
    companyBreakdown: AppStoreCompany[];
  };
}

function mapAggregated(data: any): AppStoreData {
  const agg = data.aggregated;
  if (!agg?.overview) return { connected: false };
  return {
    connected: true,
    data: {
      overview: agg.overview,
      installTimeSeries: agg.installTimeSeries || [],
      ratingDistribution: agg.ratingDistribution,
      reviews: agg.reviews,
      companyBreakdown: agg.companyBreakdown || [],
    },
  };
}

export async function getConsolidatedPlayStore(dateRange = '7d'): Promise<AppStoreData> {
  const { data } = await api.get('/companies/consolidated/play-store', { params: { dateRange } });
  return mapAggregated(data);
}

export async function getConsolidatedAppStore(dateRange = '7d'): Promise<AppStoreData> {
  const { data } = await api.get('/companies/consolidated/app-store', { params: { dateRange } });
  return mapAggregated(data);
}
