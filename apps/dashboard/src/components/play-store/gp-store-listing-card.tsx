'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface StoreListing {
  visitors: number;
  acquisitions: number;
  conversionRate: number;
}

interface GPStoreListingCardProps {
  data: StoreListing;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function GPStoreListingCard({ data }: GPStoreListingCardProps) {
  const hasData = data.visitors > 0 || data.acquisitions > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Store Listing Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-white/40 [.light_&]:text-slate-400 text-sm">
            No store listing data available. Configure GCS bucket to enable.
          </div>
        </CardContent>
      </Card>
    );
  }

  const conversionColor = data.conversionRate >= 30
    ? 'text-green-400'
    : data.conversionRate >= 15
    ? 'text-yellow-400'
    : 'text-red-400';

  const conversionBarColor = data.conversionRate >= 30
    ? 'bg-green-500'
    : data.conversionRate >= 15
    ? 'bg-yellow-500'
    : 'bg-red-500';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <CardTitle>Store Listing Performance</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {/* Funnel visualization */}
        <div className="space-y-4">
          {/* Visitors */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-white/60 [.light_&]:text-slate-500">Store Listing Visitors</span>
              <span className="text-lg font-bold text-blue-400">{formatNumber(data.visitors)}</span>
            </div>
            <div className="w-full bg-white/5 [.light_&]:bg-slate-100 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full w-full" />
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <svg className="w-4 h-4 text-white/20 [.light_&]:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          {/* Acquisitions */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-white/60 [.light_&]:text-slate-500">Acquisitions (Installs)</span>
              <span className="text-lg font-bold text-green-400">{formatNumber(data.acquisitions)}</span>
            </div>
            <div className="w-full bg-white/5 [.light_&]:bg-slate-100 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${Math.min(100, data.conversionRate)}%` }}
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <svg className="w-4 h-4 text-white/20 [.light_&]:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white/5 [.light_&]:bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-xs text-white/50 [.light_&]:text-slate-500 mb-1">Conversion Rate</p>
            <p className={`text-3xl font-bold ${conversionColor}`}>
              {data.conversionRate.toFixed(1)}%
            </p>
            <div className="mt-2 w-full bg-white/10 [.light_&]:bg-slate-200 rounded-full h-1.5">
              <div
                className={`${conversionBarColor} h-1.5 rounded-full transition-all`}
                style={{ width: `${Math.min(100, data.conversionRate)}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
