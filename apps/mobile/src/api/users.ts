import { api } from './client';

export interface UserOverview {
  totalUsers: number;
  newUsers30d: number;
  newUsers7d: number;
  growthRate: number;
  usersByProject: Array<{ project: string; slug: string; count: number; color?: string }>;
  growthTrend: Array<{ date: string; users: number }>;
  signupTrend: Array<{ date: string; signups: number }>;
}

export async function getUserOverview(dateRange = '30d', project?: string): Promise<UserOverview> {
  const { data } = await api.get('/users/overview', { params: { dateRange, project } });
  return data;
}
