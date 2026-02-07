'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface PageData {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export function TopPagesTable({ pages, title = 'Top Pages' }: { pages: PageData[]; title?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 [.light_&]:border-slate-200">
                <th className="text-left py-3 px-2 text-white/50 [.light_&]:text-slate-500 font-medium">Page</th>
                <th className="text-left py-3 px-2 text-white/50 [.light_&]:text-slate-500 font-medium">Clicks</th>
                <th className="text-left py-3 px-2 text-white/50 [.light_&]:text-slate-500 font-medium">Impressions</th>
                <th className="text-left py-3 px-2 text-white/50 [.light_&]:text-slate-500 font-medium">CTR</th>
                <th className="text-left py-3 px-2 text-white/50 [.light_&]:text-slate-500 font-medium">Position</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const displayUrl = page.page.replace(/^https?:\/\/[^/]+/, '') || '/';
                return (
                  <tr key={page.page} className="border-b border-white/5 [.light_&]:border-slate-100 hover:bg-white/5 [.light_&]:hover:bg-slate-50">
                    <td className="py-2 px-2 text-blue-400 max-w-xs truncate" title={page.page}>{displayUrl}</td>
                    <td className="py-2 px-2 text-white/90 [.light_&]:text-slate-800">{page.clicks}</td>
                    <td className="py-2 px-2 text-white/70 [.light_&]:text-slate-600">{page.impressions.toLocaleString()}</td>
                    <td className="py-2 px-2 text-white/70 [.light_&]:text-slate-600">{page.ctr}%</td>
                    <td className="py-2 px-2 text-yellow-400">{page.position.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {pages.length === 0 && (
            <p className="text-center py-8 text-white/40 [.light_&]:text-slate-400">No page data available</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
