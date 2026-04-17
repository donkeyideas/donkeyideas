'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@donkey-ideas/ui';

interface CompanyPlayData {
  id: string;
  name: string;
  logo: string | null;
  packageName: string;
  crashRate: number;
  anrRate: number;
  activeDevices: number;
  rating: number;
  reviews: number;
  totalInstalls?: number;
  dailyInstalls?: number;
  dailyUninstalls?: number;
  storeVisitors?: number;
  storeAcquisitions?: number;
  conversionRate?: number;
  share: number;
  store?: 'google' | 'apple';
}

interface GPCompanyTableProps {
  data: CompanyPlayData[];
  title?: string;
}

const THRESHOLDS = {
  crashRate: 1.09,
  anrRate: 0.47,
};

function getRateColor(value: number, threshold: number): string {
  if (value <= threshold * 0.5) return 'text-green-400';
  if (value <= threshold) return 'text-yellow-400';
  return 'text-red-400';
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function GPCompanyTable({ data, title = 'Company Breakdown' }: GPCompanyTableProps) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-white/40 [.light_&]:text-slate-400 py-8 text-sm">
            No connected companies with data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 [.light_&]:border-slate-200">
                <th className="text-left py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">App</th>
                <th className="text-right py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">Installs</th>
                <th className="text-right py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">Daily +/-</th>
                <th className="text-right py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">Devices</th>
                <th className="text-right py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">Visitors</th>
                <th className="text-right py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">Conv.</th>
                <th className="text-right py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">Crash</th>
                <th className="text-right py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">ANR</th>
                <th className="text-right py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">Rating</th>
                <th className="text-right py-2 px-2 text-xs text-white/40 [.light_&]:text-slate-500 font-medium">Reviews</th>
              </tr>
            </thead>
            <tbody>
              {data.map((company) => {
                const netDaily = (company.dailyInstalls || 0) - (company.dailyUninstalls || 0);
                const netColor = netDaily > 0 ? 'text-green-400' : netDaily < 0 ? 'text-red-400' : 'text-white/40';

                return (
                  <tr
                    key={company.id}
                    className="border-b border-white/5 [.light_&]:border-slate-100 hover:bg-white/5 [.light_&]:hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {company.logo ? (
                          <img src={company.logo} alt="" className="w-6 h-6 rounded" />
                        ) : (
                          <div className="w-6 h-6 bg-blue-500/20 rounded flex items-center justify-center text-[10px] text-blue-400 font-bold">
                            {company.name.charAt(0)}
                          </div>
                        )}
                        {company.store && (
                          <span className="flex-shrink-0" title={company.store === 'google' ? 'Google Play' : 'App Store'}>
                            {company.store === 'google' ? (
                              <svg className="w-3.5 h-3.5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-1.4l2.651 1.535a1 1 0 010 1.732l-2.651 1.535-2.534-2.534 2.534-2.268zM5.864 3.458L16.8 9.79l-2.302 2.302-8.635-8.635z" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-white/60 [.light_&]:text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                              </svg>
                            )}
                          </span>
                        )}
                        <span className="text-white/80 [.light_&]:text-slate-700 font-medium">
                          {company.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right text-blue-400 font-medium">
                      {formatNumber(company.totalInstalls || 0)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-green-400 text-xs">+{formatNumber(company.dailyInstalls || 0)}</span>
                        <span className="text-red-400 text-xs">-{formatNumber(company.dailyUninstalls || 0)}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right text-cyan-400">
                      {formatNumber(company.activeDevices)}
                    </td>
                    <td className="py-2 px-2 text-right text-white/60 [.light_&]:text-slate-600">
                      {formatNumber(company.storeVisitors || 0)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className={`font-medium ${
                        (company.conversionRate || 0) >= 30 ? 'text-green-400' :
                        (company.conversionRate || 0) >= 15 ? 'text-yellow-400' :
                        'text-white/40 [.light_&]:text-slate-400'
                      }`}>
                        {(company.conversionRate || 0) > 0 ? `${(company.conversionRate || 0).toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className={`font-medium ${getRateColor(company.crashRate, THRESHOLDS.crashRate)}`}>
                        {company.crashRate.toFixed(3)}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className={`font-medium ${getRateColor(company.anrRate, THRESHOLDS.anrRate)}`}>
                        {company.anrRate.toFixed(3)}%
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span className="text-white/70 [.light_&]:text-slate-700">
                          {company.rating > 0 ? company.rating.toFixed(1) : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right text-white/50 [.light_&]:text-slate-500">
                      {company.reviews}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
