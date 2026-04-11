'use client';

import { Card, CardContent } from '@donkey-ideas/ui';

interface PlayStoreOverview {
  crashRate: number;
  anrRate: number;
  slowStartRate: number;
  slowRenderingRate: number;
  activeDevices: number;
  averageRating: number;
  totalReviews: number;
  totalInstalls?: number;
  dailyInstalls?: number;
  dailyUninstalls?: number;
  dailyUpdates?: number;
}

interface GPKPICardsProps {
  data: PlayStoreOverview;
}

const THRESHOLDS = {
  crashRate: 1.09,
  anrRate: 0.47,
};

function getStatusColor(value: number, threshold: number, invert = false) {
  if (invert) {
    if (value >= 4.0) return { color: 'text-green-400', bg: 'bg-green-500/10' };
    if (value >= 3.0) return { color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
    return { color: 'text-red-400', bg: 'bg-red-500/10' };
  }
  if (value <= threshold * 0.5) return { color: 'text-green-400', bg: 'bg-green-500/10' };
  if (value <= threshold) return { color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  return { color: 'text-red-400', bg: 'bg-red-500/10' };
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function GPKPICards({ data }: GPKPICardsProps) {
  const crashStatus = getStatusColor(data.crashRate, THRESHOLDS.crashRate);
  const anrStatus = getStatusColor(data.anrRate, THRESHOLDS.anrRate);
  const ratingStatus = data.averageRating > 0
    ? getStatusColor(data.averageRating, 0, true)
    : { color: 'text-white/40', bg: 'bg-white/5' };

  const kpis = [
    {
      label: 'Total Installs',
      value: formatNumber(data.totalInstalls || 0),
      sub: null,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
    },
    {
      label: 'Active Devices',
      value: formatNumber(data.activeDevices),
      sub: null,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Daily Installs',
      value: formatNumber(data.dailyInstalls || 0),
      sub: null,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      label: 'Uninstalls',
      value: formatNumber(data.dailyUninstalls || 0),
      sub: null,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      ),
    },
    {
      label: 'Crash Rate',
      value: `${data.crashRate.toFixed(3)}%`,
      sub: `Limit: ${THRESHOLDS.crashRate}%`,
      ...crashStatus,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      label: 'ANR Rate',
      value: `${data.anrRate.toFixed(3)}%`,
      sub: `Limit: ${THRESHOLDS.anrRate}%`,
      ...anrStatus,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Rating',
      value: data.averageRating > 0 ? `${data.averageRating.toFixed(1)}/5` : 'N/A',
      sub: null,
      ...ratingStatus,
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ),
    },
    {
      label: 'Reviews',
      value: formatNumber(data.totalReviews),
      sub: null,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="hover:border-white/20 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-xs text-white/50 [.light_&]:text-slate-500">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                {kpi.sub && (
                  <p className="text-[10px] text-white/30 [.light_&]:text-slate-400">{kpi.sub}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
