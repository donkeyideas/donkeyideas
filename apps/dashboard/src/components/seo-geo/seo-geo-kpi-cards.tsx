'use client';

import { Card, CardContent } from '@donkey-ideas/ui';

interface SeoGeoKPIData {
  totalClicks?: number;
  totalImpressions?: number;
  avgCtr?: number;
  avgPosition?: number;
  seoScore?: number;
  geoScore?: number;
  performanceScore?: number;
  issuesFound?: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

function getScoreColor(score: number): { text: string; bg: string } {
  if (score >= 80) return { text: 'text-green-400', bg: 'bg-green-500/10' };
  if (score >= 50) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  return { text: 'text-red-400', bg: 'bg-red-500/10' };
}

export function SeoGeoKPICards({ data }: { data: SeoGeoKPIData }) {
  const kpis = [
    {
      label: 'Total Clicks',
      value: data.totalClicks != null ? formatNumber(data.totalClicks) : '--',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Total Impressions',
      value: data.totalImpressions != null ? formatNumber(data.totalImpressions) : '--',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Avg. CTR',
      value: data.avgCtr != null ? `${data.avgCtr}%` : '--',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Avg. Position',
      value: data.avgPosition != null ? data.avgPosition.toFixed(1) : '--',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: 'SEO Score',
      value: data.seoScore != null ? `${data.seoScore}` : '--',
      ...getScoreColor(data.seoScore || 0),
    },
    {
      label: 'GEO Score',
      value: data.geoScore != null ? `${data.geoScore}` : '--',
      ...getScoreColor(data.geoScore || 0),
    },
    {
      label: 'Performance',
      value: data.performanceScore != null ? `${data.performanceScore}` : '--',
      ...getScoreColor(data.performanceScore || 0),
    },
    {
      label: 'Issues Found',
      value: data.issuesFound != null ? `${data.issuesFound}` : '--',
      color: data.issuesFound && data.issuesFound > 10 ? 'text-red-400' : 'text-green-400',
      bgColor: data.issuesFound && data.issuesFound > 10 ? 'bg-red-500/10' : 'bg-green-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="hover:border-white/20 transition-colors">
          <CardContent className="p-4">
            <p className="text-xs text-white/50 [.light_&]:text-slate-500 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
