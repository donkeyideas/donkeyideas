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
