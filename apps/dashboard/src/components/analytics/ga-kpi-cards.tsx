'use client';

import { Card, CardContent } from '@donkey-ideas/ui';

interface KPIData {
  totalUsers: number;
  newUsers?: number;
  sessions: number;
  pageviews: number;
  avgSessionDuration: number;
  bounceRate: number;
  engagementRate?: number;
}

interface GAKPICardsProps {
  data: KPIData;
  showEngagement?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

export function GAKPICards({ data, showEngagement = true }: GAKPICardsProps) {
  const kpis = [
    {
      label: 'Total Users',
      value: formatNumber(data.totalUsers),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: 'Sessions',
      value: formatNumber(data.sessions),
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      label: 'Pageviews',
      value: formatNumber(data.pageviews),
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      label: 'Avg. Session Duration',
      value: formatDuration(data.avgSessionDuration),
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Bounce Rate',
      value: `${data.bounceRate}%`,
      color: data.bounceRate > 50 ? 'text-red-400' : 'text-green-400',
      bgColor: data.bounceRate > 50 ? 'bg-red-500/10' : 'bg-green-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  if (showEngagement && data.engagementRate !== undefined) {
    kpis.push({
      label: 'Engagement Rate',
      value: `${data.engagementRate}%`,
      color: data.engagementRate > 50 ? 'text-green-400' : 'text-yellow-400',
      bgColor: data.engagementRate > 50 ? 'bg-green-500/10' : 'bg-yellow-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="hover:border-white/20 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bgColor} ${kpi.color}`}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-xs text-white/50 [.light_&]:text-slate-500">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
