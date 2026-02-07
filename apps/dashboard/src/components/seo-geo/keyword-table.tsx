'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface Keyword {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  positionChange?: number | null;
}

type SortKey = 'keyword' | 'clicks' | 'impressions' | 'ctr' | 'position';

export function KeywordTable({ keywords, title = 'Keyword Rankings' }: { keywords: Keyword[]; title?: string }) {
  const [sortKey, setSortKey] = useState<SortKey>('clicks');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...keywords].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ active, asc }: { active: boolean; asc: boolean }) => (
    <span className={`ml-1 inline-block ${active ? 'text-blue-400' : 'text-white/20 [.light_&]:text-slate-300'}`}>
      {active ? (asc ? '\u2191' : '\u2193') : '\u2195'}
    </span>
  );

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
                <th className="text-left py-3 px-2 text-white/50 [.light_&]:text-slate-500 font-medium">#</th>
                {([
                  ['keyword', 'Keyword'],
                  ['clicks', 'Clicks'],
                  ['impressions', 'Impressions'],
                  ['ctr', 'CTR'],
                  ['position', 'Position'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    className="text-left py-3 px-2 text-white/50 [.light_&]:text-slate-500 font-medium cursor-pointer hover:text-white/80 [.light_&]:hover:text-slate-700"
                    onClick={() => handleSort(key)}
                  >
                    {label}
                    <SortIcon active={sortKey === key} asc={sortAsc} />
                  </th>
                ))}
                <th className="text-left py-3 px-2 text-white/50 [.light_&]:text-slate-500 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((kw, idx) => (
                <tr key={kw.keyword} className="border-b border-white/5 [.light_&]:border-slate-100 hover:bg-white/5 [.light_&]:hover:bg-slate-50">
                  <td className="py-2 px-2 text-white/40 [.light_&]:text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-2 text-white/90 [.light_&]:text-slate-800 font-medium max-w-xs truncate">{kw.keyword}</td>
                  <td className="py-2 px-2 text-blue-400">{kw.clicks}</td>
                  <td className="py-2 px-2 text-white/70 [.light_&]:text-slate-600">{kw.impressions.toLocaleString()}</td>
                  <td className="py-2 px-2 text-white/70 [.light_&]:text-slate-600">{kw.ctr}%</td>
                  <td className="py-2 px-2 text-yellow-400">{kw.position.toFixed(1)}</td>
                  <td className="py-2 px-2">
                    {kw.positionChange != null ? (
                      <span className={kw.positionChange > 0 ? 'text-green-400' : kw.positionChange < 0 ? 'text-red-400' : 'text-white/40'}>
                        {kw.positionChange > 0 ? `\u2191 ${kw.positionChange.toFixed(1)}` : kw.positionChange < 0 ? `\u2193 ${Math.abs(kw.positionChange).toFixed(1)}` : '--'}
                      </span>
                    ) : (
                      <span className="text-white/20 [.light_&]:text-slate-300">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {keywords.length === 0 && (
            <p className="text-center py-8 text-white/40 [.light_&]:text-slate-400">No keyword data available</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
