'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface CompanyData {
  id: string;
  name: string;
  logo?: string | null;
  users: number;
  sessions: number;
  pageviews: number;
  bounceRate: number;
  share: number;
}

interface GACompanyTableProps {
  data: CompanyData[];
  title?: string;
}

export function GACompanyTable({ data, title = 'Company Breakdown' }: GACompanyTableProps) {
  const maxSessions = Math.max(...data.map((c) => c.sessions));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 [.light_&]:border-slate-200">
                <th className="text-left text-xs text-white/50 [.light_&]:text-slate-500 uppercase tracking-wider py-3 px-2">
                  Company
                </th>
                <th className="text-right text-xs text-white/50 [.light_&]:text-slate-500 uppercase tracking-wider py-3 px-2">
                  Users
                </th>
                <th className="text-right text-xs text-white/50 [.light_&]:text-slate-500 uppercase tracking-wider py-3 px-2">
                  Sessions
                </th>
                <th className="text-right text-xs text-white/50 [.light_&]:text-slate-500 uppercase tracking-wider py-3 px-2">
                  Pageviews
                </th>
                <th className="text-right text-xs text-white/50 [.light_&]:text-slate-500 uppercase tracking-wider py-3 px-2">
                  Bounce Rate
                </th>
                <th className="text-right text-xs text-white/50 [.light_&]:text-slate-500 uppercase tracking-wider py-3 px-2">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((company, index) => (
                <tr
                  key={company.id}
                  className="border-b border-white/5 [.light_&]:border-slate-100 hover:bg-white/5 [.light_&]:hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/30 [.light_&]:text-slate-400 w-4">
                        {index + 1}
                      </span>
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.name}
                          className="w-8 h-8 rounded-lg object-contain bg-white/5 p-1"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <span className="text-blue-400 text-sm font-bold">
                            {company.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-white [.light_&]:text-slate-900">
                        {company.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-sm text-white/80 [.light_&]:text-slate-700">
                      {company.users.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium text-white [.light_&]:text-slate-900">
                        {company.sessions.toLocaleString()}
                      </span>
                      <div className="w-20 mt-1 h-1.5 bg-white/5 [.light_&]:bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${(company.sessions / maxSessions) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-sm text-white/80 [.light_&]:text-slate-700">
                      {company.pageviews.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span
                      className={`text-sm ${
                        company.bounceRate > 50
                          ? 'text-red-400'
                          : company.bounceRate > 35
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }`}
                    >
                      {company.bounceRate}%
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10">
                      <span className="text-sm font-medium text-blue-400">{company.share}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
