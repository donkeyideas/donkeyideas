'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface CWVData {
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

interface CoreWebVitalsCardProps {
  mobile?: CWVData;
  desktop?: CWVData;
}

const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000, unit: 'ms', label: 'Largest Contentful Paint' },
  fid: { good: 100, poor: 300, unit: 'ms', label: 'First Input Delay' },
  cls: { good: 0.1, poor: 0.25, unit: '', label: 'Cumulative Layout Shift' },
  fcp: { good: 1800, poor: 3000, unit: 'ms', label: 'First Contentful Paint' },
  ttfb: { good: 800, poor: 1800, unit: 'ms', label: 'Time to First Byte' },
} as const;

function getRating(metric: keyof typeof THRESHOLDS, value: number): 'good' | 'needs-improvement' | 'poor' {
  const t = THRESHOLDS[metric];
  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

function getRatingStyle(rating: string): { text: string; bg: string; label: string } {
  switch (rating) {
    case 'good': return { text: 'text-green-400', bg: 'bg-green-500/20', label: 'Good' };
    case 'needs-improvement': return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Needs Improvement' };
    default: return { text: 'text-red-400', bg: 'bg-red-500/20', label: 'Poor' };
  }
}

function formatValue(metric: keyof typeof THRESHOLDS, value: number): string {
  if (metric === 'cls') return value.toFixed(3);
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

export function CoreWebVitalsCard({ mobile, desktop }: CoreWebVitalsCardProps) {
  const [activeDevice, setActiveDevice] = useState<'mobile' | 'desktop'>('mobile');
  const data = activeDevice === 'mobile' ? mobile : desktop;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Core Web Vitals</CardTitle>
          <div className="flex gap-1 bg-white/5 [.light_&]:bg-slate-100 rounded-lg p-1">
            {(['mobile', 'desktop'] as const).map((device) => (
              <button
                key={device}
                onClick={() => setActiveDevice(device)}
                className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                  activeDevice === device
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-white/50 [.light_&]:text-slate-500 hover:text-white/80 [.light_&]:hover:text-slate-700'
                }`}
              >
                {device}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data ? (
          <div className="space-y-4">
            {(Object.keys(THRESHOLDS) as (keyof typeof THRESHOLDS)[]).map((metric) => {
              const value = data[metric];
              const rating = getRating(metric, value);
              const style = getRatingStyle(rating);
              const threshold = THRESHOLDS[metric];
              const percentage = Math.min(100, (value / threshold.poor) * 100);

              return (
                <div key={metric}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white/70 [.light_&]:text-slate-600">{threshold.label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono font-bold ${style.text}`}>{formatValue(metric, value)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${style.bg} ${style.text}`}>{style.label}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 [.light_&]:bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        rating === 'good' ? 'bg-green-500' : rating === 'needs-improvement' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center py-8 text-white/40 [.light_&]:text-slate-400">
            No {activeDevice} data available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
