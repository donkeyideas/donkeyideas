import { api } from './client';

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
  };
}

export async function getConsolidatedPlayStore(dateRange = '7d'): Promise<AppStoreData> {
  const { data } = await api.get('/companies/consolidated/play-store', { params: { dateRange } });
  if (!data.overview) return { connected: false };
  return {
    connected: true,
    data: {
      overview: data.overview || {},
      installTimeSeries: data.installTimeSeries || [],
      ratingDistribution: data.ratingDistribution,
      reviews: data.reviews,
    },
  };
}

export async function getConsolidatedAppStore(dateRange = '7d'): Promise<AppStoreData> {
  const { data } = await api.get('/companies/consolidated/app-store', { params: { dateRange } });
  if (!data.overview) return { connected: false };
  return {
    connected: true,
    data: {
      overview: data.overview || {},
      installTimeSeries: data.installTimeSeries || [],
      ratingDistribution: data.ratingDistribution,
      reviews: data.reviews,
    },
  };
}
