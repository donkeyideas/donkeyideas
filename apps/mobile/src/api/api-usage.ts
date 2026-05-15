import { api } from './client';

export interface ApiUsageStats {
  totalCalls: number;
  totalCost: number;
  totalTokens: number;
  byProvider: Array<{
    provider: string;
    calls: number;
    cost: number;
    tokens: number;
  }>;
  recentCalls: Array<{
    id: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    createdAt: string;
  }>;
  dailyStats: Array<{
    date: string;
    calls: number;
    cost: number;
    tokens: number;
  }>;
}

export async function getApiUsageStats(range = '30d'): Promise<ApiUsageStats> {
  const { data } = await api.get('/api-usage/stats', { params: { range } });
  return data;
}
