'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface PageData {
  page: string;
  title: string;
  pageviews: number;
  avgTimeOnPage: number;
}

interface GATopPagesProps {
  data: PageData[];
  title?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

export function GATopPages({ data, title = 'Top Pages' }: GATopPagesProps) {
  const maxPageviews = Math.max(...data.map((p) => p.pageviews));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 text-xs text-white/50 [.light_&]:text-slate-500 uppercase tracking-wider pb-2 border-b border-white/10 [.light_&]:border-slate-200">
            <div className="col-span-6">Page</div>
            <div className="col-span-3 text-right">Pageviews</div>
            <div className="col-span-3 text-right">Avg. Time</div>
          </div>

          {/* Rows */}
          {data.map((page, index) => (
            <div key={page.page} className="grid grid-cols-12 gap-4 items-center group">
              <div className="col-span-6">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/30 [.light_&]:text-slate-400 w-4">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white [.light_&]:text-slate-900 truncate group-hover:text-blue-400 transition-colors">
                      {page.title}
                    </p>
                    <p className="text-xs text-white/40 [.light_&]:text-slate-500 truncate">
                      {page.page}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-span-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-white [.light_&]:text-slate-900">
                    {page.pageviews.toLocaleString()}
                  </span>
                  <div className="w-full mt-1 h-1.5 bg-white/5 [.light_&]:bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{
                        width: `${(page.pageviews / maxPageviews) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="col-span-3 text-right">
                <span className="text-sm text-white/70 [.light_&]:text-slate-600">
                  {formatDuration(page.avgTimeOnPage)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
