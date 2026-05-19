import { api } from './client';

export interface UserOverview {
  totalUsers: number;
  newUsers30d: number;
  newUsers7d: number;
  growthRate: number;
  usersByProject: Array<{ project: string; slug: string; count: number; color?: string; logo?: string | null }>;
  growthTrend: Array<{ date: string; users: number }>;
  signupTrend: Array<{ date: string; signups: number }>;
}

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  lastActive: string | null;
  status: string;
  role: string;
  plan: string;
  provider: string;
  project: string;
  projectName: string;
  projectColor: string;
  projectLogo?: string | null;
  avatarUrl?: string | null;
}

export interface UsersListResponse {
  users: UserRow[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getUserOverview(dateRange = '30d', project?: string): Promise<UserOverview> {
  const { data } = await api.get('/users/overview', { params: { dateRange, project } });

  const usersByProject = (data.byProject || []).map((p: any) => ({
    project: p.displayName,
    slug: p.slug,
    count: p.total,
    color: p.color,
    logo: p.logo,
  }));

  const growthTrend = (data.growthTimeSeries || []).map((point: any) => {
    const users = Object.entries(point)
      .filter(([k]) => k !== 'date')
      .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);
    return { date: point.date, users };
  });

  return {
    totalUsers: data.kpis?.totalUsers || 0,
    newUsers30d: data.kpis?.newUsers30d || 0,
    newUsers7d: data.kpis?.newUsers7d || 0,
    growthRate: data.kpis?.growthRate || 0,
    usersByProject,
    growthTrend,
    signupTrend: growthTrend.map((g) => ({ date: g.date, signups: g.users })),
  };
}

export async function getUsersList(opts: {
  project?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
} = {}): Promise<UsersListResponse> {
  const { data } = await api.get('/users/list', {
    params: {
      project: opts.project || 'all',
      page: opts.page || 1,
      limit: opts.limit || 25,
      sortBy: opts.sortBy || 'createdAt',
      sortDir: opts.sortDir || 'desc',
      search: opts.search,
    },
  });
  return data;
}
